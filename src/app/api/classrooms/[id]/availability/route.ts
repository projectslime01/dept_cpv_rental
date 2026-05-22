// src/app/api/classrooms/[id]/availability/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { maskName } from '@/app/actions/classroomRental'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const { searchParams } = req.nextUrl
  const yearStr = searchParams.get('year')
  const monthStr = searchParams.get('month')

  if (yearStr && monthStr) {
    const year = parseInt(yearStr)
    const month = parseInt(monthStr) // 1-indexed (1 ~ 12)
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
    }

    try {
      const classroom = await prisma.classroom.findUnique({
        where: { id, status: 'active' },
      })
      if (!classroom) {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
      }

      // 해당 월의 1일과 말일 범위 설정
      const firstDay = new Date(year, month - 1, 1)
      const lastDay = new Date(year, month, 0, 23, 59, 59, 999)

      // 해당 월에 걸쳐 있는 모든 예약 신청 건 조회 (대기 및 승인 건 모두 반환하되, 승인 건이 독점권을 가짐)
      const requests = await prisma.classroomRentalRequest.findMany({
        where: {
          classroomId: id,
          status: { in: ['approved', 'pending'] },
          startAt: { lte: lastDay },
          endAt: { gte: firstDay },
        },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          applicantName: true,
          status: true,
          purpose: true,
        },
        orderBy: {
          startAt: 'asc',
        },
      })

      // 개인 정보 보장 및 포맷 가공
      const formattedBookings = await Promise.all(
        requests.map(async (req) => ({
          id: req.id,
          startAt: req.startAt,
          endAt: req.endAt,
          applicantName: await maskName(req.applicantName),
          status: req.status,
          purpose: req.purpose,
        }))
      )


      return NextResponse.json({
        year,
        month,
        classroom,
        bookings: formattedBookings,
      })
    } catch (err) {
      console.error('[classroom availability month] db error', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  // ── 단일 기간 가용 여부 조회 분기 ──────────────────────────────────────
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
    const conflict = await prisma.classroomRentalRequest.findFirst({
      where: {
        classroomId: id,
        status: 'approved',
        startAt: { lt: end },
        endAt: { gt: start },
      },
    })
    return NextResponse.json({ available: !conflict })
  } catch (err) {
    console.error('[classroom availability] db error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
