'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { normalizeStudentId, normalizeMajor, computeRosterDiff, type RosterRow, type ExistingStudent } from '@/lib/roster'
import { parseRosterBuffer } from '@/lib/rosterParse'

/**
 * 비활성화 비율이 이 값을 넘으면 확정 전 재확인을 요구한다.
 * 'use server' 파일은 async 함수 외의 런타임 값을 export할 수 없으므로 로컬 상수로 둔다.
 */
const BULK_DEACTIVATION_THRESHOLD = 0.5

/** 한 INSERT 문에 묶을 최대 행 수 (Postgres 파라미터 한도 대비 여유 있게) */
const UPSERT_CHUNK_SIZE = 500

async function requireAdminId(): Promise<number> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error('Unauthorized')
  return parseInt(session.user.id)
}

export interface RosterFileSummary {
  fileName: string
  rowCount: number
  skipped: number
  majors: string[]
}

export interface RosterPreview {
  /** 파일별 파싱 요약 (여러 전공 명부를 한 번에 올릴 수 있다) */
  files: RosterFileSummary[]
  totalRows: number
  skipped: number
  addedCount: number
  updatedCount: number
  unchangedCount: number
  deactivated: { studentId: string; name: string; grade: number; major: string | null }[]
  /** 이번 업로드가 교체를 책임지는 전공. 이 목록 밖 전공은 손대지 않는다. */
  scopeMajors: string[]
  /** 범위 밖이라 그대로 유지되는 활성 학생 수 */
  outOfScopeActive: number
  /** 교체 범위 안의 기존 활성 학생 수 (경고 비율 계산 기준) */
  activeInScopeBefore: number
  bulkWarning: boolean
  /** 확정 단계로 넘길 파싱 결과 */
  rows: RosterRow[]
}

export type PreviewResult = { success: true; preview: RosterPreview } | { success: false; error: string }

async function loadExisting(): Promise<ExistingStudent[]> {
  return prisma.student.findMany({
    select: { studentId: true, name: true, grade: true, className: true, major: true, status: true },
  })
}

/**
 * 1단계: 파일들을 파싱해 변경분만 계산한다. DB는 변경하지 않는다.
 *
 * 전공별로 명부가 나뉘어 있으면 파일 여러 개를 한 번에 올릴 수 있다.
 * 교체 범위는 업로드에 등장한 전공으로 한정되므로, 한 전공만 올려도
 * 다른 전공 학생은 그대로 유지된다.
 */
export async function previewRosterUpload(formData: FormData): Promise<PreviewResult> {
  await requireAdminId()

  const files = formData.getAll('file').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) return { success: false, error: '파일을 선택해 주세요.' }

  // 서버 액션의 multipart 파서가 한글 파일명을 깨뜨리므로(File.name이 Latin-1로
  // 잘못 디코딩됨) 클라이언트가 동봉한 이름을 우선 쓴다. 없으면 File.name으로
  // 물러서되 NFC로 정규화한다(macOS는 자모 분리 형태로 준다).
  const sentNames = formData.getAll('fileName').filter((v): v is string => typeof v === 'string')
  const displayName = (i: number) => (sentNames[i] ?? files[i].name).normalize('NFC')

  const summaries: RosterFileSummary[] = []
  const merged = new Map<string, RosterRow>()
  let skipped = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const name = displayName(i)
    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await parseRosterBuffer(buffer, name)
    if (!parsed.ok) return { success: false, error: parsed.error }

    summaries.push({
      fileName: name,
      rowCount: parsed.rows.length,
      skipped: parsed.skipped,
      majors: parsed.majors,
    })
    skipped += parsed.skipped
    // 파일 간 학번이 겹치면 나중 파일이 이긴다
    for (const row of parsed.rows) merged.set(row.studentId, row)
  }

  const rows = Array.from(merged.values())
  const existing = await loadExisting()
  const diff = computeRosterDiff(rows, existing)

  const scopeAll = diff.scopeMajors.length === 0
  const activeInScopeBefore = existing.filter(
    (s) => s.status === 'active' && (scopeAll || (s.major != null && diff.scopeMajors.includes(s.major))),
  ).length
  const bulkWarning =
    activeInScopeBefore > 0 &&
    diff.deactivated.length / activeInScopeBefore > BULK_DEACTIVATION_THRESHOLD

  return {
    success: true,
    preview: {
      files: summaries,
      totalRows: rows.length,
      skipped,
      addedCount: diff.added.length,
      updatedCount: diff.updated.length,
      unchangedCount: diff.unchanged,
      deactivated: diff.deactivated.map((s) => ({
        studentId: s.studentId, name: s.name, grade: s.grade, major: s.major,
      })),
      scopeMajors: diff.scopeMajors,
      outOfScopeActive: diff.outOfScopeActive,
      activeInScopeBefore,
      bulkWarning,
      rows,
    },
  }
}

export type CommitResult =
  | { success: true; added: number; updated: number; deactivated: number }
  | { success: false; error: string }

/**
 * 2단계: 미리보기에서 확인한 rows를 실제로 반영한다.
 * 비활성화는 업로드에 등장한 전공 범위 안에서만 일어난다.
 */
export async function commitRosterUpload(fileNames: string[], rows: RosterRow[]): Promise<CommitResult> {
  const adminId = await requireAdminId()
  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: false, error: '반영할 명단이 비어 있습니다.' }
  }

  const existing = await loadExisting()
  const diff = computeRosterDiff(rows, existing)

  const upserts = [...diff.added, ...diff.updated]

  await prisma.$transaction(async (tx) => {
    // 한 행씩 upsert하면 학생 수만큼 원격 DB를 왕복해 트랜잭션 제한 시간을 넘긴다
    // (210명 기준 약 5.6초). 여러 행을 한 문장으로 묶어 왕복 횟수를 줄인다.
    for (let i = 0; i < upserts.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = upserts.slice(i, i + UPSERT_CHUNK_SIZE)
      const values = chunk.map(
        (r) =>
          Prisma.sql`(${r.studentId}, ${r.name}, ${r.grade}, ${r.className}, ${r.major}, 'active', 'upload', NOW())`,
      )
      // source는 갱신 대상에서 제외한다. 관리자가 개별 추가한 학생('manual')이
      // 이후 명부에 포함되더라도 등록 경위를 남겨 두기 위함이다.
      await tx.$executeRaw`
        INSERT INTO "Student" ("studentId", "name", "grade", "className", "major", "status", "source", "updatedAt")
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("studentId") DO UPDATE SET
          "name" = EXCLUDED."name",
          "grade" = EXCLUDED."grade",
          "className" = EXCLUDED."className",
          "major" = EXCLUDED."major",
          "status" = 'active',
          "updatedAt" = NOW()
      `
    }
    if (diff.deactivated.length > 0) {
      await tx.student.updateMany({
        where: { studentId: { in: diff.deactivated.map((s) => s.studentId) } },
        data: { status: 'inactive' },
      })
    }
    await tx.studentRosterUpload.create({
      data: {
        fileName: fileNames.join(', ').slice(0, 500),
        totalRows: rows.length,
        added: diff.added.length,
        updated: diff.updated.length,
        deactivated: diff.deactivated.length,
        uploadedBy: adminId,
      },
    })
  }, { timeout: 30000 })

  revalidatePath('/admin/students')
  return {
    success: true,
    added: diff.added.length,
    updated: diff.updated.length,
    deactivated: diff.deactivated.length,
  }
}

export type StudentMutationResult = { success: true } | { success: false; error: string }

/** 편입·복학생 등 명단에 없는 학생을 관리자가 개별 추가한다. */
export async function addStudentManually(formData: FormData): Promise<StudentMutationResult> {
  await requireAdminId()

  const studentId = normalizeStudentId((formData.get('studentId') as string) ?? '')
  const name = ((formData.get('name') as string) ?? '').trim()
  const grade = parseInt((formData.get('grade') as string) ?? '')
  const className = ((formData.get('className') as string) ?? '').trim() || null
  const major = normalizeMajor((formData.get('major') as string) ?? '')

  if (!studentId) return { success: false, error: '학번을 입력해 주세요.' }
  if (!name) return { success: false, error: '이름을 입력해 주세요.' }
  if (![1, 2, 3].includes(grade)) return { success: false, error: '학년을 선택해 주세요.' }

  await prisma.student.upsert({
    where: { studentId },
    create: { studentId, name, grade, className, major, status: 'active', source: 'manual' },
    update: { name, grade, className, major, status: 'active', source: 'manual' },
  })

  revalidatePath('/admin/students')
  return { success: true }
}

/** 개별 학생을 활성/비활성 전환한다. */
export async function setStudentStatus(studentId: string, status: 'active' | 'inactive'): Promise<StudentMutationResult> {
  await requireAdminId()
  const exists = await prisma.student.findUnique({ where: { studentId }, select: { studentId: true } })
  if (!exists) return { success: false, error: '해당 학생을 찾을 수 없습니다.' }

  await prisma.student.update({ where: { studentId }, data: { status } })
  revalidatePath('/admin/students')
  return { success: true }
}
