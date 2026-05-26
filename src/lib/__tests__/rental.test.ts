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
    rentalRequest: { aggregate: vi.fn() },
  },
}))

import { prisma } from '../prisma'

describe('getAvailableQuantity', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns totalQuantity minus overlapping approved quantity', async () => {
    vi.mocked(prisma.equipment.findUnique).mockResolvedValue({
      id: 1, totalQuantity: 5, minRentalQuantity: 1, status: 'active',
      name: '', category: '', description: null, imageUrl: null, createdAt: new Date(),
    })
    vi.mocked(prisma.rentalRequest.aggregate).mockResolvedValue({ _sum: { quantity: 2 }, _avg: {}, _count: {}, _max: {}, _min: {} } as any)

    const result = await getAvailableQuantity(
      1,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
    )
    expect(result).toBe(3)
  })

  it('returns totalQuantity when no overlapping requests', async () => {
    vi.mocked(prisma.equipment.findUnique).mockResolvedValue({
      id: 1, totalQuantity: 5, minRentalQuantity: 1, status: 'active',
      name: '', category: '', description: null, imageUrl: null, createdAt: new Date(),
    })
    vi.mocked(prisma.rentalRequest.aggregate).mockResolvedValue({ _sum: { quantity: null }, _avg: {}, _count: {}, _max: {}, _min: {} } as any)

    const result = await getAvailableQuantity(
      1,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
    )
    expect(result).toBe(5)
  })
})

describe('checkAvailability', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns true when enough quantity available', async () => {
    vi.mocked(prisma.equipment.findUnique).mockResolvedValue({
      id: 1, totalQuantity: 5, minRentalQuantity: 1, status: 'active',
      name: '', category: '', description: null, imageUrl: null, createdAt: new Date(),
    })
    vi.mocked(prisma.rentalRequest.aggregate).mockResolvedValue({ _sum: { quantity: 2 }, _avg: {}, _count: {}, _max: {}, _min: {} } as any)

    const result = await checkAvailability(1, 3,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
    )
    expect(result).toBe(true)
  })

  it('returns false when quantity exceeds availability', async () => {
    vi.mocked(prisma.equipment.findUnique).mockResolvedValue({
      id: 1, totalQuantity: 5, minRentalQuantity: 1, status: 'active',
      name: '', category: '', description: null, imageUrl: null, createdAt: new Date(),
    })
    vi.mocked(prisma.rentalRequest.aggregate).mockResolvedValue({ _sum: { quantity: 3 }, _avg: {}, _count: {}, _max: {}, _min: {} } as any)

    const result = await checkAvailability(1, 3,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
    )
    expect(result).toBe(false)
  })

  it('returns false when equipment is inactive', async () => {
    vi.mocked(prisma.equipment.findUnique).mockResolvedValue({
      id: 1, totalQuantity: 5, minRentalQuantity: 1, status: 'inactive',
      name: '', category: '', description: null, imageUrl: null, createdAt: new Date(),
    })

    const result = await checkAvailability(1, 1,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
    )
    expect(result).toBe(false)
  })
})
