// src/lib/rate-limit.ts
import type { PrismaClient } from '@prisma/client'

const MAX_ATTEMPTS = 5
const LOCK_DURATION_MS = 10 * 60 * 1000

export async function checkRateLimit(
  key: string,
  prismaClient: Pick<PrismaClient, 'rateLimitAttempt'>
): Promise<{ allowed: boolean; remainingAttempts: number }> {
  const record = await (prismaClient.rateLimitAttempt as any).findUnique({ where: { key } })
  if (!record) return { allowed: true, remainingAttempts: MAX_ATTEMPTS }
  if (record.lockedUntil && record.lockedUntil > new Date()) {
    return { allowed: false, remainingAttempts: 0 }
  }
  // Lock has expired or was never set — treat expired lock as a fresh start
  if (record.lockedUntil && record.lockedUntil <= new Date()) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS }
  }
  const remaining = Math.max(0, MAX_ATTEMPTS - record.attempts)
  return { allowed: remaining > 0, remainingAttempts: remaining }
}

export async function recordFailedAttempt(
  key: string,
  prismaClient: Pick<PrismaClient, 'rateLimitAttempt'>
): Promise<void> {
  const record = await (prismaClient.rateLimitAttempt as any).upsert({
    where: { key },
    update: { attempts: { increment: 1 } },
    create: { key, attempts: 1 },
  })
  if (record.attempts >= MAX_ATTEMPTS) {
    await (prismaClient.rateLimitAttempt as any).update({
      where: { key },
      data: { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) },
    })
  }
}

export async function resetAttempts(
  key: string,
  prismaClient: Pick<PrismaClient, 'rateLimitAttempt'>
): Promise<void> {
  await (prismaClient.rateLimitAttempt as any).deleteMany({ where: { key } })
}
