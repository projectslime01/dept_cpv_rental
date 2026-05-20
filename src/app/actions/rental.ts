'use server'

import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/password'
import { checkAvailability, generateRequestNumber } from '@/lib/rental'
import { checkRateLimit, recordFailedAttempt, resetAttempts } from '@/lib/rate-limit'

export type CreateRequestResult =
  | { success: true; requestNumber: string }
  | { success: false; error: string }

export async function createRentalRequest(formData: FormData): Promise<CreateRequestResult> {
  const equipmentId = parseInt(formData.get('equipmentId') as string)
  const quantity = parseInt(formData.get('quantity') as string)
  const startAt = new Date(formData.get('startAt') as string)
  const endAt = new Date(formData.get('endAt') as string)
  const applicantName = (formData.get('applicantName') as string).trim()
  const studentId = (formData.get('studentId') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const password = (formData.get('password') as string)
  const purpose = (formData.get('purpose') as string | null)?.trim() || null

  if (!applicantName || !studentId || !phone || !password) {
    return { success: false, error: '필수 항목을 모두 입력해주세요.' }
  }
  if (password.length < 4 || password.length > 8) {
    return { success: false, error: '비밀번호는 4~8자리여야 합니다.' }
  }
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || startAt >= endAt) {
    return { success: false, error: '대여 기간이 올바르지 않습니다.' }
  }
  if (quantity < 1) {
    return { success: false, error: '수량은 1 이상이어야 합니다.' }
  }

  const available = await checkAvailability(equipmentId, quantity, startAt, endAt, prisma)
  if (!available) {
    return { success: false, error: '선택한 기간에 해당 수량을 대여할 수 없습니다.' }
  }

  const passwordHash = await hashPassword(password)

  const request = await prisma.rentalRequest.create({
    data: {
      requestNumber: `TEMP-${Date.now()}`,
      passwordHash,
      applicantName,
      studentId,
      phone,
      equipmentId,
      quantity,
      startAt,
      endAt,
      purpose,
    },
  })

  const requestNumber = generateRequestNumber(new Date(), request.id)
  await prisma.rentalRequest.update({
    where: { id: request.id },
    data: { requestNumber },
  })

  return { success: true, requestNumber }
}

export type LookupResult =
  | {
      success: true
      data: {
        requestNumber: string
        status: string
        equipmentName: string
        quantity: number
        startAt: Date
        endAt: Date
        adminNote: string | null
        createdAt: Date
      }
    }
  | { success: false; error: string; remainingAttempts?: number }

export async function lookupRequest(formData: FormData): Promise<LookupResult> {
  const requestNumber = (formData.get('requestNumber') as string).trim().toUpperCase()
  const password = formData.get('password') as string

  const rateLimitKey = `status:${requestNumber}`
  const { allowed, remainingAttempts } = await checkRateLimit(rateLimitKey, prisma)
  if (!allowed) {
    return { success: false, error: '시도 횟수 초과로 10분간 잠겼습니다.' }
  }

  const request = await prisma.rentalRequest.findUnique({
    where: { requestNumber },
    include: { equipment: { select: { name: true } } },
  })

  if (!request) {
    await recordFailedAttempt(rateLimitKey, prisma)
    return {
      success: false,
      error: '신청 내역을 찾을 수 없습니다.',
      remainingAttempts: remainingAttempts - 1,
    }
  }

  const valid = await verifyPassword(password, request.passwordHash)
  if (!valid) {
    await recordFailedAttempt(rateLimitKey, prisma)
    return {
      success: false,
      error: '비밀번호가 올바르지 않습니다.',
      remainingAttempts: remainingAttempts - 1,
    }
  }

  await resetAttempts(rateLimitKey, prisma)

  return {
    success: true,
    data: {
      requestNumber: request.requestNumber,
      status: request.status,
      equipmentName: request.equipment.name,
      quantity: request.quantity,
      startAt: request.startAt,
      endAt: request.endAt,
      adminNote: request.adminNote,
      createdAt: request.createdAt,
    },
  }
}
