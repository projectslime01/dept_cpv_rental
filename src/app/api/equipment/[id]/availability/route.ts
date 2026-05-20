import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAvailableQuantity } from '@/lib/rental'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const startAt = searchParams.get('startAt')
  const endAt = searchParams.get('endAt')

  if (!startAt || !endAt) {
    return NextResponse.json({ error: 'startAt and endAt required' }, { status: 400 })
  }

  const start = new Date(startAt)
  const end = new Date(endAt)

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  const available = await getAvailableQuantity(id, start, end, prisma)
  return NextResponse.json({ available })
}
