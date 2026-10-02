import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateRequestNumber, getAvailableQuantity, checkAvailability } from '../rental'

describe('generateRequestNumber', () => {
  it('formats as REQ-YYYYMMDD-NNNN', () => {
    const date = new Date('2026-05-20T00:00:00Z')
    const result = generateRequestNumber(date, 1)
    expect(result).toBe('REQ-20260520-0001')
  })

  it('pads id to 4 digits', () => {
    const date = new Date('2026-05-20T00:00:00Z')
    expect(generateRequestNumber(date, 42)).toBe('REQ-20260520-0042')
    expect(generateRequestNumber(date, 1000)).toBe('REQ-20260520-1000')
  })
})

// prisma 모듈 모킹
vi.mock('../prisma', () => ({
  prisma: {
    equipment: { findUnique: vi.fn() },
    rentalRequest: { findMany: vi.fn() },
  },
}))

import { prisma } from '../prisma'

describe('getAvailableQuantity', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns totalQuantity minus overlapping approved quantity', async () => {
    vi.mocked(prisma.equipment.findUnique).mockResolvedValue({
      id: 1, totalQuantity: 5, minRentalQuantity: 1, maxRentalQuantity: null, status: 'active', minGrade: 1,
      name: '', category: '', description: null, imageUrl: null, createdAt: new Date(),
    })
    vi.mocked(prisma.rentalRequest.findMany).mockResolvedValue([{ startAt: new Date('2026-05-21T09:00:00Z'), endAt: new Date('2026-05-21T18:00:00Z'), quantity: 2 }] as any)

    const result = await getAvailableQuantity(
      1,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
    )
    expect(result).toBe(3)
  })

  it('returns totalQuantity when no overlapping requests', async () => {
    vi.mocked(prisma.equipment.findUnique).mockResolvedValue({
      id: 1, totalQuantity: 5, minRentalQuantity: 1, maxRentalQuantity: null, status: 'active', minGrade: 1,
      name: '', category: '', description: null, imageUrl: null, createdAt: new Date(),
    })
    vi.mocked(prisma.rentalRequest.findMany).mockResolvedValue([])

    const result = await getAvailableQuantity(
      1,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
    )
    expect(result).toBe(5)
  })

  it('서로 겹치지 않는 대여는 합산하지 않고 동시 최대 수량만 차감한다', async () => {
    vi.mocked(prisma.equipment.findUnique).mockResolvedValue({
      id: 1, totalQuantity: 2, minRentalQuantity: 1, maxRentalQuantity: null, status: 'active', minGrade: 1,
      name: '', category: '', description: null, imageUrl: null, createdAt: new Date(),
    })
    // 오전 1대, 오후 1대 — 하루 전체를 조회해도 동시에 나가 있는 건 1대
    vi.mocked(prisma.rentalRequest.findMany).mockResolvedValue([
      { startAt: new Date('2026-05-21T09:00:00Z'), endAt: new Date('2026-05-21T12:00:00Z'), quantity: 1 },
      { startAt: new Date('2026-05-21T13:00:00Z'), endAt: new Date('2026-05-21T18:00:00Z'), quantity: 1 },
    ] as any)

    const result = await getAvailableQuantity(
      1,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
    )
    expect(result).toBe(1)
  })
})

describe('checkAvailability', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns true when enough quantity available', async () => {
    vi.mocked(prisma.equipment.findUnique).mockResolvedValue({
      id: 1, totalQuantity: 5, minRentalQuantity: 1, maxRentalQuantity: null, status: 'active', minGrade: 1,
      name: '', category: '', description: null, imageUrl: null, createdAt: new Date(),
    })
    vi.mocked(prisma.rentalRequest.findMany).mockResolvedValue([{ startAt: new Date('2026-05-21T09:00:00Z'), endAt: new Date('2026-05-21T18:00:00Z'), quantity: 2 }] as any)

    const result = await checkAvailability(1, 3,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
    )
    expect(result).toBe(true)
  })

  it('returns false when quantity exceeds availability', async () => {
    vi.mocked(prisma.equipment.findUnique).mockResolvedValue({
      id: 1, totalQuantity: 5, minRentalQuantity: 1, maxRentalQuantity: null, status: 'active', minGrade: 1,
      name: '', category: '', description: null, imageUrl: null, createdAt: new Date(),
    })
    vi.mocked(prisma.rentalRequest.findMany).mockResolvedValue([{ startAt: new Date('2026-05-21T09:00:00Z'), endAt: new Date('2026-05-21T18:00:00Z'), quantity: 3 }] as any)

    const result = await checkAvailability(1, 3,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
    )
    expect(result).toBe(false)
  })

  it('returns false when equipment is inactive', async () => {
    vi.mocked(prisma.equipment.findUnique).mockResolvedValue({
      id: 1, totalQuantity: 5, minRentalQuantity: 1, maxRentalQuantity: null, status: 'inactive', minGrade: 1,
      name: '', category: '', description: null, imageUrl: null, createdAt: new Date(),
    })

    const result = await checkAvailability(1, 1,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
    )
    expect(result).toBe(false)
  })
})
