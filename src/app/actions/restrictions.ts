'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { computeEndDate, RESTRICTION_REASONS } from '@/lib/restriction'

async function requireAdminId(): Promise<number> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error('Unauthorized')
  return parseInt(session.user.id)
}

export type RestrictionResult = { success: true } | { success: false; error: string }

const VALID_REASONS = RESTRICTION_REASONS.map((r) => r.value) as readonly string[]

export async function createRestriction(formData: FormData): Promise<RestrictionResult> {
  const adminId = await requireAdminId()

  const studentId = (formData.get('studentId') as string)?.trim()
  const studentName = (formData.get('studentName') as string | null)?.trim() || null
  const reason = (formData.get('reason') as string)?.trim()
  const detail = (formData.get('detail') as string | null)?.trim() || null
  const days = parseInt(formData.get('days') as string)

  if (!studentId) {
    return { success: false, error: '학번을 입력해주세요.' }
  }
  if (!reason || !VALID_REASONS.includes(reason)) {
    return { success: false, error: '제한 사유를 선택해주세요.' }
  }
  if (isNaN(days) || days < 1 || days > 365) {
    return { success: false, error: '제한 기간은 1~365일 사이여야 합니다.' }
  }

  await prisma.rentalRestriction.create({
    data: {
      studentId,
      studentName,
      reason,
      detail,
      endAt: computeEndDate(days),
      createdBy: adminId,
    },
  })

  revalidatePath('/admin/restrictions')
  revalidatePath('/admin/dashboard')
  return { success: true }
}

/** 제한 즉시 해제 (releasedAt 기록) */
export async function releaseRestriction(id: number): Promise<RestrictionResult> {
  await requireAdminId()
  const existing = await prisma.rentalRestriction.findUnique({
    where: { id },
    select: { releasedAt: true },
  })
  if (!existing) {
    return { success: false, error: '해당 제한 내역을 찾을 수 없습니다.' }
  }
  if (existing.releasedAt) {
    return { success: false, error: '이미 해제된 제한입니다.' }
  }
  await prisma.rentalRestriction.update({
    where: { id },
    data: { releasedAt: new Date() },
  })
  revalidatePath('/admin/restrictions')
  revalidatePath('/admin/dashboard')
  return { success: true }
}

/** 제한 기록 영구 삭제 */
export async function deleteRestriction(id: number): Promise<RestrictionResult> {
  await requireAdminId()
  await prisma.rentalRestriction.delete({ where: { id } }).catch(() => null)
  revalidatePath('/admin/restrictions')
  revalidatePath('/admin/dashboard')
  return { success: true }
}
