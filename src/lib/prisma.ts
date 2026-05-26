import 'server-only'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/db'
  if (connectionString.startsWith('file:')) {
    const dbPath = connectionString.replace('file:', '')
    const adapter = new PrismaBetterSqlite3({ url: dbPath })
    return new PrismaClient({ adapter, log: ['error'] })
  }
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({ adapter, log: ['error'] })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
