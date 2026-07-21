// src/lib/accessory.ts
import { prisma } from './prisma'

/**
 * 주어진 부속과 재고를 공유하는 모든 부속의 id를 반환한다.
 * sharedStockKey가 같은(non-null) 부속들은 물리적으로 동일한 재고 풀을 공유한다.
 * 공유 그룹이 없으면 자기 자신만 담긴 배열을 반환한다.
 *
 * 반환: { memberIds, totalQuantity }
 * - memberIds: 재고를 함께 소비하는 부속 id 목록 (자기 자신 포함)
 * - totalQuantity: 그룹 전체가 공유하는 총 재고 (그룹 멤버 총 수량의 최댓값 —
 *   같은 풀이므로 멤버들은 같은 값으로 유지되는 것이 정상이며, 어긋날 경우
 *   최댓값을 기준으로 삼는다)
 */
async function resolveStockGroup(
  accessoryId: number,
): Promise<{ memberIds: number[]; totalQuantity: number } | null> {
  const accessory = await prisma.equipmentAccessory.findUnique({
    where: { id: accessoryId },
    select: { totalQuantity: true, status: true, sharedStockKey: true },
  })
  if (!accessory || accessory.status !== 'active') return null

  // 단독 재고 부속
  if (!accessory.sharedStockKey) {
    return { memberIds: [accessoryId], totalQuantity: accessory.totalQuantity }
  }

  // 공유 그룹: 같은 key를 가진 활성 부속 전체
  const members = await prisma.equipmentAccessory.findMany({
    where: { sharedStockKey: accessory.sharedStockKey, status: 'active' },
    select: { id: true, totalQuantity: true },
  })
  const totalQuantity = members.reduce((max, m) => Math.max(max, m.totalQuantity), 0)
  return { memberIds: members.map((m) => m.id), totalQuantity }
}

/**
 * 주어진 기간에 대해 부속 기자재의 가용 수량을 반환한다.
 * approved 상태 신청의 겹치는 수량만 차감한다.
 * 공유 재고 그룹에 속한 부속은 그룹 전체(다른 기자재에 딸린 같은 부속 포함)의
 * 사용량을 합산해 차감한다.
 * accessory가 없거나 inactive이면 0 반환.
 */
export async function getAvailableAccessoryQuantity(
  accessoryId: number,
  startAt: Date,
  endAt: Date,
): Promise<number> {
  const group = await resolveStockGroup(accessoryId)
  if (!group) return 0

  const result = await prisma.rentalRequestAccessory.aggregate({
    where: {
      accessoryId: { in: group.memberIds },
      rentalRequest: {
        status: 'approved',
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    },
    _sum: { quantity: true },
  })

  const used = result._sum.quantity ?? 0
  return Math.max(0, group.totalQuantity - used)
}

/**
 * 부속의 표시용 총 재고 수량. 공유 그룹이면 그룹 공유 총량을 반환한다.
 * 기간이 지정되지 않아 실시간 가용 수량 대신 총량만 필요할 때 사용.
 */
export async function getAccessoryTotalQuantity(accessoryId: number): Promise<number> {
  const group = await resolveStockGroup(accessoryId)
  return group?.totalQuantity ?? 0
}
