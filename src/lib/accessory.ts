// src/lib/accessory.ts
import { prisma } from './prisma'

/**
 * 주어진 기간에 대해 부속 기자재의 가용 수량을 반환한다.
 * approved 상태 신청의 겹치는 수량만 차감한다.
 * accessory가 없거나 inactive이면 0 반환.
 */
export async function getAvailableAccessoryQuantity(
  accessoryId: number,
  startAt: Date,
  endAt: Date,
): Promise<number> {
  const accessory = await prisma.equipmentAccessory.findUnique({
    where: { id: accessoryId },
    select: { totalQuantity: true, status: true },
  })
  if (!accessory || accessory.status !== 'active') return 0

  const result = await prisma.rentalRequestAccessory.aggregate({
    where: {
      accessoryId,
      rentalRequest: {
        status: 'approved',
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    },
    _sum: { quantity: true },
  })

  const used = result._sum.quantity ?? 0
  return Math.max(0, accessory.totalQuantity - used)
}
