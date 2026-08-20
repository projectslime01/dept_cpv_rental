'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { normalizeStudentId, normalizeMajor, computeRosterDiff, type RosterRow, type ExistingStudent } from '@/lib/roster'
import { parseRosterBuffer } from '@/lib/rosterParse'

/**
 * 비활성화 비율이 이 값을 넘으면 확정 전 재확인을 요구한다.
 * 'use server' 파일은 async 함수 외의 런타임 값을 export할 수 없으므로 로컬 상수로 둔다.
 */
const BULK_DEACTIVATION_THRESHOLD = 0.5

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

  const summaries: RosterFileSummary[] = []
  const merged = new Map<string, RosterRow>()
  let skipped = 0

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await parseRosterBuffer(buffer, file.name)
    if (!parsed.ok) return { success: false, error: parsed.error }

    summaries.push({
      fileName: file.name,
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

  await prisma.$transaction(async (tx) => {
    for (const r of [...diff.added, ...diff.updated]) {
      await tx.student.upsert({
        where: { studentId: r.studentId },
        create: {
          studentId: r.studentId,
          name: r.name,
          grade: r.grade,
          className: r.className,
          major: r.major,
          status: 'active',
          source: 'upload',
        },
        update: { name: r.name, grade: r.grade, className: r.className, major: r.major, status: 'active' },
      })
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
  })

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
