import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAvailableQuantity } from '@/lib/rental'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const { searchParams } = req.nextUrl
  const yearStr = searchParams.get('year')
  const monthStr = searchParams.get('month')

  // ── 월간 일별 가용 재고 조회 분기 ──────────────────────────────────────────
  if (yearStr && monthStr) {
    const year = parseInt(yearStr)
    const month = parseInt(monthStr) // 1-indexed (1 ~ 12)
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
    }

    try {
      const equipment = await prisma.equipment.findUnique({
        where: { id, status: 'active' },
        select: { totalQuantity: true },
      })
      if (!equipment) {
        return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
      }

      const totalQuantity = equipment.totalQuantity

      // 해당 월의 1일과 말일 범위 설정
      const firstDay = new Date(year, month - 1, 1)
      const lastDay = new Date(year, month, 0, 23, 59, 59, 999)
      const numDays = lastDay.getDate()

      // 해당 월의 겹치는 대여 승인 건 조회
      const requests = await prisma.rentalRequest.findMany({
        where: {
          equipmentId: id,
          status: 'approved',
          startAt: { lte: lastDay },
          endAt: { gte: firstDay },
        },
        select: {
          startAt: true,
          endAt: true,
          quantity: true,
        },
      })

      const daysData = []
      for (let day = 1; day <= numDays; day++) {
        // 해당 일자 00:00:00 ~ 23:59:59 사이의 가용량 구하기
        const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0)
        const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999)

        // 겹치는 수량 계산
        let used = 0
        for (const req of requests) {
          const reqStart = new Date(req.startAt)
          const reqEnd = new Date(req.endAt)
          // 겹침 조건: reqStart < dayEnd && reqEnd > dayStart
          if (reqStart < dayEnd && reqEnd > dayStart) {
            used += req.quantity
          }
        }

        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        daysData.push({
          date: dateString,
          available: Math.max(0, totalQuantity - used),
        })
      }

      return NextResponse.json({
        year,
        month,
        totalQuantity,
        days: daysData,
      })
    } catch (err) {
      console.error('[availability month] db error', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  // ── 기존 단일 기간 가용 여부 조회 분기 ──────────────────────────────────────
  const startAt = searchParams.get('startAt')
  const endAt = searchParams.get('endAt')

  if (!startAt || !endAt) {
    return NextResponse.json({ error: 'startAt and endAt, or year and month required' }, { status: 400 })
  }

  const start = new Date(startAt)
  const end = new Date(endAt)

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  try {
    const available = await getAvailableQuantity(id, start, end)
    return NextResponse.json({ available: Math.max(0, available) })
  } catch (err) {
    console.error('[availability] db error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
