// src/app/actions/rental.ts
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

  if (isNaN(equipmentId) || equipmentId < 1) {
    return { success: false, error: '기자재 정보가 올바르지 않습니다.' }
  }
  if (isNaN(quantity)) {
    return { success: false, error: '수량이 올바르지 않습니다.' }
  }
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

  try {
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
  } catch (error) {
    console.error('createRentalRequest error:', error)
    return { success: false, error: '신청 처리 중 오류가 발생했습니다. 다시 시도해주세요.' }
  }
}

export type CreateBatchResult =
  | { success: true; groupNumber: string; requestNumbers: string[] }
  | { success: false; error: string }

export async function createBatchRentalRequest(formData: FormData): Promise<CreateBatchResult> {
  const startAt = new Date(formData.get('startAt') as string)
  const endAt = new Date(formData.get('endAt') as string)
  const applicantName = (formData.get('applicantName') as string).trim()
  const studentId = (formData.get('studentId') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const password = formData.get('password') as string
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

  let items: { equipmentId: number; quantity: number }[]
  try {
    items = JSON.parse(formData.get('items') as string)
  } catch {
    return { success: false, error: '기자재 정보가 올바르지 않습니다.' }
  }
  if (!items.length) return { success: false, error: '선택한 기자재가 없습니다.' }

  try {
    for (const item of items) {
      const available = await checkAvailability(item.equipmentId, item.quantity, startAt, endAt, prisma)
      if (!available) {
        const eq = await prisma.equipment.findUnique({ where: { id: item.equipmentId }, select: { name: true } })
        return { success: false, error: `'${eq?.name ?? item.equipmentId}': 선택한 기간에 해당 수량을 대여할 수 없습니다.` }
      }
    }

    const passwordHash = await hashPassword(password)
    const now = new Date()
    const requestNumbers: string[] = []
    let groupNumber: string | null = null

    for (const item of items) {
      const req = await prisma.rentalRequest.create({
        data: {
          requestNumber: `TEMP-${Date.now()}-${item.equipmentId}`,
          groupNumber: null,
          passwordHash,
          applicantName,
          studentId,
          phone,
          equipmentId: item.equipmentId,
          quantity: item.quantity,
          startAt,
          endAt,
          purpose,
        },
      })
      const rn = generateRequestNumber(now, req.id)
      if (!groupNumber) groupNumber = rn
      requestNumbers.push(rn)
      await prisma.rentalRequest.update({
        where: { id: req.id },
        data: { requestNumber: rn, groupNumber },
      })
    }

    return { success: true, groupNumber: groupNumber!, requestNumbers }
  } catch (error) {
    console.error('createBatchRentalRequest error:', error)
    return { success: false, error: '신청 처리 중 오류가 발생했습니다.' }
  }
}

export type LookupResult =
  | {
      success: true
      data: {
        requestNumber: string
        groupNumber: string | null
        status: string
        equipmentName: string
        quantity: number
        startAt: Date
        endAt: Date
        adminNote: string | null
        createdAt: Date
      }
      groupItems?: {
        requestNumber: string
        status: string
        equipmentName: string
        quantity: number
        adminNote: string | null
      }[]
    }
  | { success: false; error: string; remainingAttempts?: number }

export async function lookupRequest(formData: FormData): Promise<LookupResult> {
  const requestNumber = (formData.get('requestNumber') as string).trim().toUpperCase()
  const password = formData.get('password') as string

  if (!requestNumber || !password) {
    return { success: false, error: '신청 번호와 비밀번호를 입력해주세요.' }
  }

  try {
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

    let groupItems = undefined
    if (request.groupNumber) {
      const siblings = await prisma.rentalRequest.findMany({
        where: { groupNumber: request.groupNumber },
        include: { equipment: { select: { name: true } } },
        orderBy: { id: 'asc' },
      })
      groupItems = siblings.map(s => ({
        requestNumber: s.requestNumber,
        status: s.status,
        equipmentName: s.equipment.name,
        quantity: s.quantity,
        adminNote: s.adminNote,
      }))
    }

    return {
      success: true,
      data: {
        requestNumber: request.requestNumber,
        groupNumber: request.groupNumber,
        status: request.status,
        equipmentName: request.equipment.name,
        quantity: request.quantity,
        startAt: request.startAt,
        endAt: request.endAt,
        adminNote: request.adminNote,
        createdAt: request.createdAt,
      },
      groupItems,
    }
  } catch (error) {
    console.error('lookupRequest error:', error)
    return { success: false, error: '조회 중 오류가 발생했습니다. 다시 시도해주세요.' }
  }
}
