import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { maskName } from '@/lib/maskName'
import { toWallClockString } from '@/lib/rentalUtils'
import { groupRequests, formatItemList, unitFor } from '@/lib/requestGrouping'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const yearStr = searchParams.get('year')
  const monthStr = searchParams.get('month')

  if (!yearStr || !monthStr) {
    return NextResponse.json({ error: 'year and month are required' }, { status: 400 })
  }

  const year = parseInt(yearStr)
  const month = parseInt(monthStr) // 1 ~ 12

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
  }

  try {
    const firstDay = new Date(year, month - 1, 1, 0, 0, 0, 0)
    const lastDay = new Date(year, month, 0, 23, 59, 59, 999)

    // 1. 기자재 대여 승인 내역 조회
    const equipmentRentals = await prisma.rentalRequest.findMany({
      where: {
        status: 'approved',
        startAt: { lte: lastDay },
        endAt: { gte: firstDay },
      },
      select: {
        id: true,
        groupNumber: true,
        applicantName: true,
        startAt: true,
        endAt: true,
        quantity: true,
        equipment: {
          select: {
            name: true,
            category: true,
          },
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    })

    // 2. 강의실 대여 승인 내역 조회
    const classroomRentals = await prisma.classroomRentalRequest.findMany({
      where: {
        status: 'approved',
        startAt: { lte: lastDay },
        endAt: { gte: firstDay },
      },
      select: {
        id: true,
        applicantName: true,
        startAt: true,
        endAt: true,
        classroom: {
          select: {
            roomNumber: true,
          },
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    })

    // 3. 포맷팅 및 통합
    // 일괄 신청(같은 groupNumber)은 캘린더에서 한 건으로 묶어 보여준다.
    // 단건 신청은 groupNumber 가 없어 각자 하나의 묶음이 된다.
    const formattedEquipment = groupRequests(equipmentRentals).map((g) => {
      const head = g.rows[0]
      const items = g.rows.map((r) => ({
        name: r.equipment.name,
        category: r.equipment.category,
        quantity: r.quantity,
      }))
      const totalQuantity = items.reduce((sum, it) => sum + it.quantity, 0)
      const label =
        items.length === 1
          ? items[0].name
          : `${items[0].name} 외 ${items.length - 1}종`

      return {
        id: `EQ-${g.key}`,
        type: 'equipment',
        applicantName: maskName(head.applicantName),
        equipmentName: label,
        itemsLabel: formatItemList(items),
        items: items.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          unit: unitFor(it.category),
        })),
        quantity: totalQuantity,
        startAt: toWallClockString(head.startAt),
        endAt: toWallClockString(head.endAt),
      }
    })

    const formattedClassroom = classroomRentals.map((r) => ({
      id: `ROOM-${r.id}`,
      type: 'classroom',
      applicantName: maskName(r.applicantName),
      equipmentName: r.classroom.roomNumber,
      itemsLabel: r.classroom.roomNumber,
      items: [{ name: r.classroom.roomNumber, quantity: 1, unit: '개' }],
      quantity: 1,
      startAt: toWallClockString(r.startAt),
      endAt: toWallClockString(r.endAt),
    }))

    // 시작 시간 기준 오름차순 정렬하여 병합
    const merged = [...formattedEquipment, ...formattedClassroom].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    )

    return NextResponse.json({ rentals: merged })
  } catch (err) {
    console.error('[rentals api] db error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
