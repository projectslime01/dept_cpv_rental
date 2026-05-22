import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function maskName(name: string): string {
  if (!name) return ''
  const trimmed = name.trim()
  if (trimmed.length <= 1) return trimmed
  if (trimmed.length === 2) {
    return trimmed[0] + '*'
  }
  return trimmed[0] + '*'.repeat(trimmed.length - 2) + trimmed[trimmed.length - 1]
}

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

    const rentals = await prisma.rentalRequest.findMany({
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
        quantity: true,
        equipment: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    })

    const maskedRentals = rentals.map((r) => ({
      id: r.id,
      applicantName: maskName(r.applicantName),
      equipmentName: r.equipment.name,
      quantity: r.quantity,
      startAt: r.startAt,
      endAt: r.endAt,
    }))

    return NextResponse.json({ rentals: maskedRentals })
  } catch (err) {
    console.error('[rentals api] db error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
