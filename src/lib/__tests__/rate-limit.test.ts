// src/lib/__tests__/rate-limit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkRateLimit, recordFailedAttempt, resetAttempts } from '../rate-limit'

const mockPrisma = {
  rateLimitAttempt: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
}

describe('checkRateLimit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows when no record exists', async () => {
    mockPrisma.rateLimitAttempt.findUnique.mockResolvedValue(null)
    const result = await checkRateLimit('key:abc', mockPrisma as any)
    expect(result).toEqual({ allowed: true, remainingAttempts: 5 })
  })

  it('blocks when locked', async () => {
    const future = new Date(Date.now() + 60000)
    mockPrisma.rateLimitAttempt.findUnique.mockResolvedValue({
      attempts: 5,
      lockedUntil: future,
    })
    const result = await checkRateLimit('key:abc', mockPrisma as any)
    expect(result).toEqual({ allowed: false, remainingAttempts: 0 })
  })

  it('allows after lock expires', async () => {
    const past = new Date(Date.now() - 60000)
    mockPrisma.rateLimitAttempt.findUnique.mockResolvedValue({
      attempts: 5,
      lockedUntil: past,
    })
    mockPrisma.rateLimitAttempt.deleteMany.mockResolvedValue({ count: 1 })
    const result = await checkRateLimit('key:abc', mockPrisma as any)
    expect(result).toEqual({ allowed: true, remainingAttempts: 5 })
    expect(mockPrisma.rateLimitAttempt.deleteMany).toHaveBeenCalledWith({ where: { key: 'key:abc' } })
  })

  it('returns correct remaining attempts', async () => {
    mockPrisma.rateLimitAttempt.findUnique.mockResolvedValue({
      attempts: 3,
      lockedUntil: null,
    })
    const result = await checkRateLimit('key:abc', mockPrisma as any)
    expect(result).toEqual({ allowed: true, remainingAttempts: 2 })
  })
})

describe('recordFailedAttempt', () => {
  beforeEach(() => vi.clearAllMocks())

  it('locks after 5 attempts', async () => {
    mockPrisma.rateLimitAttempt.upsert.mockResolvedValue({ attempts: 5 })
    await recordFailedAttempt('key:abc', mockPrisma as any)
    expect(mockPrisma.rateLimitAttempt.update).toHaveBeenCalled()
  })

  it('does not lock before 5 attempts', async () => {
    mockPrisma.rateLimitAttempt.upsert.mockResolvedValue({ attempts: 3 })
    await recordFailedAttempt('key:abc', mockPrisma as any)
    expect(mockPrisma.rateLimitAttempt.update).not.toHaveBeenCalled()
  })
})

describe('resetAttempts', () => {
  it('deletes the rate limit record', async () => {
    mockPrisma.rateLimitAttempt.deleteMany.mockResolvedValue({ count: 1 })
    await resetAttempts('key:abc', mockPrisma as any)
    expect(mockPrisma.rateLimitAttempt.deleteMany).toHaveBeenCalledWith({
      where: { key: 'key:abc' },
    })
  })
})
