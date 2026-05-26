// src/lib/__tests__/rate-limit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkRateLimit, recordFailedAttempt, resetAttempts } from '../rate-limit'

// prisma 모듈 모킹
vi.mock('../prisma', () => ({
  prisma: {
    rateLimitAttempt: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import { prisma } from '../prisma'
const mockRateLimit = prisma.rateLimitAttempt as ReturnType<typeof vi.fn> & typeof prisma.rateLimitAttempt

describe('checkRateLimit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows when no record exists', async () => {
    vi.mocked(prisma.rateLimitAttempt.findUnique).mockResolvedValue(null)
    const result = await checkRateLimit('key:abc')
    expect(result).toEqual({ allowed: true, remainingAttempts: 5 })
  })

  it('blocks when locked', async () => {
    const future = new Date(Date.now() + 60000)
    vi.mocked(prisma.rateLimitAttempt.findUnique).mockResolvedValue({
      id: 1, key: 'key:abc', attempts: 5, lockedUntil: future, updatedAt: new Date(),
    })
    const result = await checkRateLimit('key:abc')
    expect(result).toEqual({ allowed: false, remainingAttempts: 0 })
  })

  it('allows after lock expires', async () => {
    const past = new Date(Date.now() - 60000)
    vi.mocked(prisma.rateLimitAttempt.findUnique).mockResolvedValue({
      id: 1, key: 'key:abc', attempts: 5, lockedUntil: past, updatedAt: new Date(),
    })
    vi.mocked(prisma.rateLimitAttempt.deleteMany).mockResolvedValue({ count: 1 })
    const result = await checkRateLimit('key:abc')
    expect(result).toEqual({ allowed: true, remainingAttempts: 5 })
    expect(prisma.rateLimitAttempt.deleteMany).toHaveBeenCalledWith({ where: { key: 'key:abc' } })
  })

  it('returns correct remaining attempts', async () => {
    vi.mocked(prisma.rateLimitAttempt.findUnique).mockResolvedValue({
      id: 1, key: 'key:abc', attempts: 3, lockedUntil: null, updatedAt: new Date(),
    })
    const result = await checkRateLimit('key:abc')
    expect(result).toEqual({ allowed: true, remainingAttempts: 2 })
  })
})

describe('recordFailedAttempt', () => {
  beforeEach(() => vi.clearAllMocks())

  it('locks after 5 attempts', async () => {
    vi.mocked(prisma.rateLimitAttempt.upsert).mockResolvedValue({
      id: 1, key: 'key:abc', attempts: 5, lockedUntil: null, updatedAt: new Date(),
    })
    vi.mocked(prisma.rateLimitAttempt.update).mockResolvedValue({
      id: 1, key: 'key:abc', attempts: 5, lockedUntil: new Date(), updatedAt: new Date(),
    })
    await recordFailedAttempt('key:abc')
    expect(prisma.rateLimitAttempt.update).toHaveBeenCalled()
  })

  it('does not lock before 5 attempts', async () => {
    vi.mocked(prisma.rateLimitAttempt.upsert).mockResolvedValue({
      id: 1, key: 'key:abc', attempts: 3, lockedUntil: null, updatedAt: new Date(),
    })
    await recordFailedAttempt('key:abc')
    expect(prisma.rateLimitAttempt.update).not.toHaveBeenCalled()
  })
})

describe('resetAttempts', () => {
  it('deletes the rate limit record', async () => {
    vi.mocked(prisma.rateLimitAttempt.deleteMany).mockResolvedValue({ count: 1 })
    await resetAttempts('key:abc')
    expect(prisma.rateLimitAttempt.deleteMany).toHaveBeenCalledWith({ where: { key: 'key:abc' } })
  })
})
