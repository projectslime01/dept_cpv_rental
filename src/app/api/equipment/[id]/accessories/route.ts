// src/app/api/equipment/[id]/accessories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAvailableAccessoryQuantity } from '@/lib/accessory'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const equipmentId = parseInt(params.id)
  if (isNaN(equipmentId)) {
    return NextResponse.json({ error: 'Invalid equipment id' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const startAtStr = searchParams.get('startAt')
  const endAtStr = searchParams.get('endAt')

  const startAt = startAtStr ? new Date(startAtStr) : null
  const endAt = endAtStr ? new Date(endAtStr) : null

  const hasValidDates =
    startAt && endAt &&
    !isNaN(startAt.getTime()) &&
    !isNaN(endAt.getTime()) &&
    startAt < endAt

  const accessories = await prisma.equipmentAccessory.findMany({
    where: { equipmentId, status: 'active' },
    select: { id: true, name: true, description: true, totalQuantity: true },
    orderBy: { id: 'asc' },
  })

  if (!accessories.length) {
    return NextResponse.json([])
  }

  const result = await Promise.all(
    accessories.map(async (acc) => {
      const available = hasValidDates
        ? await getAvailableAccessoryQuantity(acc.id, startAt!, endAt!)
        : acc.totalQuantity
      return {
        id: acc.id,
        name: acc.name,
        description: acc.description,
        totalQuantity: acc.totalQuantity,
        available,
      }
    }),
  )

  return NextResponse.json(result)
}
