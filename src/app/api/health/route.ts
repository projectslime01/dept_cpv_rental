import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await prisma.equipment.count()
    return NextResponse.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json(
      { status: 'error', db: 'error', timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }
}
