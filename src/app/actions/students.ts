'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { normalizeStudentId, computeRosterDiff, type RosterRow, type ExistingStudent } from '@/lib/roster'
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

export interface RosterPreview {
  fileName: string
  totalRows: number
  skipped: number
  addedCount: number
  updatedCount: number
  unchangedCount: number
  deactivated: { studentId: string; name: string; grade: number }[]
  activeBefore: number
  bulkWarning: boolean
  /** 확정 단계로 넘길 파싱 결과 */
  rows: RosterRow[]
}

export type PreviewResult = { success: true; preview: RosterPreview } | { success: false; error: string }

async function loadExisting(): Promise<ExistingStudent[]> {
  return prisma.student.findMany({
    select: { studentId: true, name: true, grade: true, className: true, status: true },
  })
}

/** 1단계: 파일을 파싱해 변경분만 계산한다. DB는 변경하지 않는다. */
export async function previewRosterUpload(formData: FormData): Promise<PreviewResult> {
  await requireAdminId()

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { success: false, error: '파일을 선택해 주세요.' }

  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = await parseRosterBuffer(buffer, file.name)
  if (!parsed.ok) return { success: false, error: parsed.error }

  const existing = await loadExisting()
  const diff = computeRosterDiff(parsed.rows, existing)
  const activeBefore = existing.filter((s) => s.status === 'active').length
  const bulkWarning =
    activeBefore > 0 && diff.deactivated.length / activeBefore > BULK_DEACTIVATION_THRESHOLD

  return {
    success: true,
    preview: {
      fileName: file.name,
      totalRows: parsed.rows.length,
      skipped: parsed.skipped,
      addedCount: diff.added.length,
      updatedCount: diff.updated.length,
      unchangedCount: diff.unchanged,
      deactivated: diff.deactivated.map((s) => ({ studentId: s.studentId, name: s.name, grade: s.grade })),
      activeBefore,
      bulkWarning,
      rows: parsed.rows,
    },
  }
}

export type CommitResult =
  | { success: true; added: number; updated: number; deactivated: number }
  | { success: false; error: string }

/** 2단계: 미리보기에서 확인한 rows를 실제로 반영한다(전체 교체). */
export async function commitRosterUpload(fileName: string, rows: RosterRow[]): Promise<CommitResult> {
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
          status: 'active',
          source: 'upload',
        },
        update: { name: r.name, grade: r.grade, className: r.className, status: 'active' },
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
        fileName,
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

  if (!studentId) return { success: false, error: '학번을 입력해 주세요.' }
  if (!name) return { success: false, error: '이름을 입력해 주세요.' }
  if (![1, 2, 3].includes(grade)) return { success: false, error: '학년을 선택해 주세요.' }

  await prisma.student.upsert({
    where: { studentId },
    create: { studentId, name, grade, className, status: 'active', source: 'manual' },
    update: { name, grade, className, status: 'active', source: 'manual' },
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
