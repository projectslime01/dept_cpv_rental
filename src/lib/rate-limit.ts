// src/lib/rate-limit.ts
import { prisma } from './prisma'

const MAX_ATTEMPTS = 5
const LOCK_DURATION_MS = 10 * 60 * 1000

export async function checkRateLimit(
  key: string,
): Promise<{ allowed: boolean; remainingAttempts: number }> {
  const record = await prisma.rateLimitAttempt.findUnique({ where: { key } })
  if (!record) return { allowed: true, remainingAttempts: MAX_ATTEMPTS }
  if (record.lockedUntil && record.lockedUntil > new Date()) {
    return { allowed: false, remainingAttempts: 0 }
  }
  // Lock has expired — treat as fresh start
  if (record.lockedUntil && record.lockedUntil <= new Date()) {
    await prisma.rateLimitAttempt.deleteMany({ where: { key } })
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS }
  }
  const remaining = Math.max(0, MAX_ATTEMPTS - record.attempts)
  return { allowed: remaining > 0, remainingAttempts: remaining }
}

export async function recordFailedAttempt(key: string): Promise<void> {
  const record = await prisma.rateLimitAttempt.upsert({
    where: { key },
    update: { attempts: { increment: 1 } },
    create: { key, attempts: 1 },
  })
  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.rateLimitAttempt.update({
      where: { key },
      data: { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) },
    })
  }
}

export async function resetAttempts(key: string): Promise<void> {
  await prisma.rateLimitAttempt.deleteMany({ where: { key } })
}
