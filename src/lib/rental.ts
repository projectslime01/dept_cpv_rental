import { format } from 'date-fns'
import type { PrismaClient } from '@prisma/client'

export function generateRequestNumber(date: Date, id: number): string {
  const dateStr = format(date, 'yyyyMMdd')
  return `REQ-${dateStr}-${String(id).padStart(4, '0')}`
}

export async function getAvailableQuantity(
  equipmentId: number,
  startAt: Date,
  endAt: Date,
  prismaClient: Pick<PrismaClient, 'equipment' | 'rentalRequest'>
): Promise<number> {
  const equipment = await (prismaClient.equipment as any).findUnique({
    where: { id: equipmentId },
    select: { totalQuantity: true, status: true },
  })
  if (!equipment || equipment.status !== 'active') return 0

  const result = await (prismaClient.rentalRequest as any).aggregate({
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
  prismaClient: Pick<PrismaClient, 'equipment' | 'rentalRequest'>
): Promise<boolean> {
  const available = await getAvailableQuantity(equipmentId, startAt, endAt, prismaClient)
  return available >= requestedQuantity
}
