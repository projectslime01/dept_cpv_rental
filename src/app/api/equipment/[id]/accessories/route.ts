// src/app/api/equipment/[id]/accessories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAvailableAccessoryQuantity, getAccessoryTotalQuantity } from '@/lib/accessory'

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

  try {
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
        // 공유 재고 그룹이면 그룹 공유 총량 기준으로 표시/차감한다.
        const totalQuantity = await getAccessoryTotalQuantity(acc.id)
        const available = hasValidDates
          ? await getAvailableAccessoryQuantity(acc.id, startAt!, endAt!)
          : totalQuantity
        return {
          id: acc.id,
          name: acc.name,
          description: acc.description,
          totalQuantity,
          available,
        }
      }),
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/equipment/[id]/accessories error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
