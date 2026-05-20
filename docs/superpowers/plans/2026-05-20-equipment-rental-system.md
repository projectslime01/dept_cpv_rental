# 영상콘텐츠과 기자재 대여 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대학교 영상콘텐츠과 학생이 로그인 없이 기자재를 신청하고, 관리자가 승인·반납을 처리하는 Next.js 14 웹 시스템 구축

**Architecture:** Next.js 14 App Router 단일 레포. Server Components로 DB 직접 조회, Server Actions으로 폼 제출 처리, 단일 API Route(가용 수량 AJAX)만 사용. PostgreSQL + Prisma ORM. 관리자 세션만 NextAuth.js로 보호.

**Tech Stack:** Next.js 14, TypeScript, PostgreSQL, Prisma 5, NextAuth.js 4, bcryptjs, date-fns, Tailwind CSS, shadcn/ui, Vitest

---

## File Map

```
/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx                          # 기자재 목록
│   │   ├── equipment/[id]/page.tsx           # 기자재 상세
│   │   ├── apply/page.tsx                    # 대여 신청 폼
│   │   ├── status/page.tsx                   # 신청 조회
│   │   ├── actions/
│   │   │   ├── rental.ts                     # createRentalRequest, lookupRequest
│   │   │   └── admin.ts                      # approve/reject/return, equipment CRUD
│   │   ├── api/equipment/[id]/availability/
│   │   │   └── route.ts                      # GET 가용 수량 (AJAX용)
│   │   └── admin/
│   │       ├── layout.tsx                    # 세션 가드
│   │       ├── page.tsx                      # 로그인
│   │       ├── dashboard/page.tsx
│   │       ├── requests/page.tsx
│   │       ├── equipment/page.tsx
│   │       └── history/page.tsx
│   ├── components/
│   │   ├── equipment/
│   │   │   ├── EquipmentCard.tsx
│   │   │   └── AvailabilityChecker.tsx       # client component
│   │   ├── rental/
│   │   │   ├── RentalForm.tsx                # client component
│   │   │   └── StatusLookup.tsx              # client component
│   │   └── admin/
│   │       ├── RequestTable.tsx              # client component
│   │       ├── ActionModal.tsx               # client component
│   │       └── EquipmentForm.tsx             # client component
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── password.ts
│   │   ├── rental.ts                         # 가용성 계산, 신청번호 생성
│   │   └── rate-limit.ts
│   └── types/index.ts
├── middleware.ts
├── vitest.config.ts
└── vitest.setup.ts
```

---

## Task 1: 프로젝트 초기화

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`, `vitest.setup.ts`

- [ ] **Step 1: Next.js 프로젝트 생성**

프로젝트 디렉토리(`기자재 대여 시스템/`)에서 실행:

```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

프롬프트가 나오면 모두 기본값(Enter) 선택.

- [ ] **Step 2: 의존성 설치**

```bash
npm install @prisma/client next-auth bcryptjs date-fns lucide-react clsx tailwind-merge
npm install -D prisma @types/bcryptjs vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @vitejs/plugin-react
```

- [ ] **Step 3: shadcn/ui 초기화 및 컴포넌트 추가**

```bash
npx shadcn-ui@latest init
```

프롬프트:
- Style: Default
- Base color: Slate
- CSS variables: Yes

```bash
npx shadcn-ui@latest add button card input label badge dialog tabs table select textarea
```

- [ ] **Step 4: vitest.config.ts 작성**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 5: vitest.setup.ts 작성**

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: package.json에 test 스크립트 추가**

`package.json`의 `"scripts"` 블록에 추가:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 7: 동작 확인**

```bash
npm run dev
```

Expected: `http://localhost:3000` 에서 Next.js 기본 페이지 표시

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: initialize Next.js 14 project with dependencies"
```

---

## Task 2: Prisma 스키마 + 마이그레이션 + Seed

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/prisma.ts`

- [ ] **Step 1: Prisma 초기화**

```bash
npx prisma init --datasource-provider postgresql
```

Expected: `prisma/schema.prisma`, `.env` 파일 생성

- [ ] **Step 2: .env 데이터베이스 URL 설정**

`.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/equipment_rental"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 3: schema.prisma 작성**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Equipment {
  id            Int             @id @default(autoincrement())
  name          String
  category      String
  description   String?
  imageUrl      String?
  totalQuantity Int
  status        String          @default("active")
  requests      RentalRequest[]
  createdAt     DateTime        @default(now())
}

model RentalRequest {
  id            Int       @id @default(autoincrement())
  requestNumber String    @unique
  passwordHash  String
  applicantName String
  studentId     String
  phone         String
  equipmentId   Int
  equipment     Equipment @relation(fields: [equipmentId], references: [id])
  quantity      Int
  startAt       DateTime
  endAt         DateTime
  purpose       String?
  status        String    @default("pending")
  adminNote     String?
  returnedAt    DateTime?
  createdAt     DateTime  @default(now())
}

model Admin {
  id           Int    @id @default(autoincrement())
  username     String @unique
  passwordHash String
}

model RateLimitAttempt {
  id          Int       @id @default(autoincrement())
  key         String    @unique
  attempts    Int       @default(0)
  lockedUntil DateTime?
  updatedAt   DateTime  @updatedAt
}
```

- [ ] **Step 4: 마이그레이션 실행**

```bash
npx prisma migrate dev --name init
```

Expected: `prisma/migrations/` 디렉토리 생성, DB 테이블 생성

- [ ] **Step 5: seed.ts 작성**

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminHash = await bcrypt.hash('admin1234', 10)
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', passwordHash: adminHash },
  })

  const equipment = [
    { name: 'Sony FX3 시네마 카메라', category: '카메라', totalQuantity: 3, description: '풀프레임 시네마 카메라' },
    { name: 'Sony A7IV 미러리스', category: '카메라', totalQuantity: 5, description: '4K 미러리스 카메라' },
    { name: 'DJI RS3 짐벌', category: '카메라', totalQuantity: 4, description: '3축 카메라 짐벌' },
    { name: 'Aputure 120D 조명', category: '조명', totalQuantity: 6, description: '120W LED 조명' },
    { name: 'Godox SL200II 조명', category: '조명', totalQuantity: 4, description: '200W 스튜디오 조명' },
    { name: '소프트박스 세트', category: '조명', totalQuantity: 8, description: '60x90cm 소프트박스' },
    { name: 'Rode NTG5 샷건 마이크', category: '음향', totalQuantity: 4, description: '방송용 샷건 마이크' },
    { name: 'Zoom H6 레코더', category: '음향', totalQuantity: 3, description: '6채널 휴대용 레코더' },
    { name: '삼발이(트라이포드)', category: '기타', totalQuantity: 10, description: '카메라 삼발이 75mm' },
    { name: 'ND 필터 세트', category: '기타', totalQuantity: 6, description: 'ND4/8/16/32 세트' },
  ]

  for (const item of equipment) {
    await prisma.equipment.upsert({
      where: { id: equipment.indexOf(item) + 1 },
      update: {},
      create: item,
    })
  }

  console.log('Seed complete. Admin: admin / admin1234')
}

main().finally(() => prisma.$disconnect())
```

- [ ] **Step 6: package.json에 seed 설정 추가**

`package.json`에 추가:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

그리고 ts-node 설치:
```bash
npm install -D ts-node
```

- [ ] **Step 7: Seed 실행**

```bash
npx prisma db seed
```

Expected: `Seed complete. Admin: admin / admin1234`

- [ ] **Step 8: src/lib/prisma.ts 작성**

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema, migration, and seed data"
```

---

## Task 3: TypeScript 타입 + lib/password.ts + 테스트

**Files:**
- Create: `src/types/index.ts`, `src/lib/password.ts`, `src/lib/__tests__/password.test.ts`

- [ ] **Step 1: src/types/index.ts 작성**

```typescript
// src/types/index.ts
export type EquipmentStatus = 'active' | 'inactive'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'returned'

export interface EquipmentWithStats {
  id: number
  name: string
  category: string
  description: string | null
  imageUrl: string | null
  totalQuantity: number
  status: EquipmentStatus
  rentedQuantity: number
  availableQuantity: number
  createdAt: Date
}

export interface RentalRequestDetail {
  id: number
  requestNumber: string
  applicantName: string
  studentId: string
  phone: string
  equipmentId: number
  equipmentName: string
  quantity: number
  startAt: Date
  endAt: Date
  purpose: string | null
  status: RequestStatus
  adminNote: string | null
  returnedAt: Date | null
  createdAt: Date
}
```

- [ ] **Step 2: password.ts 실패 테스트 작성**

```typescript
// src/lib/__tests__/password.test.ts
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../password'

describe('hashPassword', () => {
  it('returns a bcrypt hash string', async () => {
    const hash = await hashPassword('test1234')
    expect(hash).toMatch(/^\$2[ab]\$/)
    expect(hash).not.toBe('test1234')
  })

  it('produces different hashes for the same input', async () => {
    const h1 = await hashPassword('test1234')
    const h2 = await hashPassword('test1234')
    expect(h1).not.toBe(h2)
  })
})

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('correct')
    expect(await verifyPassword('correct', hash)).toBe(true)
  })

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correct')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

```bash
npm test src/lib/__tests__/password.test.ts
```

Expected: FAIL with "Cannot find module '../password'"

- [ ] **Step 4: src/lib/password.ts 구현**

```typescript
// src/lib/password.ts
import bcrypt from 'bcryptjs'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
npm test src/lib/__tests__/password.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/lib/password.ts src/lib/__tests__/password.test.ts
git commit -m "feat: add shared types and password utility"
```

---

## Task 4: lib/rental.ts + 테스트

**Files:**
- Create: `src/lib/rental.ts`, `src/lib/__tests__/rental.test.ts`

- [ ] **Step 1: rental.test.ts 실패 테스트 작성**

```typescript
// src/lib/__tests__/rental.test.ts
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

const mockPrisma = {
  rentalRequest: {
    aggregate: vi.fn(),
  },
  equipment: {
    findUnique: vi.fn(),
  },
}

describe('getAvailableQuantity', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns totalQuantity minus overlapping approved quantity', async () => {
    mockPrisma.equipment.findUnique.mockResolvedValue({ id: 1, totalQuantity: 5, status: 'active' })
    mockPrisma.rentalRequest.aggregate.mockResolvedValue({ _sum: { quantity: 2 } })

    const result = await getAvailableQuantity(
      1,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
      mockPrisma as any
    )
    expect(result).toBe(3)
  })

  it('returns totalQuantity when no overlapping requests', async () => {
    mockPrisma.equipment.findUnique.mockResolvedValue({ id: 1, totalQuantity: 5, status: 'active' })
    mockPrisma.rentalRequest.aggregate.mockResolvedValue({ _sum: { quantity: null } })

    const result = await getAvailableQuantity(
      1,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
      mockPrisma as any
    )
    expect(result).toBe(5)
  })
})

describe('checkAvailability', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns true when enough quantity available', async () => {
    mockPrisma.equipment.findUnique.mockResolvedValue({ id: 1, totalQuantity: 5, status: 'active' })
    mockPrisma.rentalRequest.aggregate.mockResolvedValue({ _sum: { quantity: 2 } })

    const result = await checkAvailability(
      1, 3,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
      mockPrisma as any
    )
    expect(result).toBe(true)
  })

  it('returns false when quantity exceeds availability', async () => {
    mockPrisma.equipment.findUnique.mockResolvedValue({ id: 1, totalQuantity: 5, status: 'active' })
    mockPrisma.rentalRequest.aggregate.mockResolvedValue({ _sum: { quantity: 3 } })

    const result = await checkAvailability(
      1, 3,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
      mockPrisma as any
    )
    expect(result).toBe(false)
  })

  it('returns false when equipment is inactive', async () => {
    mockPrisma.equipment.findUnique.mockResolvedValue({ id: 1, totalQuantity: 5, status: 'inactive' })

    const result = await checkAvailability(
      1, 1,
      new Date('2026-05-21T09:00:00Z'),
      new Date('2026-05-21T18:00:00Z'),
      mockPrisma as any
    )
    expect(result).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npm test src/lib/__tests__/rental.test.ts
```

Expected: FAIL with "Cannot find module '../rental'"

- [ ] **Step 3: src/lib/rental.ts 구현**

```typescript
// src/lib/rental.ts
import { format } from 'date-fns'
import type { PrismaClient } from '@prisma/client'

export function generateRequestNumber(date: Date, id: number): string {
  const dateStr = format(date, 'yyyyMMdd')
  return `REQ-${dateStr}-${String(id).padStart(4, '0')}`
}

export async function getAvailableQuantity(
  equipmentId: number,
  startAt: Date,
  endAt: Date,
  prismaClient: Pick<PrismaClient, 'equipment' | 'rentalRequest'>
): Promise<number> {
  const equipment = await (prismaClient.equipment as any).findUnique({
    where: { id: equipmentId },
    select: { totalQuantity: true, status: true },
  })
  if (!equipment || equipment.status !== 'active') return 0

  const result = await (prismaClient.rentalRequest as any).aggregate({
    where: {
      equipmentId,
      status: 'approved',
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    _sum: { quantity: true },
  })
  const used = result._sum.quantity ?? 0
  return equipment.totalQuantity - used
}

export async function checkAvailability(
  equipmentId: number,
  requestedQuantity: number,
  startAt: Date,
  endAt: Date,
  prismaClient: Pick<PrismaClient, 'equipment' | 'rentalRequest'>
): Promise<boolean> {
  const available = await getAvailableQuantity(equipmentId, startAt, endAt, prismaClient)
  return available >= requestedQuantity
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npm test src/lib/__tests__/rental.test.ts
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/rental.ts src/lib/__tests__/rental.test.ts
git commit -m "feat: add rental availability logic with tests"
```

---

## Task 5: lib/rate-limit.ts + 테스트

**Files:**
- Create: `src/lib/rate-limit.ts`, `src/lib/__tests__/rate-limit.test.ts`

- [ ] **Step 1: rate-limit.test.ts 작성**

```typescript
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
    const result = await checkRateLimit('key:abc', mockPrisma as any)
    expect(result.allowed).toBe(true)
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
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npm test src/lib/__tests__/rate-limit.test.ts
```

Expected: FAIL

- [ ] **Step 3: src/lib/rate-limit.ts 구현**

```typescript
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
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test src/lib/__tests__/rate-limit.test.ts
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/rate-limit.ts src/lib/__tests__/rate-limit.test.ts
git commit -m "feat: add rate limiting utility with tests"
```

---

## Task 6: NextAuth 설정 + Middleware

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `middleware.ts`

- [ ] **Step 1: src/lib/auth.ts 작성**

```typescript
// src/lib/auth.ts
import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        const admin = await prisma.admin.findUnique({
          where: { username: credentials.username },
        })
        if (!admin) return null
        const valid = await verifyPassword(credentials.password, admin.passwordHash)
        if (!valid) return null
        return { id: String(admin.id), name: admin.username }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin' },
  secret: process.env.NEXTAUTH_SECRET,
}
```

- [ ] **Step 2: API route 작성**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

- [ ] **Step 3: middleware.ts 작성**

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware'

export default withAuth({ pages: { signIn: '/admin' } })

export const config = {
  matcher: [
    '/admin/dashboard/:path*',
    '/admin/requests/:path*',
    '/admin/equipment/:path*',
    '/admin/history/:path*',
  ],
}
```

- [ ] **Step 4: 동작 확인**

`npm run dev` 후 `http://localhost:3000/admin/dashboard` 접근 시 `/admin`으로 리다이렉트 확인.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth middleware.ts
git commit -m "feat: add NextAuth credentials auth and admin middleware"
```

---

## Task 7: 가용 수량 API Route

**Files:**
- Create: `src/app/api/equipment/[id]/availability/route.ts`

- [ ] **Step 1: route.ts 작성**

```typescript
// src/app/api/equipment/[id]/availability/route.ts
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
```

- [ ] **Step 2: 동작 확인**

```bash
curl "http://localhost:3000/api/equipment/1/availability?startAt=2026-05-21T09:00:00&endAt=2026-05-21T18:00:00"
```

Expected: `{"available": 3}` (seed 데이터 기준)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/equipment
git commit -m "feat: add availability check API route"
```

---

## Task 8: Server Actions — 학생용

**Files:**
- Create: `src/app/actions/rental.ts`

- [ ] **Step 1: src/app/actions/rental.ts 작성**

```typescript
// src/app/actions/rental.ts
'use server'

import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/password'
import { checkAvailability, generateRequestNumber } from '@/lib/rental'
import { checkRateLimit, recordFailedAttempt, resetAttempts } from '@/lib/rate-limit'

export type CreateRequestResult =
  | { success: true; requestNumber: string }
  | { success: false; error: string }

export async function createRentalRequest(formData: FormData): Promise<CreateRequestResult> {
  const equipmentId = parseInt(formData.get('equipmentId') as string)
  const quantity = parseInt(formData.get('quantity') as string)
  const startAt = new Date(formData.get('startAt') as string)
  const endAt = new Date(formData.get('endAt') as string)
  const applicantName = (formData.get('applicantName') as string).trim()
  const studentId = (formData.get('studentId') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const password = (formData.get('password') as string)
  const purpose = (formData.get('purpose') as string | null)?.trim() || null

  if (!applicantName || !studentId || !phone || !password) {
    return { success: false, error: '필수 항목을 모두 입력해주세요.' }
  }
  if (password.length < 4 || password.length > 8) {
    return { success: false, error: '비밀번호는 4~8자리여야 합니다.' }
  }
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || startAt >= endAt) {
    return { success: false, error: '대여 기간이 올바르지 않습니다.' }
  }
  if (quantity < 1) {
    return { success: false, error: '수량은 1 이상이어야 합니다.' }
  }

  const available = await checkAvailability(equipmentId, quantity, startAt, endAt, prisma)
  if (!available) {
    return { success: false, error: '선택한 기간에 해당 수량을 대여할 수 없습니다.' }
  }

  const passwordHash = await hashPassword(password)

  const request = await prisma.rentalRequest.create({
    data: {
      requestNumber: `TEMP-${Date.now()}`,
      passwordHash,
      applicantName,
      studentId,
      phone,
      equipmentId,
      quantity,
      startAt,
      endAt,
      purpose,
    },
  })

  const requestNumber = generateRequestNumber(new Date(), request.id)
  await prisma.rentalRequest.update({
    where: { id: request.id },
    data: { requestNumber },
  })

  return { success: true, requestNumber }
}

export type LookupResult =
  | {
      success: true
      data: {
        requestNumber: string
        status: string
        equipmentName: string
        quantity: number
        startAt: Date
        endAt: Date
        adminNote: string | null
        createdAt: Date
      }
    }
  | { success: false; error: string; remainingAttempts?: number }

export async function lookupRequest(formData: FormData): Promise<LookupResult> {
  const requestNumber = (formData.get('requestNumber') as string).trim().toUpperCase()
  const password = formData.get('password') as string

  const rateLimitKey = `status:${requestNumber}`
  const { allowed, remainingAttempts } = await checkRateLimit(rateLimitKey, prisma)
  if (!allowed) {
    return { success: false, error: '시도 횟수 초과로 10분간 잠겼습니다.' }
  }

  const request = await prisma.rentalRequest.findUnique({
    where: { requestNumber },
    include: { equipment: { select: { name: true } } },
  })

  if (!request) {
    await recordFailedAttempt(rateLimitKey, prisma)
    return {
      success: false,
      error: '신청 내역을 찾을 수 없습니다.',
      remainingAttempts: remainingAttempts - 1,
    }
  }

  const valid = await verifyPassword(password, request.passwordHash)
  if (!valid) {
    await recordFailedAttempt(rateLimitKey, prisma)
    return {
      success: false,
      error: '비밀번호가 올바르지 않습니다.',
      remainingAttempts: remainingAttempts - 1,
    }
  }

  await resetAttempts(rateLimitKey, prisma)

  return {
    success: true,
    data: {
      requestNumber: request.requestNumber,
      status: request.status,
      equipmentName: request.equipment.name,
      quantity: request.quantity,
      startAt: request.startAt,
      endAt: request.endAt,
      adminNote: request.adminNote,
      createdAt: request.createdAt,
    },
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/rental.ts
git commit -m "feat: add student rental server actions"
```

---

## Task 9: Server Actions — 관리자용

**Files:**
- Create: `src/app/actions/admin.ts`

- [ ] **Step 1: src/app/actions/admin.ts 작성**

```typescript
// src/app/actions/admin.ts
'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
}

export async function approveRequest(id: number, note?: string) {
  await requireAdmin()
  await prisma.rentalRequest.update({
    where: { id, status: 'pending' },
    data: { status: 'approved', adminNote: note || null },
  })
  revalidatePath('/admin/requests')
}

export async function rejectRequest(id: number, note: string) {
  await requireAdmin()
  await prisma.rentalRequest.update({
    where: { id, status: 'pending' },
    data: { status: 'rejected', adminNote: note },
  })
  revalidatePath('/admin/requests')
}

export async function markReturned(id: number) {
  await requireAdmin()
  await prisma.rentalRequest.update({
    where: { id, status: 'approved' },
    data: { status: 'returned', returnedAt: new Date() },
  })
  revalidatePath('/admin/requests')
  revalidatePath('/admin/dashboard')
}

export async function createEquipment(formData: FormData) {
  await requireAdmin()
  await prisma.equipment.create({
    data: {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      description: (formData.get('description') as string) || null,
      totalQuantity: parseInt(formData.get('totalQuantity') as string),
    },
  })
  revalidatePath('/admin/equipment')
}

export async function updateEquipment(id: number, formData: FormData) {
  await requireAdmin()
  await prisma.equipment.update({
    where: { id },
    data: {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      description: (formData.get('description') as string) || null,
      totalQuantity: parseInt(formData.get('totalQuantity') as string),
    },
  })
  revalidatePath('/admin/equipment')
}

export async function deactivateEquipment(id: number) {
  await requireAdmin()
  await prisma.equipment.update({
    where: { id },
    data: { status: 'inactive' },
  })
  revalidatePath('/admin/equipment')
}

export async function activateEquipment(id: number) {
  await requireAdmin()
  await prisma.equipment.update({
    where: { id },
    data: { status: 'active' },
  })
  revalidatePath('/admin/equipment')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/admin.ts
git commit -m "feat: add admin server actions"
```

---

## Task 10: 공개 페이지 — 레이아웃 + 기자재 목록

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Create: `src/components/equipment/EquipmentCard.tsx`, `src/app/page.tsx`

- [ ] **Step 1: src/app/layout.tsx 수정**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '영상콘텐츠과 기자재 대여',
  description: '영상콘텐츠과 기자재 대여 신청 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <header className="border-b bg-white sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="font-bold text-lg">📷 기자재 대여</a>
            <nav className="flex gap-4 text-sm">
              <a href="/" className="hover:underline">기자재 목록</a>
              <a href="/status" className="hover:underline">신청 조회</a>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: EquipmentCard.tsx 작성**

```tsx
// src/components/equipment/EquipmentCard.tsx
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  id: number
  name: string
  category: string
  description: string | null
  totalQuantity: number
  availableNow: number
}

export function EquipmentCard({ id, name, category, description, totalQuantity, availableNow }: Props) {
  const isAvailable = availableNow > 0
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{name}</CardTitle>
          <Badge variant={isAvailable ? 'default' : 'secondary'}>
            {category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <p className="text-sm mt-2">
          <span className="font-medium">대여 가능:</span>{' '}
          <span className={isAvailable ? 'text-green-600 font-bold' : 'text-red-500'}>
            {availableNow}
          </span>
          <span className="text-muted-foreground"> / {totalQuantity}개</span>
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild size="sm" className="w-full" disabled={!isAvailable}>
          <Link href={`/equipment/${id}`}>
            {isAvailable ? '상세 보기 / 신청' : '대여 불가'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
```

- [ ] **Step 3: src/app/page.tsx 작성**

```tsx
// src/app/page.tsx
import { prisma } from '@/lib/prisma'
import { EquipmentCard } from '@/components/equipment/EquipmentCard'

async function getEquipmentList(category?: string, search?: string) {
  const now = new Date()
  const equipments = await prisma.equipment.findMany({
    where: {
      status: 'active',
      ...(category ? { category } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    include: {
      requests: {
        where: {
          status: 'approved',
          startAt: { lte: now },
          endAt: { gte: now },
        },
        select: { quantity: true },
      },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  return equipments.map((eq) => ({
    ...eq,
    availableNow: eq.totalQuantity - eq.requests.reduce((s, r) => s + r.quantity, 0),
  }))
}

async function getCategories() {
  const result = await prisma.equipment.findMany({
    where: { status: 'active' },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  })
  return result.map((r) => r.category)
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { category?: string; search?: string }
}) {
  const [equipments, categories] = await Promise.all([
    getEquipmentList(searchParams.category, searchParams.search),
    getCategories(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">기자재 대여 목록</h1>

      {/* 검색 + 필터 */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input
          name="search"
          defaultValue={searchParams.search}
          placeholder="기자재 검색..."
          className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />
        <select
          name="category"
          defaultValue={searchParams.category ?? ''}
          className="border rounded px-3 py-1.5 text-sm"
          onChange={(e) => {
            const form = e.currentTarget.closest('form')
            form?.requestSubmit()
          }}
        >
          <option value="">전체 카테고리</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="submit" className="bg-primary text-primary-foreground px-4 py-1.5 rounded text-sm">
          검색
        </button>
      </form>

      {/* 기자재 그리드 */}
      {equipments.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">기자재가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipments.map((eq) => (
            <EquipmentCard key={eq.id} {...eq} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 브라우저에서 확인**

`npm run dev` 후 `http://localhost:3000` — 기자재 목록 10개 표시 확인

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx src/components/equipment/EquipmentCard.tsx
git commit -m "feat: add public equipment list page"
```

---

## Task 11: 기자재 상세 페이지

**Files:**
- Create: `src/components/equipment/AvailabilityChecker.tsx`, `src/app/equipment/[id]/page.tsx`

- [ ] **Step 1: AvailabilityChecker.tsx 작성**

```tsx
// src/components/equipment/AvailabilityChecker.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  equipmentId: number
  totalQuantity: number
}

export function AvailabilityChecker({ equipmentId, totalQuantity }: Props) {
  const router = useRouter()
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [available, setAvailable] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  async function check() {
    if (!startAt || !endAt) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/equipment/${equipmentId}/availability?startAt=${encodeURIComponent(startAt)}&endAt=${encodeURIComponent(endAt)}`
      )
      const data = await res.json()
      setAvailable(data.available)
    } finally {
      setLoading(false)
    }
  }

  function goApply() {
    const params = new URLSearchParams({ equipmentId: String(equipmentId), startAt, endAt })
    router.push(`/apply?${params}`)
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-slate-50">
      <h3 className="font-semibold">대여 기간 선택</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>대여 시작</Label>
          <Input type="datetime-local" value={startAt} onChange={(e) => { setStartAt(e.target.value); setAvailable(null) }} />
        </div>
        <div>
          <Label>반납 예정</Label>
          <Input type="datetime-local" value={endAt} onChange={(e) => { setEndAt(e.target.value); setAvailable(null) }} />
        </div>
      </div>
      <Button variant="outline" onClick={check} disabled={!startAt || !endAt || loading} className="w-full">
        {loading ? '확인 중...' : '재고 확인'}
      </Button>
      {available !== null && (
        <div className={`text-sm font-medium ${available > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {available > 0
            ? `${available}개 대여 가능 (전체 ${totalQuantity}개)`
            : '해당 기간에 대여 가능한 수량이 없습니다.'}
        </div>
      )}
      {available !== null && available > 0 && (
        <Button onClick={goApply} className="w-full">이 기간으로 신청하기</Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: equipment/[id]/page.tsx 작성**

```tsx
// src/app/equipment/[id]/page.tsx
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AvailabilityChecker } from '@/components/equipment/AvailabilityChecker'

export default async function EquipmentDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const equipment = await prisma.equipment.findUnique({ where: { id, status: 'active' } })
  if (!equipment) notFound()

  return (
    <div className="max-w-2xl">
      <div className="mb-2 text-sm text-muted-foreground">
        <a href="/">목록</a> &rsaquo; {equipment.name}
      </div>
      <h1 className="text-2xl font-bold mb-1">{equipment.name}</h1>
      <p className="text-sm text-muted-foreground mb-4">{equipment.category} · 총 {equipment.totalQuantity}개 보유</p>
      {equipment.description && <p className="mb-6">{equipment.description}</p>}
      <AvailabilityChecker equipmentId={equipment.id} totalQuantity={equipment.totalQuantity} />
    </div>
  )
}
```

- [ ] **Step 3: 브라우저에서 확인**

`http://localhost:3000/equipment/1` — 날짜 선택 후 "재고 확인" 클릭 시 수량 표시 확인

- [ ] **Step 4: Commit**

```bash
git add src/app/equipment src/components/equipment/AvailabilityChecker.tsx
git commit -m "feat: add equipment detail page with availability checker"
```

---

## Task 12: 대여 신청 페이지

**Files:**
- Create: `src/components/rental/RentalForm.tsx`, `src/app/apply/page.tsx`

- [ ] **Step 1: RentalForm.tsx 작성**

```tsx
// src/components/rental/RentalForm.tsx
'use client'

import { useTransition, useState } from 'react'
import { createRentalRequest } from '@/app/actions/rental'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  equipmentId: number
  equipmentName: string
  defaultStartAt?: string
  defaultEndAt?: string
  maxQuantity: number
}

export function RentalForm({ equipmentId, equipmentName, defaultStartAt, defaultEndAt, maxQuantity }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    formData.set('equipmentId', String(equipmentId))
    setError(null)
    startTransition(async () => {
      const result = await createRentalRequest(formData)
      if (result.success) {
        setRequestNumber(result.requestNumber)
      } else {
        setError(result.error)
      }
    })
  }

  if (requestNumber) {
    return (
      <div className="border rounded-lg p-6 bg-green-50 text-center space-y-3">
        <div className="text-green-600 text-4xl">✓</div>
        <h2 className="text-xl font-bold">신청이 완료되었습니다</h2>
        <div className="bg-white border rounded p-3">
          <p className="text-sm text-muted-foreground">신청 번호</p>
          <p className="text-2xl font-mono font-bold text-primary">{requestNumber}</p>
        </div>
        <p className="text-sm text-red-600 font-medium">⚠️ 이 번호를 반드시 메모하세요. 조회 시 필요합니다.</p>
        <div className="flex gap-2 justify-center mt-4">
          <Button variant="outline" asChild><a href="/">목록으로</a></Button>
          <Button asChild><a href="/status">신청 조회</a></Button>
        </div>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="bg-slate-50 rounded p-3 text-sm">
        <span className="font-medium">신청 기자재:</span> {equipmentName}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="applicantName">이름 *</Label>
          <Input id="applicantName" name="applicantName" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="studentId">학번 *</Label>
          <Input id="studentId" name="studentId" required />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="phone">연락처 *</Label>
        <Input id="phone" name="phone" type="tel" placeholder="010-0000-0000" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="startAt">대여 시작 *</Label>
          <Input id="startAt" name="startAt" type="datetime-local" defaultValue={defaultStartAt} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="endAt">반납 예정 *</Label>
          <Input id="endAt" name="endAt" type="datetime-local" defaultValue={defaultEndAt} required />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="quantity">수량 * (최대 {maxQuantity}개)</Label>
        <Input id="quantity" name="quantity" type="number" min={1} max={maxQuantity} defaultValue={1} required />
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">조회용 비밀번호 * (4~8자리)</Label>
        <Input id="password" name="password" type="password" minLength={4} maxLength={8} required />
        <p className="text-xs text-muted-foreground">신청 후 조회 시 사용합니다. 잊어버리면 복구 불가.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="purpose">사용 목적 (선택)</Label>
        <Textarea id="purpose" name="purpose" rows={2} />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? '신청 중...' : '대여 신청하기'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: src/app/apply/page.tsx 작성**

```tsx
// src/app/apply/page.tsx
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { RentalForm } from '@/components/rental/RentalForm'

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: { equipmentId?: string; startAt?: string; endAt?: string }
}) {
  const id = parseInt(searchParams.equipmentId ?? '')
  if (isNaN(id)) notFound()

  const equipment = await prisma.equipment.findUnique({ where: { id, status: 'active' } })
  if (!equipment) notFound()

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">대여 신청</h1>
      <RentalForm
        equipmentId={equipment.id}
        equipmentName={equipment.name}
        defaultStartAt={searchParams.startAt}
        defaultEndAt={searchParams.endAt}
        maxQuantity={equipment.totalQuantity}
      />
    </div>
  )
}
```

- [ ] **Step 3: 브라우저에서 확인**

`http://localhost:3000/apply?equipmentId=1` — 폼 작성 후 제출 시 신청번호 발급 화면 표시 확인

- [ ] **Step 4: Commit**

```bash
git add src/app/apply src/components/rental/RentalForm.tsx
git commit -m "feat: add rental application form with success screen"
```

---

## Task 13: 신청 조회 페이지

**Files:**
- Create: `src/components/rental/StatusLookup.tsx`, `src/app/status/page.tsx`

- [ ] **Step 1: StatusLookup.tsx 작성**

```tsx
// src/components/rental/StatusLookup.tsx
'use client'

import { useState, useTransition } from 'react'
import { lookupRequest } from '@/app/actions/rental'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '승인 대기', variant: 'secondary' },
  approved: { label: '승인됨', variant: 'default' },
  rejected: { label: '거절됨', variant: 'destructive' },
  returned: { label: '반납 완료', variant: 'outline' },
}

export function StatusLookup() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    setResult(null)
    startTransition(async () => {
      const res = await lookupRequest(formData)
      if (res.success) {
        setResult(res.data)
      } else {
        setError(res.error + (res.remainingAttempts != null ? ` (남은 시도: ${res.remainingAttempts}회)` : ''))
      }
    })
  }

  const fmt = (d: Date) => format(new Date(d), 'yyyy.MM.dd HH:mm', { locale: ko })

  return (
    <div className="space-y-6">
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="requestNumber">신청 번호</Label>
          <Input id="requestNumber" name="requestNumber" placeholder="REQ-20260520-0001" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">조회용 비밀번호</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? '조회 중...' : '조회하기'}
        </Button>
      </form>

      {result && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-muted-foreground">{result.requestNumber}</span>
            <Badge variant={STATUS_LABELS[result.status]?.variant ?? 'secondary'}>
              {STATUS_LABELS[result.status]?.label ?? result.status}
            </Badge>
          </div>
          <div className="text-sm space-y-1">
            <p><span className="font-medium">기자재:</span> {result.equipmentName} × {result.quantity}개</p>
            <p><span className="font-medium">대여 기간:</span> {fmt(result.startAt)} ~ {fmt(result.endAt)}</p>
            <p><span className="font-medium">신청일:</span> {fmt(result.createdAt)}</p>
            {result.adminNote && (
              <p><span className="font-medium">관리자 메모:</span> {result.adminNote}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: src/app/status/page.tsx 작성**

```tsx
// src/app/status/page.tsx
import { StatusLookup } from '@/components/rental/StatusLookup'

export default function StatusPage() {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">신청 조회</h1>
      <StatusLookup />
    </div>
  )
}
```

- [ ] **Step 3: 브라우저에서 확인**

`http://localhost:3000/status` — 신청번호 + 비밀번호 입력 후 상태 조회 확인

- [ ] **Step 4: Commit**

```bash
git add src/app/status src/components/rental/StatusLookup.tsx
git commit -m "feat: add status lookup page with rate limit protection"
```

---

## Task 14: 관리자 레이아웃 + 로그인 페이지

**Files:**
- Create: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`

- [ ] **Step 1: admin/layout.tsx 작성**

```tsx
// src/app/admin/layout.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div className="max-w-sm mx-auto py-16">{children}</div>
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-48 border-r bg-slate-50 p-4 shrink-0">
        <p className="font-bold mb-6 text-sm">관리자 메뉴</p>
        <nav className="space-y-1 text-sm">
          {[
            { href: '/admin/dashboard', label: '대시보드' },
            { href: '/admin/requests', label: '신청 관리' },
            { href: '/admin/equipment', label: '기자재 관리' },
            { href: '/admin/history', label: '대여 이력' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="block px-3 py-2 rounded hover:bg-slate-200">
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 pt-4 border-t">
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="text-xs text-muted-foreground hover:underline">
              로그아웃
            </button>
          </form>
        </div>
      </aside>
      <div className="flex-1 p-8">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: admin/page.tsx (로그인) 작성**

```tsx
// src/app/admin/page.tsx
'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AdminLoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      username: formData.get('username'),
      password: formData.get('password'),
      redirect: false,
    })
    if (result?.error) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
    } else {
      window.location.href = '/admin/dashboard'
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-center">관리자 로그인</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label>아이디</Label>
          <Input name="username" required />
        </div>
        <div className="space-y-1">
          <Label>비밀번호</Label>
          <Input name="password" type="password" required />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: SessionProvider 추가 (admin/page.tsx의 signIn 사용을 위해)**

`src/app/admin/layout.tsx`에서 `'next-auth/react'`의 `SessionProvider`가 필요합니다. `admin/layout.tsx`를 아래와 같이 수정:

```tsx
// src/app/admin/layout.tsx 상단에 추가
'use client' 로 바꾸지 않고, 별도 Client Component wrapper 생성:
```

`src/components/admin/SessionProviderWrapper.tsx` 생성:

```tsx
// src/components/admin/SessionProviderWrapper.tsx
'use client'
import { SessionProvider } from 'next-auth/react'
export function SessionProviderWrapper({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

`src/app/layout.tsx`에서 import하여 `<body>` 감싸기:

```tsx
// src/app/layout.tsx body 내부
import { SessionProviderWrapper } from '@/components/admin/SessionProviderWrapper'
// ...
<body className={inter.className}>
  <SessionProviderWrapper>
    <header>...</header>
    <main>...</main>
  </SessionProviderWrapper>
</body>
```

- [ ] **Step 4: 브라우저에서 확인**

`http://localhost:3000/admin` → 로그인 폼 표시, `admin` / `admin1234`로 로그인 → `/admin/dashboard` 리다이렉트 확인

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/layout.tsx src/app/admin/page.tsx src/components/admin/SessionProviderWrapper.tsx
git commit -m "feat: add admin login and layout with sidebar nav"
```

---

## Task 15: 관리자 대시보드

**Files:**
- Create: `src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: dashboard/page.tsx 작성**

```tsx
// src/app/admin/dashboard/page.tsx
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default async function DashboardPage() {
  const now = new Date()

  const [pendingCount, activeRentals, dueSoon, equipmentStats] = await Promise.all([
    prisma.rentalRequest.count({ where: { status: 'pending' } }),
    prisma.rentalRequest.count({
      where: { status: 'approved', startAt: { lte: now }, endAt: { gte: now } },
    }),
    prisma.rentalRequest.findMany({
      where: {
        status: 'approved',
        endAt: { gte: now, lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
      },
      include: { equipment: { select: { name: true } } },
      orderBy: { endAt: 'asc' },
    }),
    prisma.equipment.findMany({
      where: { status: 'active' },
      include: {
        requests: {
          where: { status: 'approved', startAt: { lte: now }, endAt: { gte: now } },
          select: { quantity: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  const stats = equipmentStats.map((eq) => ({
    ...eq,
    rentedNow: eq.requests.reduce((s, r) => s + r.quantity, 0),
    availableNow: eq.totalQuantity - eq.requests.reduce((s, r) => s + r.quantity, 0),
  }))

  const fmt = (d: Date) => format(d, 'MM/dd HH:mm', { locale: ko })
  const diffDays = (d: Date) => Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">대시보드</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">승인 대기</p>
          <p className="text-3xl font-bold text-orange-500">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">건</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">현재 대여 중</p>
          <p className="text-3xl font-bold text-blue-600">{activeRentals}</p>
          <p className="text-xs text-muted-foreground">건</p>
        </div>
      </div>

      {/* 반납 예정 */}
      {dueSoon.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">반납 예정 (3일 이내)</h2>
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3">기자재</th>
                  <th className="text-left p-3">신청자</th>
                  <th className="text-left p-3">반납 예정</th>
                  <th className="text-left p-3">D-Day</th>
                </tr>
              </thead>
              <tbody>
                {dueSoon.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">{r.equipment.name}</td>
                    <td className="p-3">{r.applicantName}</td>
                    <td className="p-3">{fmt(r.endAt)}</td>
                    <td className="p-3 font-medium text-red-500">D-{diffDays(r.endAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 기자재별 수량 현황 */}
      <div>
        <h2 className="font-semibold mb-3">기자재 수량 현황</h2>
        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">기자재명</th>
                <th className="text-left p-3">카테고리</th>
                <th className="text-center p-3">전체</th>
                <th className="text-center p-3">대여 중</th>
                <th className="text-center p-3">대여 가능</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((eq) => (
                <tr key={eq.id} className="border-t">
                  <td className="p-3">{eq.name}</td>
                  <td className="p-3 text-muted-foreground">{eq.category}</td>
                  <td className="p-3 text-center">{eq.totalQuantity}</td>
                  <td className="p-3 text-center text-blue-600">{eq.rentedNow}</td>
                  <td className={`p-3 text-center font-medium ${eq.availableNow > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {eq.availableNow}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 확인**

`http://localhost:3000/admin/dashboard` — 요약 카드, 반납 예정 목록, 수량 현황 테이블 표시 확인

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/dashboard
git commit -m "feat: add admin dashboard with stats and quantity overview"
```

---

## Task 16: 관리자 신청 관리 페이지

**Files:**
- Create: `src/components/admin/ActionModal.tsx`, `src/app/admin/requests/page.tsx`

- [ ] **Step 1: ActionModal.tsx 작성**

```tsx
// src/components/admin/ActionModal.tsx
'use client'

import { useState, useTransition } from 'react'
import { approveRequest, rejectRequest, markReturned } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Props {
  id: number
  status: string
  applicantName: string
  equipmentName: string
}

export function ActionButtons({ id, status, applicantName, equipmentName }: Props) {
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)
  const [note, setNote] = useState('')

  function handleApprove() {
    startTransition(async () => {
      await approveRequest(id, note)
      setModal(null)
    })
  }

  function handleReject() {
    startTransition(async () => {
      await rejectRequest(id, note)
      setModal(null)
    })
  }

  function handleReturn() {
    startTransition(async () => {
      await markReturned(id)
    })
  }

  if (status === 'pending') {
    return (
      <>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setModal('approve')}>승인</Button>
          <Button size="sm" variant="destructive" onClick={() => setModal('reject')}>거절</Button>
        </div>

        <Dialog open={modal === 'approve'} onOpenChange={() => setModal(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>승인</DialogTitle></DialogHeader>
            <p className="text-sm">{applicantName} — {equipmentName}</p>
            <div className="space-y-1">
              <Label>메모 (선택)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>취소</Button>
              <Button onClick={handleApprove} disabled={isPending}>승인 확정</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={modal === 'reject'} onOpenChange={() => setModal(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>거절</DialogTitle></DialogHeader>
            <p className="text-sm">{applicantName} — {equipmentName}</p>
            <div className="space-y-1">
              <Label>거절 사유 *</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} required />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>취소</Button>
              <Button variant="destructive" onClick={handleReject} disabled={isPending || !note.trim()}>
                거절 확정
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  if (status === 'approved') {
    return (
      <Button size="sm" variant="outline" onClick={handleReturn} disabled={isPending}>
        반납 완료
      </Button>
    )
  }

  return null
}
```

- [ ] **Step 2: admin/requests/page.tsx 작성**

```tsx
// src/app/admin/requests/page.tsx
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { ActionButtons } from '@/components/admin/ActionModal'

const STATUS_MAP: Record<string, { label: string; variant: any }> = {
  pending: { label: '대기', variant: 'secondary' },
  approved: { label: '승인', variant: 'default' },
  rejected: { label: '거절', variant: 'destructive' },
  returned: { label: '반납', variant: 'outline' },
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const statusFilter = searchParams.status && searchParams.status !== 'all'
    ? searchParams.status : undefined

  const requests = await prisma.rentalRequest.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    include: { equipment: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const fmt = (d: Date) => format(d, 'yy.MM.dd HH:mm', { locale: ko })
  const tabs = ['all', 'pending', 'approved', 'rejected', 'returned']
  const tabLabels: Record<string, string> = {
    all: '전체', pending: '대기', approved: '승인', rejected: '거절', returned: '반납완료'
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">신청 관리</h1>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <a
            key={t}
            href={`/admin/requests?status=${t}`}
            className={`px-3 py-1 rounded text-sm border ${
              (searchParams.status ?? 'all') === t ? 'bg-primary text-primary-foreground' : 'hover:bg-slate-50'
            }`}
          >
            {tabLabels[t]}
          </a>
        ))}
      </div>

      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">신청번호</th>
              <th className="text-left p-3">신청자</th>
              <th className="text-left p-3">학번</th>
              <th className="text-left p-3">기자재</th>
              <th className="text-center p-3">수량</th>
              <th className="text-left p-3">기간</th>
              <th className="text-center p-3">상태</th>
              <th className="text-center p-3">처리</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan={8} className="text-center p-6 text-muted-foreground">신청 내역이 없습니다.</td></tr>
            ) : requests.map((r) => (
              <tr key={r.id} className="border-t hover:bg-slate-50">
                <td className="p-3 font-mono text-xs">{r.requestNumber}</td>
                <td className="p-3">{r.applicantName}</td>
                <td className="p-3">{r.studentId}</td>
                <td className="p-3">{r.equipment.name}</td>
                <td className="p-3 text-center">{r.quantity}</td>
                <td className="p-3 text-xs">{fmt(r.startAt)} ~<br />{fmt(r.endAt)}</td>
                <td className="p-3 text-center">
                  <Badge variant={STATUS_MAP[r.status]?.variant}>{STATUS_MAP[r.status]?.label}</Badge>
                </td>
                <td className="p-3 text-center">
                  <ActionButtons
                    id={r.id}
                    status={r.status}
                    applicantName={r.applicantName}
                    equipmentName={r.equipment.name}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 브라우저에서 확인**

`http://localhost:3000/admin/requests` — 신청 목록 표시, 승인/거절/반납 버튼 동작 확인

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/requests src/components/admin/ActionModal.tsx
git commit -m "feat: add admin requests management with approve/reject/return"
```

---

## Task 17: 관리자 기자재 관리 페이지

**Files:**
- Create: `src/components/admin/EquipmentForm.tsx`, `src/app/admin/equipment/page.tsx`

- [ ] **Step 1: EquipmentForm.tsx 작성**

```tsx
// src/components/admin/EquipmentForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { createEquipment, updateEquipment, deactivateEquipment, activateEquipment } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Equipment {
  id: number
  name: string
  category: string
  description: string | null
  totalQuantity: number
  status: string
  rentedNow: number
  availableNow: number
}

export function CreateEquipmentButton() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createEquipment(formData)
      setOpen(false)
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ 기자재 추가</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>기자재 추가</DialogTitle></DialogHeader>
          <form action={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>기자재명 *</Label>
              <Input name="name" required />
            </div>
            <div className="space-y-1">
              <Label>카테고리 *</Label>
              <Input name="category" placeholder="카메라, 조명, 음향, 기타" required />
            </div>
            <div className="space-y-1">
              <Label>설명</Label>
              <Textarea name="description" rows={2} />
            </div>
            <div className="space-y-1">
              <Label>총 수량 *</Label>
              <Input name="totalQuantity" type="number" min={1} defaultValue={1} required />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>취소</Button>
              <Button type="submit" disabled={isPending}>추가</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function EquipmentActions({ equipment }: { equipment: Equipment }) {
  const [editOpen, setEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      await updateEquipment(equipment.id, formData)
      setEditOpen(false)
    })
  }

  function handleToggle() {
    startTransition(async () => {
      if (equipment.status === 'active') {
        await deactivateEquipment(equipment.id)
      } else {
        await activateEquipment(equipment.id)
      }
    })
  }

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>수정</Button>
        <Button size="sm" variant={equipment.status === 'active' ? 'secondary' : 'default'} onClick={handleToggle} disabled={isPending}>
          {equipment.status === 'active' ? '비활성화' : '활성화'}
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>기자재 수정</DialogTitle></DialogHeader>
          <form action={handleUpdate} className="space-y-3">
            <div className="space-y-1">
              <Label>기자재명 *</Label>
              <Input name="name" defaultValue={equipment.name} required />
            </div>
            <div className="space-y-1">
              <Label>카테고리 *</Label>
              <Input name="category" defaultValue={equipment.category} required />
            </div>
            <div className="space-y-1">
              <Label>설명</Label>
              <Textarea name="description" defaultValue={equipment.description ?? ''} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>총 수량 *</Label>
              <Input name="totalQuantity" type="number" min={1} defaultValue={equipment.totalQuantity} required />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>취소</Button>
              <Button type="submit" disabled={isPending}>저장</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 2: admin/equipment/page.tsx 작성**

```tsx
// src/app/admin/equipment/page.tsx
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { CreateEquipmentButton, EquipmentActions } from '@/components/admin/EquipmentForm'

export default async function AdminEquipmentPage() {
  const now = new Date()
  const equipments = await prisma.equipment.findMany({
    include: {
      requests: {
        where: { status: 'approved', startAt: { lte: now }, endAt: { gte: now } },
        select: { quantity: true },
      },
    },
    orderBy: [{ status: 'asc' }, { category: 'asc' }, { name: 'asc' }],
  })

  const stats = equipments.map((eq) => ({
    ...eq,
    rentedNow: eq.requests.reduce((s, r) => s + r.quantity, 0),
    availableNow: eq.totalQuantity - eq.requests.reduce((s, r) => s + r.quantity, 0),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">기자재 관리</h1>
        <CreateEquipmentButton />
      </div>

      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">기자재명</th>
              <th className="text-left p-3">카테고리</th>
              <th className="text-center p-3">전체</th>
              <th className="text-center p-3">대여 중</th>
              <th className="text-center p-3">대여 가능</th>
              <th className="text-center p-3">상태</th>
              <th className="text-center p-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((eq) => (
              <tr key={eq.id} className="border-t hover:bg-slate-50">
                <td className="p-3">{eq.name}</td>
                <td className="p-3 text-muted-foreground">{eq.category}</td>
                <td className="p-3 text-center">{eq.totalQuantity}</td>
                <td className="p-3 text-center text-blue-600">{eq.rentedNow}</td>
                <td className={`p-3 text-center font-medium ${eq.availableNow > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {eq.availableNow}
                </td>
                <td className="p-3 text-center">
                  <Badge variant={eq.status === 'active' ? 'default' : 'secondary'}>
                    {eq.status === 'active' ? '활성' : '비활성'}
                  </Badge>
                </td>
                <td className="p-3 text-center">
                  <EquipmentActions equipment={eq} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 브라우저에서 확인**

`http://localhost:3000/admin/equipment` — 기자재 목록, 수량 현황, 추가/수정/비활성화 동작 확인

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/equipment src/components/admin/EquipmentForm.tsx
git commit -m "feat: add admin equipment management with CRUD"
```

---

## Task 18: 관리자 대여 이력 페이지

**Files:**
- Create: `src/app/admin/history/page.tsx`

- [ ] **Step 1: admin/history/page.tsx 작성**

```tsx
// src/app/admin/history/page.tsx
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'

const STATUS_MAP: Record<string, { label: string; variant: any }> = {
  pending: { label: '대기', variant: 'secondary' },
  approved: { label: '승인', variant: 'default' },
  rejected: { label: '거절', variant: 'destructive' },
  returned: { label: '반납', variant: 'outline' },
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { q?: string; equipment?: string; from?: string; to?: string }
}) {
  const equipmentList = await prisma.equipment.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const requests = await prisma.rentalRequest.findMany({
    where: {
      ...(searchParams.q
        ? {
            OR: [
              { applicantName: { contains: searchParams.q, mode: 'insensitive' } },
              { studentId: { contains: searchParams.q, mode: 'insensitive' } },
              { requestNumber: { contains: searchParams.q.toUpperCase() } },
            ],
          }
        : {}),
      ...(searchParams.equipment ? { equipmentId: parseInt(searchParams.equipment) } : {}),
      ...(searchParams.from ? { createdAt: { gte: new Date(searchParams.from) } } : {}),
      ...(searchParams.to ? { createdAt: { lte: new Date(searchParams.to + 'T23:59:59') } } : {}),
    },
    include: { equipment: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const fmt = (d: Date) => format(d, 'yy.MM.dd HH:mm', { locale: ko })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">대여 이력</h1>

      {/* 필터 */}
      <form className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="이름/학번/신청번호 검색"
          className="border rounded px-3 py-1.5 text-sm"
        />
        <select name="equipment" defaultValue={searchParams.equipment ?? ''} className="border rounded px-3 py-1.5 text-sm">
          <option value="">전체 기자재</option>
          {equipmentList.map((eq) => (
            <option key={eq.id} value={eq.id}>{eq.name}</option>
          ))}
        </select>
        <input name="from" type="date" defaultValue={searchParams.from} className="border rounded px-3 py-1.5 text-sm" />
        <span className="self-center text-muted-foreground text-sm">~</span>
        <input name="to" type="date" defaultValue={searchParams.to} className="border rounded px-3 py-1.5 text-sm" />
        <button type="submit" className="bg-primary text-primary-foreground px-4 py-1.5 rounded text-sm">
          검색
        </button>
        <a href="/admin/history" className="px-4 py-1.5 border rounded text-sm hover:bg-slate-50">초기화</a>
      </form>

      <p className="text-sm text-muted-foreground">총 {requests.length}건 (최대 200건)</p>

      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">신청번호</th>
              <th className="text-left p-3">신청자</th>
              <th className="text-left p-3">학번</th>
              <th className="text-left p-3">기자재</th>
              <th className="text-center p-3">수량</th>
              <th className="text-left p-3">대여 기간</th>
              <th className="text-center p-3">상태</th>
              <th className="text-left p-3">신청일</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan={8} className="text-center p-6 text-muted-foreground">이력이 없습니다.</td></tr>
            ) : requests.map((r) => (
              <tr key={r.id} className="border-t hover:bg-slate-50">
                <td className="p-3 font-mono text-xs">{r.requestNumber}</td>
                <td className="p-3">{r.applicantName}</td>
                <td className="p-3">{r.studentId}</td>
                <td className="p-3">{r.equipment.name}</td>
                <td className="p-3 text-center">{r.quantity}</td>
                <td className="p-3 text-xs">{fmt(r.startAt)} ~<br />{fmt(r.endAt)}</td>
                <td className="p-3 text-center">
                  <Badge variant={STATUS_MAP[r.status]?.variant}>{STATUS_MAP[r.status]?.label}</Badge>
                </td>
                <td className="p-3 text-xs">{fmt(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 확인**

`http://localhost:3000/admin/history` — 이력 목록, 검색 필터 동작 확인

- [ ] **Step 3: 전체 테스트 실행**

```bash
npm test
```

Expected: PASS (password 4개, rental 7개, rate-limit 7개 — 총 18개 이상)

- [ ] **Step 4: 최종 빌드 확인**

```bash
npm run build
```

Expected: 에러 없이 빌드 완료

- [ ] **Step 5: 최종 Commit**

```bash
git add src/app/admin/history
git commit -m "feat: add admin history page with search filters"
git tag v1.0.0
```

---

## Self-Review 체크리스트

**스펙 커버리지:**
- [x] `/` 기자재 목록 (카테고리 필터 + 검색) → Task 10
- [x] `/equipment/[id]` 상세 + 날짜별 가용 수량 → Task 11
- [x] `/apply` 대여 신청 (비밀번호 설정, 신청번호 발급) → Task 12
- [x] `/status` 신청 조회 (rate limit 5회/10분) → Task 13
- [x] `/admin` 로그인 → Task 14
- [x] `/admin/dashboard` 요약 + 기자재별 수량 현황 → Task 15
- [x] `/admin/requests` 승인/거절/반납 → Task 16
- [x] `/admin/equipment` CRUD + 수량 현황 → Task 17
- [x] `/admin/history` 이력 필터 → Task 18
- [x] 수량 검증 서버 사이드 → Task 8 (createRentalRequest)
- [x] bcrypt 해시 저장 → Task 3, 8
- [x] 미들웨어 /admin/* 보호 → Task 6

**타입 일관성:** `approveRequest`, `rejectRequest`, `markReturned`, `createEquipment`, `updateEquipment`, `deactivateEquipment`, `activateEquipment` 모두 Task 9에서 정의, Task 16-17에서 동일 이름 사용 확인.
