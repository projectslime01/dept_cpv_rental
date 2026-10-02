import { prisma } from './prisma'
import { peakConcurrentUsage } from './approvalCheck'

// 순수 유틸리티 함수 재-익스포트 (하위 호환)
export {
  generateRequestNumber,
  isHoliday,
  getKSTHoursAndMinutes,
  nowKST,
  isSubmissionTimeValid,
  getEarliestAllowedStartDate,
  isValidStartDate,
  countWeekdaysInRange,
  includesWeekend,
  isValidWeekendRental,
} from './rentalUtils'

export async function getAvailableQuantity(
  equipmentId: number,
  startAt: Date,
  endAt: Date,
): Promise<number> {
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { totalQuantity: true, status: true },
  })
  if (!equipment || equipment.status !== 'active') return 0

  // 기간과 겹치는 대여를 모두 더하지 않고, 동시에 나가 있는 최대 수량으로 차감한다.
  // (관리자 승인 시 재고 확인과 같은 기준 — @/lib/approvalCheck)
  const overlapping = await prisma.rentalRequest.findMany({
    where: {
      equipmentId,
      status: 'approved',
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { startAt: true, endAt: true, quantity: true },
  })
  const used = peakConcurrentUsage(overlapping, startAt, endAt)
  return equipment.totalQuantity - used
}

export async function checkAvailability(
  equipmentId: number,
  requestedQuantity: number,
  startAt: Date,
  endAt: Date,
): Promise<boolean> {
  const available = await getAvailableQuantity(equipmentId, startAt, endAt)
  return available >= requestedQuantity
}

