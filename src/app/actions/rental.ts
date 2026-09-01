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
  getAvailableQuantity,
} from '@/lib/rental'
import { getAvailableAccessoryQuantity } from '@/lib/accessory'
import { eligibilityLabel } from '@/lib/eligibility'
import { toWallClockString } from '@/lib/rentalUtils'
import { checkRateLimit, recordFailedAttempt, resetAttempts } from '@/lib/rate-limit'
import { restrictionBlockMessage } from '@/lib/restriction'
import { getActiveRestriction } from '@/lib/restriction.server'
import { verifyStudent, verifyFailureMessage } from '@/lib/roster.server'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 부속 기자재 선택값을 검증·정규화한다. 단건 신청과 일괄(장바구니) 신청이 공유한다.
 * - 같은 부속을 여러 번 보낸 경우 합산
 * - equipmentId 에 실제로 속한 활성 부속인지 확인
 * - 대여 기간 기준 가용 수량 확인 (공유 재고 그룹 반영)
 */
async function validateAccessoriesForEquipment(
  equipmentId: number,
  raw: { accessoryId: number; quantity: number }[] | string | null | undefined,
  startAt: Date,
  endAt: Date,
): Promise<
  | { ok: true; accessories: { accessoryId: number; quantity: number }[] }
  | { ok: false; error: string }
> {
  let accessories: { accessoryId: number; quantity: number }[] = []
  if (raw) {
    if (typeof raw === 'string') {
      try {
        accessories = JSON.parse(raw)
      } catch {
        return { ok: false, error: '부속 기자재 정보가 올바르지 않습니다.' }
      }
    } else {
      accessories = raw
    }
    if (!Array.isArray(accessories)) {
      return { ok: false, error: '부속 기자재 정보가 올바르지 않습니다.' }
    }
  }

  const map = new Map<number, number>()
  for (const a of accessories) {
    map.set(a.accessoryId, (map.get(a.accessoryId) ?? 0) + a.quantity)
  }
  accessories = Array.from(map.entries()).map(([accessoryId, quantity]) => ({ accessoryId, quantity }))

  if (accessories.length > 0) {
    const records = await prisma.equipmentAccessory.findMany({
      where: { id: { in: accessories.map((a) => a.accessoryId) }, equipmentId, status: 'active' },
      select: { id: true, name: true },
    })
    const validIds = new Set(records.map((r) => r.id))
    for (const a of accessories) {
      if (!validIds.has(a.accessoryId)) {
        return { ok: false, error: '선택한 부속 기자재가 올바르지 않습니다.' }
      }
      if (a.quantity < 1) {
        return { ok: false, error: '부속 기자재 수량은 1 이상이어야 합니다.' }
      }
      const avail = await getAvailableAccessoryQuantity(a.accessoryId, startAt, endAt)
      if (avail < a.quantity) {
        const name = records.find((r) => r.id === a.accessoryId)?.name ?? ''
        return { ok: false, error: `부속 "${name}" 재고가 부족합니다 (가용: ${avail}개)` }
      }
    }
  }

  return { ok: true, accessories: accessories.filter((a) => a.quantity > 0) }
}

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
  // 학년은 클라이언트 입력을 쓰지 않는다. 명단 대조 후 서버가 결정한다.

  if (isNaN(equipmentId) || equipmentId < 1) {
    return { success: false, error: '기자재 정보가 올바르지 않습니다.' }
  }
  if (isNaN(quantity)) {
    return { success: false, error: '수량이 올바르지 않습니다.' }
  }
  if (!applicantName || !studentId || !phone || !password) {
    return { success: false, error: '필수 항목을 모두 입력해주세요.' }
  }
  if (!purpose) {
    return { success: false, error: '사용 목적을 입력해주세요.' }
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

  // 학과 명단 대조 — 등재되지 않은 학번은 신청 차단
  const rosterCheck = await verifyStudent(studentId, applicantName)
  if (!rosterCheck.ok) {
    return { success: false, error: verifyFailureMessage(rosterCheck.reason) }
  }
  // 학년은 명단 값을 신뢰한다. 클라이언트가 보낸 값은 쓰지 않는다.
  const verifiedGrade = rosterCheck.grade

  // 대여 제한자(패널티) 검증 — 제한 기간 내 학번은 신청 차단
  const restriction = await getActiveRestriction(studentId)
  if (restriction) {
    return { success: false, error: restrictionBlockMessage(restriction) }
  }

  // 최소·최대 대여 수량 서버사이드 검증
  const equipmentForLimit = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { minRentalQuantity: true, maxRentalQuantity: true, totalQuantity: true, status: true, minGrade: true, name: true },
  })
  if (!equipmentForLimit || equipmentForLimit.status !== 'active') {
    return { success: false, error: '해당 기자재를 찾을 수 없습니다.' }
  }
  if (verifiedGrade < equipmentForLimit.minGrade) {
    return {
      success: false,
      error: `'${equipmentForLimit.name}'은(는) ${eligibilityLabel(equipmentForLimit.name, equipmentForLimit.minGrade)} 대여 가능합니다.`,
    }
  }
  if (quantity < equipmentForLimit.minRentalQuantity) {
    return {
      success: false,
      error: `이 기자재는 최소 ${equipmentForLimit.minRentalQuantity}개 이상 신청해야 합니다.`,
    }
  }
  const effectiveMax = equipmentForLimit.maxRentalQuantity !== null
    ? Math.min(equipmentForLimit.maxRentalQuantity, equipmentForLimit.totalQuantity)
    : equipmentForLimit.totalQuantity
  if (quantity > effectiveMax) {
    return {
      success: false,
      error: `이 기자재는 1회 신청 시 최대 ${effectiveMax}개까지 신청 가능합니다.`,
    }
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

  // 부속 기자재 검증 (단건·일괄 공용 헬퍼)
  const accCheck = await validateAccessoriesForEquipment(
    equipmentId,
    formData.get('accessories') as string | null,
    startAt,
    endAt,
  )
  if (!accCheck.ok) return { success: false, error: accCheck.error }
  const accessories = accCheck.accessories

  try {
    const available = await checkAvailability(equipmentId, quantity, startAt, endAt)
    if (!available) {
      return { success: false, error: '선택한 기간에 해당 수량을 대여할 수 없습니다.' }
    }

    const requestNumber = await prisma.$transaction(async (tx) => {
      const passwordHash = await hashPassword(password)

      const request = await tx.rentalRequest.create({
        data: {
          requestNumber: `TEMP-${Date.now()}`,
          passwordHash,
          applicantName,
          studentId,
          phone,
          equipmentId,
          quantity,
          grade: verifiedGrade,
          startAt,
          endAt,
          purpose,
        },
      })

      const validAccessories = accessories.filter((a) => a.quantity > 0)
      if (validAccessories.length > 0) {
        await tx.rentalRequestAccessory.createMany({
          data: validAccessories.map((a) => ({
            rentalRequestId: request.id,
            accessoryId: a.accessoryId,
            quantity: a.quantity,
          })),
        })
      }

      const rn = generateRequestNumber(new Date(), request.id)
      await tx.rentalRequest.update({
        where: { id: request.id },
        data: { requestNumber: rn },
      })
      return rn
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
  // 학년은 클라이언트 입력을 쓰지 않는다. 명단 대조 후 서버가 결정한다.

  if (!applicantName || !studentId || !phone || !password) {
    return { success: false, error: '필수 항목을 모두 입력해주세요.' }
  }
  if (!purpose) {
    return { success: false, error: '사용 목적을 입력해주세요.' }
  }
  if (password.length < 4 || password.length > 8) {
    return { success: false, error: '비밀번호는 4~8자리여야 합니다.' }
  }
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || startAt >= endAt) {
    return { success: false, error: '대여 기간이 올바르지 않습니다.' }
  }

  // 학과 명단 대조 — 등재되지 않은 학번은 신청 차단
  const rosterCheck = await verifyStudent(studentId, applicantName)
  if (!rosterCheck.ok) {
    return { success: false, error: verifyFailureMessage(rosterCheck.reason) }
  }
  // 학년은 명단 값을 신뢰한다. 클라이언트가 보낸 값은 쓰지 않는다.
  const verifiedGrade = rosterCheck.grade

  // 대여 제한자(패널티) 검증 — 제한 기간 내 학번은 신청 차단
  const restriction = await getActiveRestriction(studentId)
  if (restriction) {
    return { success: false, error: restrictionBlockMessage(restriction) }
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

  let items: {
    equipmentId: number
    quantity: number
    accessories?: { accessoryId: number; quantity: number }[]
  }[]
  try {
    items = JSON.parse(formData.get('items') as string)
  } catch {
    return { success: false, error: '기자재 정보가 올바르지 않습니다.' }
  }
  if (!items.length) return { success: false, error: '선택한 기자재가 없습니다.' }

  try {
    // 가용성 + 최소/최대 수량 체크를 병렬로 실행
    const availabilityResults = await Promise.all(
      items.map(async item => {
        const [available, eq] = await Promise.all([
          getAvailableQuantity(item.equipmentId, startAt, endAt),
          prisma.equipment.findUnique({ where: { id: item.equipmentId }, select: { name: true, minRentalQuantity: true, maxRentalQuantity: true, totalQuantity: true, minGrade: true } }),
        ])
        return { item, available, eq }
      })
    )
    for (const { item, available, eq } of availabilityResults) {
      const minQty = eq?.minRentalQuantity ?? 1
      const effectiveMax = eq?.maxRentalQuantity !== null && eq?.maxRentalQuantity !== undefined
        ? Math.min(eq.maxRentalQuantity, eq.totalQuantity)
        : (eq?.totalQuantity ?? item.quantity)
      if (eq && verifiedGrade < eq.minGrade) {
        return { success: false, error: `'${eq.name}'은(는) ${eligibilityLabel(eq.name, eq.minGrade)} 대여 가능합니다.` }
      }
      if (item.quantity < minQty) {
        return { success: false, error: `'${eq?.name ?? item.equipmentId}': 이 기자재는 최소 ${minQty}개 이상 신청해야 합니다.` }
      }
      if (item.quantity > effectiveMax) {
        return { success: false, error: `'${eq?.name ?? item.equipmentId}': 이 기자재는 1회 신청 시 최대 ${effectiveMax}개까지 신청 가능합니다.` }
      }
      if (available < item.quantity) {
        return { success: false, error: `'${eq?.name ?? item.equipmentId}': 선택한 기간에 해당 수량을 대여할 수 없습니다.` }
      }
    }

    // 기자재별 부속 검증 후, 검증된 값으로 교체해 둔다 (생성 시 재사용)
    const normalizedAccessories = new Map<number, { accessoryId: number; quantity: number }[]>()
    for (const item of items) {
      const accCheck = await validateAccessoriesForEquipment(item.equipmentId, item.accessories, startAt, endAt)
      if (!accCheck.ok) return { success: false, error: accCheck.error }
      normalizedAccessories.set(item.equipmentId, accCheck.accessories)
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
          grade: verifiedGrade,
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

      const accessories = normalizedAccessories.get(item.equipmentId) ?? []
      if (accessories.length > 0) {
        await prisma.rentalRequestAccessory.createMany({
          data: accessories.map((a) => ({
            rentalRequestId: req.id,
            accessoryId: a.accessoryId,
            quantity: a.quantity,
          })),
        })
      }
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
  minGrade: number
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
      select: { id: true, totalQuantity: true, status: true, minGrade: true },
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

  const eqMap: Record<number, { totalQuantity: number; status: string; minGrade: number }> = {}
  for (const eq of equipments) {
    eqMap[eq.id] = { totalQuantity: eq.totalQuantity, status: eq.status, minGrade: eq.minGrade }
  }

  return items.map(item => {
    const eq = eqMap[item.equipmentId]
    if (!eq || eq.status !== 'active') {
      return { equipmentId: item.equipmentId, available: 0, totalQuantity: eq?.totalQuantity ?? 0, requested: item.quantity, minGrade: eq?.minGrade ?? 1 }
    }
    const used = usedMap[item.equipmentId] ?? 0
    const available = Math.max(0, eq.totalQuantity - used)
    return { equipmentId: item.equipmentId, available, totalQuantity: eq.totalQuantity, requested: item.quantity, minGrade: eq.minGrade }
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
        startAt: string
        endAt: string
        adminNote: string | null
        createdAt: string
        accessories: { name: string; quantity: number }[]
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

  const isClassroom = requestNumber.startsWith('ROOM')

  try {
    const rateLimitKey = `status:${requestNumber}`
    const { allowed, remainingAttempts } = await checkRateLimit(rateLimitKey)
    if (!allowed) {
      return { success: false, error: '시도 횟수 초과로 10분간 잠겼습니다.' }
    }

    if (isClassroom) {
      const request = await prisma.classroomRentalRequest.findUnique({
        where: { requestNumber },
        include: { classroom: { select: { roomNumber: true } } },
      })

      if (!request) {
        await recordFailedAttempt(rateLimitKey)
        return {
          success: false,
          error: '신청 내역을 찾을 수 없습니다.',
          remainingAttempts: remainingAttempts - 1,
        }
      }

      const valid = await verifyPassword(password, request.passwordHash)
      if (!valid) {
        await recordFailedAttempt(rateLimitKey)
        return {
          success: false,
          error: '비밀번호가 올바르지 않습니다.',
          remainingAttempts: remainingAttempts - 1,
        }
      }

      await resetAttempts(rateLimitKey)

      return {
        success: true,
        data: {
          requestNumber: request.requestNumber,
          groupNumber: null,
          status: request.status,
          equipmentName: `${request.classroom.roomNumber} (강의실)`,
          quantity: 1,
          startAt: toWallClockString(request.startAt),
          endAt: toWallClockString(request.endAt),
          adminNote: request.adminNote,
          createdAt: toWallClockString(request.createdAt),
          accessories: [],
        },
      }
    }

    const request = await prisma.rentalRequest.findUnique({
      where: { requestNumber },
      include: {
        equipment: { select: { name: true } },
        accessories: {
          include: { accessory: { select: { name: true } } },
        },
      },
    })

    if (!request) {
      await recordFailedAttempt(rateLimitKey)
      return {
        success: false,
        error: '신청 내역을 찾을 수 없습니다.',
        remainingAttempts: remainingAttempts - 1,
      }
    }

    const valid = await verifyPassword(password, request.passwordHash)
    if (!valid) {
      await recordFailedAttempt(rateLimitKey)
      return {
        success: false,
        error: '비밀번호가 올바르지 않습니다.',
        remainingAttempts: remainingAttempts - 1,
      }
    }

    await resetAttempts(rateLimitKey)

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
        startAt: toWallClockString(request.startAt),
        endAt: toWallClockString(request.endAt),
        adminNote: request.adminNote,
        createdAt: toWallClockString(request.createdAt),
        accessories: request.accessories.map((ra) => ({
          name: ra.accessory.name,
          quantity: ra.quantity,
        })),
      },
      groupItems,
    }
  } catch (error) {
    console.error('lookupRequest error:', error)
    return { success: false, error: '조회 중 오류가 발생했습니다. 다시 시도해주세요.' }
  }
}
