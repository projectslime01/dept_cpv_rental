// src/app/actions/rental.ts
'use server'

import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/password'
import {
  checkAvailability,
  generateRequestNumber,
  isSubmissionTimeValid,
  isValidStartDate,
  countWeekdaysInRange,
  includesWeekend,
  isValidWeekendRental,
  getEarliestAllowedStartDate,
} from '@/lib/rental'
import { checkRateLimit, recordFailedAttempt, resetAttempts } from '@/lib/rate-limit'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

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

  // 대여 신청 및 기간 규칙 유효성 검증
  const now = new Date()
  if (!isSubmissionTimeValid(now)) {
    return {
      success: false,
      error: '대여 신청은 평일 09:00 ~ 17:00에만 가능합니다. (주말 및 공휴일 신청 불가)',
    }
  }

  if (!isValidStartDate(startAt, now)) {
    const earliestAllowed = getEarliestAllowedStartDate(now)
    const earliestStr = format(earliestAllowed, 'yyyy년 MM월 dd일', { locale: ko })
    return {
      success: false,
      error: `대여 신청은 평일 기준 최소 2일 전까지 가능합니다. (가장 빠른 대여 시작일: ${earliestStr})`,
    }
  }

  const hasDepartmentApproval =
    formData.get('hasDepartmentApproval') === 'true' ||
    formData.get('hasDepartmentApproval') === 'on'
  const weekdayCount = countWeekdaysInRange(startAt, endAt)
  const exceedsDuration = weekdayCount > 3
  const containsWeekend = includesWeekend(startAt, endAt)
  const violatesWeekendRule = containsWeekend && !isValidWeekendRental(startAt, endAt)

  if (exceedsDuration || violatesWeekendRule) {
    if (!hasDepartmentApproval) {
      if (exceedsDuration) {
        return {
          success: false,
          error: `대여 기간은 최대 평일 기준 3일 이내여야 합니다. (선택: ${weekdayCount}일). 대여 기간을 초과할 경우 학과장님 사전 승인을 득하고 승인 여부를 체크하셔야 대여 신청이 가능합니다.`,
        }
      } else {
        return {
          success: false,
          error: '주말이 포함된 대여는 반드시 "금요일 반출, 월요일 반납" 수칙을 준수해야 합니다. 미준수 시 학과장님 사전 승인을 득하고 승인 여부를 체크하셔야 대여 신청이 가능합니다.',
        }
      }
    }
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

  // 대여 신청 및 기간 규칙 유효성 검증
  const now = new Date()
  if (!isSubmissionTimeValid(now)) {
    return {
      success: false,
      error: '대여 신청은 평일 09:00 ~ 17:00에만 가능합니다. (주말 및 공휴일 신청 불가)',
    }
  }

  if (!isValidStartDate(startAt, now)) {
    const earliestAllowed = getEarliestAllowedStartDate(now)
    const earliestStr = format(earliestAllowed, 'yyyy년 MM월 dd일', { locale: ko })
    return {
      success: false,
      error: `대여 신청은 평일 기준 최소 2일 전까지 가능합니다. (가장 빠른 대여 시작일: ${earliestStr})`,
    }
  }

  const hasDepartmentApproval =
    formData.get('hasDepartmentApproval') === 'true' ||
    formData.get('hasDepartmentApproval') === 'on'
  const weekdayCount = countWeekdaysInRange(startAt, endAt)
  const exceedsDuration = weekdayCount > 3
  const containsWeekend = includesWeekend(startAt, endAt)
  const violatesWeekendRule = containsWeekend && !isValidWeekendRental(startAt, endAt)

  if (exceedsDuration || violatesWeekendRule) {
    if (!hasDepartmentApproval) {
      if (exceedsDuration) {
        return {
          success: false,
          error: `대여 기간은 최대 평일 기준 3일 이내여야 합니다. (선택: ${weekdayCount}일). 대여 기간을 초과할 경우 학과장님 사전 승인을 득하고 승인 여부를 체크하셔야 대여 신청이 가능합니다.`,
        }
      } else {
        return {
          success: false,
          error: '주말이 포함된 대여는 반드시 "금요일 반출, 월요일 반납" 수칙을 준수해야 합니다. 미준수 시 학과장님 사전 승인을 득하고 승인 여부를 체크하셔야 대여 신청이 가능합니다.',
        }
      }
    }
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

// ──────────────────────────────────────────────────────────────────────────────
// Cart availability check (batch — 2 queries regardless of cart size)
// ──────────────────────────────────────────────────────────────────────────────

export type CartAvailabilityItem = {
  equipmentId: number
  available: number
  totalQuantity: number
  requested: number
}

export async function checkCartAvailability(
  items: { equipmentId: number; quantity: number }[],
  startAt: string,
  endAt: string
): Promise<CartAvailabilityItem[]> {
  if (!items.length) return []

  const start = new Date(startAt)
  const end = new Date(endAt)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return []

  const ids = items.map(i => i.equipmentId)

  const [equipments, overlapping] = await Promise.all([
    prisma.equipment.findMany({
      where: { id: { in: ids } },
      select: { id: true, totalQuantity: true, status: true },
    }),
    prisma.rentalRequest.groupBy({
      by: ['equipmentId'],
      where: {
        equipmentId: { in: ids },
        status: 'approved',
        startAt: { lt: end },
        endAt: { gt: start },
      },
      _sum: { quantity: true },
    }),
  ])

  const usedMap: Record<number, number> = {}
  for (const r of overlapping) {
    usedMap[r.equipmentId] = r._sum.quantity ?? 0
  }

  const eqMap: Record<number, { totalQuantity: number; status: string }> = {}
  for (const eq of equipments) {
    eqMap[eq.id] = { totalQuantity: eq.totalQuantity, status: eq.status }
  }

  return items.map(item => {
    const eq = eqMap[item.equipmentId]
    if (!eq || eq.status !== 'active') {
      return { equipmentId: item.equipmentId, available: 0, totalQuantity: eq?.totalQuantity ?? 0, requested: item.quantity }
    }
    const used = usedMap[item.equipmentId] ?? 0
    const available = Math.max(0, eq.totalQuantity - used)
    return { equipmentId: item.equipmentId, available, totalQuantity: eq.totalQuantity, requested: item.quantity }
  })
}

// ──────────────────────────────────────────────────────────────────────────────

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
