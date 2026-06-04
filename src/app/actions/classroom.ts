'use server'

import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/password'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { addWeekdays } from '@/lib/dateUtils'

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function generateClassroomNumber(date: Date, id: number): string {
  return `CLS-${format(date, 'yyyyMMdd')}-${String(id).padStart(4, '0')}`
}

// ── 신청 생성 (공개) ──────────────────────────────────────────────────────────

export type ClassroomRequestResult =
  | { success: true; requestNumber: string }
  | { success: false; error: string }

export async function createClassroomRequest(
  formData: FormData
): Promise<ClassroomRequestResult> {
  const applicantName = (formData.get('applicantName') as string ?? '').trim()
  const studentId     = (formData.get('studentId') as string ?? '').trim()
  const phone         = (formData.get('phone') as string ?? '').trim()
  const isGroup       = formData.get('isGroup') === 'true'
  const groupCount    = isGroup ? parseInt(formData.get('groupCount') as string) : null
  const groupMembers  = isGroup ? (formData.get('groupMembers') as string ?? '').trim() : null
  const startAt       = new Date(formData.get('startAt') as string)
  const endAt         = new Date(formData.get('endAt') as string)
  const purpose       = (formData.get('purpose') as string ?? '').trim()
  const monitorAssets = (formData.get('monitorAssets') as string ?? '').trim()
  const password      = (formData.get('password') as string ?? '')

  if (!applicantName || !studentId || !phone || !password || !purpose || !monitorAssets) {
    return { success: false, error: '필수 항목을 모두 입력해주세요.' }
  }
  if (password.length < 4 || password.length > 8) {
    return { success: false, error: '비밀번호는 4~8자리여야 합니다.' }
  }
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || startAt >= endAt) {
    return { success: false, error: '대여 기간이 올바르지 않습니다.' }
  }
  if (isGroup && (!groupCount || isNaN(groupCount) || groupCount < 2)) {
    return { success: false, error: '조별 사용 시 총원(2명 이상)과 조원 이름을 입력해주세요.' }
  }
  if (isGroup && !groupMembers) {
    return { success: false, error: '조원 이름을 입력해주세요.' }
  }

  // 평일 2일 전 신청 제한
  const minStart = addWeekdays(new Date(), 2)
  minStart.setHours(0, 0, 0, 0)
  if (startAt < minStart) {
    return { success: false, error: '대여 신청은 사용일 기준 최소 평일 2일 전에 해야 합니다 (주말 제외).' }
  }

  try {
    const passwordHash = await hashPassword(password)
    const req = await prisma.classroomRequest.create({
      data: {
        requestNumber: `TEMP-CLS-${Date.now()}`,
        passwordHash,
        applicantName,
        studentId,
        phone,
        isGroup,
        groupCount: groupCount ?? null,
        groupMembers: groupMembers ?? null,
        startAt,
        endAt,
        purpose,
        monitorAssets,
      },
    })
    const requestNumber = generateClassroomNumber(new Date(), req.id)
    await prisma.classroomRequest.update({
      where: { id: req.id },
      data: { requestNumber },
    })
    return { success: true, requestNumber }
  } catch (err) {
    console.error('createClassroomRequest error:', err)
    return { success: false, error: '신청 처리 중 오류가 발생했습니다. 다시 시도해주세요.' }
  }
}

// ── 관리자 액션 ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
}

export async function approveClassroomRequest(id: number, note?: string) {
  await requireAdmin()
  await prisma.classroomRequest.update({
    where: { id, status: 'pending' },
    data: { status: 'approved', adminNote: note || null },
  })
  revalidatePath('/admin/classroom')
}

export async function rejectClassroomRequest(id: number, note: string) {
  await requireAdmin()
  await prisma.classroomRequest.update({
    where: { id, status: 'pending' },
    data: { status: 'rejected', adminNote: note },
  })
  revalidatePath('/admin/classroom')
}

// ── 신청 조회 (공개) ──────────────────────────────────────────────────────────

export type ClassroomLookupResult =
  | {
      success: true
      data: {
        requestNumber: string
        applicantName: string
        startAt: Date
        endAt: Date
        purpose: string
        isGroup: boolean
        groupCount: number | null
        groupMembers: string | null
        monitorAssets: string
        status: string
        adminNote: string | null
        createdAt: Date
      }
    }
  | { success: false; error: string }

export async function lookupClassroomRequest(
  formData: FormData
): Promise<ClassroomLookupResult> {
  const requestNumber = (formData.get('requestNumber') as string ?? '').trim().toUpperCase()
  const password = formData.get('password') as string

  if (!requestNumber || !password) {
    return { success: false, error: '신청 번호와 비밀번호를 입력해주세요.' }
  }

  const req = await prisma.classroomRequest.findUnique({ where: { requestNumber } })
  if (!req) return { success: false, error: '신청 내역을 찾을 수 없습니다.' }

  const valid = await verifyPassword(password, req.passwordHash)
  if (!valid) return { success: false, error: '비밀번호가 올바르지 않습니다.' }

  return {
    success: true,
    data: {
      requestNumber: req.requestNumber,
      applicantName: req.applicantName,
      startAt: req.startAt,
      endAt: req.endAt,
      purpose: req.purpose,
      isGroup: req.isGroup,
      groupCount: req.groupCount,
      groupMembers: req.groupMembers,
      monitorAssets: req.monitorAssets,
      status: req.status,
      adminNote: req.adminNote,
      createdAt: req.createdAt,
    },
  }
}
