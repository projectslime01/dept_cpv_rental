import { prisma } from './prisma'

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

  const result = await prisma.rentalRequest.aggregate({
    where: {
      equipmentId,
      status: 'approved',
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    _sum: { quantity: true },
  })
  const used = result._sum.quantity ?? 0
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

