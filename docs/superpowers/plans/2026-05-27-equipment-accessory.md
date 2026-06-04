# 부속 기자재 선택 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기자재 단건 대여 신청(`/apply`) 시 관리자가 등록한 부속 기자재(배터리, 충전기 등)를 수량 지정해 함께 신청할 수 있는 시스템 구현

**Architecture:** `EquipmentAccessory`(부속 정의) + `RentalRequestAccessory`(신청 내 부속 선택) 두 개의 신규 Prisma 모델을 추가하고, 관리자 CRUD UI, API 엔드포인트, 신청 폼 통합, 조회 화면 표시를 순서대로 구현한다. 모든 재고 계산은 `approved` 상태 신청만 집계한다.

**Tech Stack:** Next.js 14 App Router, Prisma 7 + Neon PostgreSQL, TypeScript, Tailwind CSS, `date-fns`, `lucide-react`

---

## 파일 구조

### 신규 파일 (5개)
| 파일 | 역할 |
|---|---|
| `src/lib/accessory.ts` | `getAvailableAccessoryQuantity()` 유틸 |
| `src/app/api/equipment/[id]/accessories/route.ts` | GET /api/equipment/:id/accessories |
| `src/components/admin/EquipmentAccessoryManager.tsx` | 관리자 부속 CRUD 클라이언트 컴포넌트 |
| `src/app/admin/equipment/[id]/accessories/page.tsx` | 관리자 부속 관리 페이지 (서버 컴포넌트) |
| `src/components/rental/AccessorySelector.tsx` | 신청 폼용 부속 선택 클라이언트 컴포넌트 |

### 수정 파일 (6개)
| 파일 | 변경 내용 |
|---|---|
| `prisma/schema.prisma` | 모델 2개 추가, Equipment·RentalRequest에 관계 추가 |
| `src/app/actions/admin.ts` | `createEquipmentAccessory`, `deleteEquipmentAccessory` 추가 |
| `src/app/actions/rental.ts` | `createRentalRequest` 트랜잭션 전환 + 부속 검증, `lookupRequest` accessories 포함 |
| `src/components/rental/RentalForm.tsx` | `AccessorySelector` 통합 |
| `src/app/admin/equipment/page.tsx` | 각 기자재 행에 "부속 관리" 링크 추가 |
| `src/components/rental/StatusLookup.tsx` | 부속 선택 내역 표시 추가 |

---

## Task 1: Prisma 스키마 추가 + DB 반영

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 스키마에 모델 2개 추가 및 기존 모델에 관계 추가**

`prisma/schema.prisma`의 `Equipment` 모델에 아래 한 줄 추가:
```prisma
model Equipment {
  id            Int             @id @default(autoincrement())
  name          String
  category      String
  description   String?
  imageUrl      String?
  totalQuantity     Int
  minRentalQuantity Int          @default(1)
  maxRentalQuantity Int?
  status        String          @default("active")
  createdAt     DateTime        @default(now())
  requests      RentalRequest[]
  accessories   EquipmentAccessory[]   // ← 추가
}
```

`RentalRequest` 모델에 아래 한 줄 추가:
```prisma
model RentalRequest {
  id            Int       @id @default(autoincrement())
  requestNumber String    @unique
  groupNumber   String?
  passwordHash  String
  applicantName String
  studentId     String
  phone         String
  equipmentId   Int
  quantity      Int
  startAt       DateTime
  endAt         DateTime
  purpose       String?
  status        String    @default("pending")
  adminNote     String?
  returnedAt    DateTime?
  createdAt     DateTime  @default(now())
  equipment     Equipment @relation(fields: [equipmentId], references: [id])
  accessories   RentalRequestAccessory[]   // ← 추가
}
```

파일 끝(Admin 모델 앞)에 신규 모델 2개 추가:
```prisma
model EquipmentAccessory {
  id            Int                      @id @default(autoincrement())
  equipmentId   Int
  name          String
  description   String?
  totalQuantity Int
  status        String                   @default("active")
  createdAt     DateTime                 @default(now())
  equipment     Equipment                @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  rentalItems   RentalRequestAccessory[]
}

model RentalRequestAccessory {
  id              Int                @id @default(autoincrement())
  rentalRequestId Int
  accessoryId     Int
  quantity        Int
  rentalRequest   RentalRequest      @relation(fields: [rentalRequestId], references: [id], onDelete: Cascade)
  accessory       EquipmentAccessory @relation(fields: [accessoryId], references: [id], onDelete: Restrict)
}
```

- [ ] **Step 2: DB에 스키마 반영**

```bash
cd /Users/jin-eunbeom/.config/superpowers/worktrees/기자재\ 대여\ 시스템/feat-implement
npx prisma db push
```

Expected output: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Prisma Client 재생성**

```bash
npx prisma generate
```

Expected output: `✔ Generated Prisma Client`

- [ ] **Step 4: 빌드 타입 오류 없음 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 출력 없음 또는 기존 오류만 (새 오류 없어야 함)

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: Prisma 스키마에 EquipmentAccessory, RentalRequestAccessory 모델 추가"
```

---

## Task 2: `src/lib/accessory.ts` — 가용 수량 유틸

**Files:**
- Create: `src/lib/accessory.ts`

- [ ] **Step 1: 파일 생성**

```ts
// src/lib/accessory.ts
import { prisma } from './prisma'

/**
 * 주어진 기간에 대해 부속 기자재의 가용 수량을 반환한다.
 * approved 상태 신청의 겹치는 수량만 차감한다.
 * accessory가 없거나 inactive이면 0 반환.
 */
export async function getAvailableAccessoryQuantity(
  accessoryId: number,
  startAt: Date,
  endAt: Date,
): Promise<number> {
  const accessory = await prisma.equipmentAccessory.findUnique({
    where: { id: accessoryId },
    select: { totalQuantity: true, status: true },
  })
  if (!accessory || accessory.status !== 'active') return 0

  const result = await prisma.rentalRequestAccessory.aggregate({
    where: {
      accessoryId,
      rentalRequest: {
        status: 'approved',
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    },
    _sum: { quantity: true },
  })

  const used = result._sum.quantity ?? 0
  return Math.max(0, accessory.totalQuantity - used)
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
cd /Users/jin-eunbeom/.config/superpowers/worktrees/기자재\ 대여\ 시스템/feat-implement
npx tsc --noEmit 2>&1 | head -20
```

Expected: 새 오류 없음

- [ ] **Step 3: Commit**

```bash
git add src/lib/accessory.ts
git commit -m "feat: 부속 기자재 가용 수량 계산 유틸 추가"
```

---

## Task 3: API Route — `GET /api/equipment/[id]/accessories`

**Files:**
- Create: `src/app/api/equipment/[id]/accessories/route.ts`

- [ ] **Step 1: 디렉토리 및 파일 생성**

```ts
// src/app/api/equipment/[id]/accessories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAvailableAccessoryQuantity } from '@/lib/accessory'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const equipmentId = parseInt(params.id)
  if (isNaN(equipmentId)) {
    return NextResponse.json({ error: 'Invalid equipment id' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const startAtStr = searchParams.get('startAt')
  const endAtStr = searchParams.get('endAt')

  const startAt = startAtStr ? new Date(startAtStr) : null
  const endAt = endAtStr ? new Date(endAtStr) : null

  const hasValidDates =
    startAt && endAt &&
    !isNaN(startAt.getTime()) &&
    !isNaN(endAt.getTime()) &&
    startAt < endAt

  const accessories = await prisma.equipmentAccessory.findMany({
    where: { equipmentId, status: 'active' },
    select: { id: true, name: true, description: true, totalQuantity: true },
    orderBy: { id: 'asc' },
  })

  if (!accessories.length) {
    return NextResponse.json([])
  }

  const result = await Promise.all(
    accessories.map(async (acc) => {
      const available = hasValidDates
        ? await getAvailableAccessoryQuantity(acc.id, startAt!, endAt!)
        : acc.totalQuantity
      return {
        id: acc.id,
        name: acc.name,
        description: acc.description,
        totalQuantity: acc.totalQuantity,
        available,
      }
    }),
  )

  return NextResponse.json(result)
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd /Users/jin-eunbeom/.config/superpowers/worktrees/기자재\ 대여\ 시스템/feat-implement
npx tsc --noEmit 2>&1 | head -20
```

Expected: 새 오류 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/api/equipment/
git commit -m "feat: GET /api/equipment/[id]/accessories 엔드포인트 추가"
```

---

## Task 4: Admin 서버 액션 — `createEquipmentAccessory`, `deleteEquipmentAccessory`

**Files:**
- Modify: `src/app/actions/admin.ts`

- [ ] **Step 1: 타입 및 함수 추가**

`src/app/actions/admin.ts` 파일 끝(마지막 export 함수 바로 뒤)에 추가:

```ts
// ─── 부속 기자재 관리 ────────────────────────────────────────────────────────

export interface CreatedAccessoryEntry {
  id: number
  equipmentId: number
  name: string
  description: string | null
  totalQuantity: number
  status: string
  createdAt: string // ISO string
}

export type AccessoryResult =
  | { success: true; entry: CreatedAccessoryEntry }
  | { success: false; error: string }

export async function createEquipmentAccessory(
  formData: FormData,
): Promise<AccessoryResult> {
  await requireAdmin()

  const equipmentId = parseInt(formData.get('equipmentId') as string)
  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const totalQuantity = parseInt(formData.get('totalQuantity') as string)

  if (isNaN(equipmentId) || equipmentId < 1) {
    return { success: false, error: '기자재 정보가 올바르지 않습니다.' }
  }
  if (!name) {
    return { success: false, error: '부속 기자재 이름을 입력해주세요.' }
  }
  if (isNaN(totalQuantity) || totalQuantity < 1) {
    return { success: false, error: '총 수량은 1 이상이어야 합니다.' }
  }

  // 해당 equipmentId가 실재하는지 확인
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { id: true },
  })
  if (!equipment) {
    return { success: false, error: '해당 기자재를 찾을 수 없습니다.' }
  }

  const entry = await prisma.equipmentAccessory.create({
    data: { equipmentId, name, description, totalQuantity },
  })

  revalidatePath(`/admin/equipment/${equipmentId}/accessories`)

  return {
    success: true,
    entry: {
      id: entry.id,
      equipmentId: entry.equipmentId,
      name: entry.name,
      description: entry.description,
      totalQuantity: entry.totalQuantity,
      status: entry.status,
      createdAt: entry.createdAt.toISOString(),
    },
  }
}

export async function deleteEquipmentAccessory(id: number): Promise<void> {
  await requireAdmin()
  const entry = await prisma.equipmentAccessory.findUnique({
    where: { id },
    select: { equipmentId: true },
  })
  if (!entry) return
  // onDelete: Restrict — 대여 기록 있으면 DB 에러 발생 (호출자가 catch 해야 함)
  await prisma.equipmentAccessory.delete({ where: { id } })
  revalidatePath(`/admin/equipment/${entry.equipmentId}/accessories`)
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd /Users/jin-eunbeom/.config/superpowers/worktrees/기자재\ 대여\ 시스템/feat-implement
npx tsc --noEmit 2>&1 | head -20
```

Expected: 새 오류 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/admin.ts
git commit -m "feat: 부속 기자재 CRUD admin 서버 액션 추가"
```

---

## Task 5: 관리자 UI — `EquipmentAccessoryManager` + 부속 관리 페이지

**Files:**
- Create: `src/components/admin/EquipmentAccessoryManager.tsx`
- Create: `src/app/admin/equipment/[id]/accessories/page.tsx`

- [ ] **Step 1: `EquipmentAccessoryManager.tsx` 생성**

```tsx
// src/components/admin/EquipmentAccessoryManager.tsx
'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createEquipmentAccessory, deleteEquipmentAccessory, CreatedAccessoryEntry } from '@/app/actions/admin'
import { Trash2, Plus, Package } from 'lucide-react'

interface Props {
  equipmentId: number
  initialEntries: CreatedAccessoryEntry[]
}

const inputCls =
  'w-full h-10 px-3.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary placeholder:text-base-muted/50 focus:outline-none focus:border-brand-rose transition-colors'

export function EquipmentAccessoryManager({ equipmentId, initialEntries }: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const [entries, setEntries] = useState<CreatedAccessoryEntry[]>(initialEntries)
  const [addPending, startAddTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  function handleAdd(formData: FormData) {
    setError(null)
    setSuccessMsg(null)
    formData.set('equipmentId', String(equipmentId))
    startAddTransition(async () => {
      const result = await createEquipmentAccessory(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setEntries((prev) => [...prev, result.entry])
        setSuccessMsg('부속 기자재가 추가되었습니다.')
        formRef.current?.reset()
        router.refresh()
      }
    })
  }

  function handleDeleteConfirm(id: number) {
    startDeleteTransition(async () => {
      try {
        await deleteEquipmentAccessory(id)
        setEntries((prev) => prev.filter((e) => e.id !== id))
        setConfirmDeleteId(null)
        router.refresh()
      } catch {
        setError('대여 기록이 있는 부속은 삭제할 수 없습니다.')
        setConfirmDeleteId(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* 등록된 부속 목록 */}
      <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
        <div className="px-5 py-4 border-b border-base">
          <h2 className="text-sm font-bold text-base-primary">등록된 부속 기자재</h2>
        </div>
        {entries.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-base-muted">
            등록된 부속 기자재가 없습니다.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base bg-surface-raised">
                <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider">이름</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider hidden sm:table-cell">설명</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-base-secondary uppercase tracking-wider">총 수량</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-base-secondary uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-raised transition-colors">
                  <td className="px-5 py-3.5 font-medium text-base-primary">{entry.name}</td>
                  <td className="px-5 py-3.5 text-base-secondary hidden sm:table-cell">
                    {entry.description ?? <span className="text-base-muted">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-base-primary">{entry.totalQuantity}개</td>
                  <td className="px-5 py-3.5 text-right">
                    {confirmDeleteId === entry.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-red-600 dark:text-red-400">삭제할까요?</span>
                        <button
                          onClick={() => handleDeleteConfirm(entry.id)}
                          disabled={deletePending}
                          className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                        >
                          확인
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs font-semibold text-base-secondary hover:underline"
                        >
                          취소
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(entry.id)}
                        disabled={deletePending}
                        className="inline-flex items-center gap-1 text-xs text-base-muted hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 오류/성공 메시지 */}
      {error && (
        <div className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl px-4 py-3">
          {successMsg}
        </div>
      )}

      {/* 새 부속 추가 폼 */}
      <div className="bg-surface-base rounded-2xl border border-base p-5">
        <h2 className="text-sm font-bold text-base-primary mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          새 부속 기자재 추가
        </h2>
        <form ref={formRef} action={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-base-secondary">이름 *</label>
              <input
                name="name"
                required
                placeholder="예: 배터리 팩"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-base-secondary">설명 (선택)</label>
              <input
                name="description"
                placeholder="예: 소니 NP-F970"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-base-secondary">총 수량 *</label>
              <input
                name="totalQuantity"
                type="number"
                min="1"
                required
                placeholder="예: 5"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={addPending}
              className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-rose-600 dark:bg-brand-rose hover:bg-rose-700 dark:hover:bg-rose-400 text-white dark:text-zinc-950 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Package className="w-4 h-4" />
              {addPending ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 부속 관리 페이지 생성**

```tsx
// src/app/admin/equipment/[id]/accessories/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { EquipmentAccessoryManager } from '@/components/admin/EquipmentAccessoryManager'
import { ChevronLeft, Package } from 'lucide-react'

export default async function EquipmentAccessoriesPage({
  params,
}: {
  params: { id: string }
}) {
  const equipmentId = parseInt(params.id)
  if (isNaN(equipmentId)) notFound()

  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { id: true, name: true, category: true },
  })
  if (!equipment) notFound()

  const accessories = await prisma.equipmentAccessory.findMany({
    where: { equipmentId },
    orderBy: { id: 'asc' },
  })

  const initialEntries = accessories.map((a) => ({
    id: a.id,
    equipmentId: a.equipmentId,
    name: a.name,
    description: a.description,
    totalQuantity: a.totalQuantity,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-5 max-w-3xl">
      {/* 브레드크럼 */}
      <div className="flex items-center gap-2 text-sm text-base-secondary">
        <Link
          href="/admin/equipment"
          className="inline-flex items-center gap-1 hover:text-base-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          기자재 관리
        </Link>
        <span>/</span>
        <span className="text-base-primary font-medium">{equipment.name}</span>
        <span>/</span>
        <span className="text-base-primary font-medium">부속 관리</span>
      </div>

      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-rose-muted flex items-center justify-center shrink-0">
          <Package className="w-4.5 h-4.5 text-brand-rose" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-base-primary">{equipment.name}</h1>
          <p className="text-sm text-base-secondary">부속 기자재 관리</p>
        </div>
      </div>

      <EquipmentAccessoryManager
        equipmentId={equipmentId}
        initialEntries={initialEntries}
      />
    </div>
  )
}
```

- [ ] **Step 3: 빌드 확인**

```bash
cd /Users/jin-eunbeom/.config/superpowers/worktrees/기자재\ 대여\ 시스템/feat-implement
npx tsc --noEmit 2>&1 | head -30
```

Expected: 새 오류 없음

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/EquipmentAccessoryManager.tsx src/app/admin/equipment/
git commit -m "feat: 관리자 부속 기자재 관리 UI 및 페이지 추가"
```

---

## Task 6: 관리자 기자재 목록에 "부속 관리" 링크 추가

**Files:**
- Modify: `src/app/admin/equipment/page.tsx`

- [ ] **Step 1: import 확인 및 링크 추가**

`src/app/admin/equipment/page.tsx`의 import 목록에 아미 `Link`가 없다면 추가:
```ts
import Link from 'next/link'
```

기자재 테이블의 각 행에서 `EquipmentActions` 컴포넌트 바로 앞에 "부속 관리" 링크 추가. 해당 파일에서 기자재 행이 렌더링되는 부분을 찾아서 — `EquipmentActions` 가 있는 `<td>` 셀 안에 링크를 추가한다.

파일을 읽고 `EquipmentActions` 가 쓰이는 위치를 찾아 아래 링크를 **바로 앞**에 삽입:
```tsx
<Link
  href={`/admin/equipment/${eq.id}/accessories`}
  className="inline-flex items-center gap-1 text-xs text-base-secondary hover:text-brand-rose transition-colors px-2 py-1 rounded-lg hover:bg-brand-rose-muted"
>
  부속 관리
</Link>
```

- [ ] **Step 2: 빌드 확인**

```bash
cd /Users/jin-eunbeom/.config/superpowers/worktrees/기자재\ 대여\ 시스템/feat-implement
npx tsc --noEmit 2>&1 | head -20
```

Expected: 새 오류 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/equipment/page.tsx
git commit -m "feat: 관리자 기자재 목록에 부속 관리 링크 추가"
```

---

## Task 7: `createRentalRequest` — 부속 검증 + `$transaction` 전환

**Files:**
- Modify: `src/app/actions/rental.ts`

- [ ] **Step 1: `getAvailableAccessoryQuantity` import 추가**

파일 상단 import에 추가:
```ts
import { getAvailableAccessoryQuantity } from '@/lib/accessory'
```

- [ ] **Step 2: `createRentalRequest` 함수 본체 수정**

기존 함수에서 `try { ... }` 블록 전체를 아래로 교체한다 (accessory 검증 + `$transaction` 전환):

```ts
  // accessories JSON 파싱
  let accessories: { accessoryId: number; quantity: number }[] = []
  const accessoriesRaw = formData.get('accessories')
  if (accessoriesRaw) {
    try {
      accessories = JSON.parse(accessoriesRaw as string)
    } catch {
      return { success: false, error: '부속 기자재 정보가 올바르지 않습니다.' }
    }
  }

  // accessories 검증
  if (accessories.length > 0) {
    const accessoryRecords = await prisma.equipmentAccessory.findMany({
      where: {
        id: { in: accessories.map((a) => a.accessoryId) },
        equipmentId,
        status: 'active',
      },
      select: { id: true, name: true },
    })
    const validIds = new Set(accessoryRecords.map((r) => r.id))
    for (const a of accessories) {
      if (!validIds.has(a.accessoryId)) {
        return { success: false, error: '선택한 부속 기자재가 올바르지 않습니다.' }
      }
      if (a.quantity < 1) {
        return { success: false, error: '부속 기자재 수량은 1 이상이어야 합니다.' }
      }
      const avail = await getAvailableAccessoryQuantity(a.accessoryId, startAt, endAt)
      if (avail < a.quantity) {
        const name = accessoryRecords.find((r) => r.id === a.accessoryId)?.name ?? ''
        return {
          success: false,
          error: `부속 "${name}" 재고가 부족합니다 (가용: ${avail}개)`,
        }
      }
    }
  }

  try {
    const available = await checkAvailability(equipmentId, quantity, startAt, endAt)
    if (!available) {
      return { success: false, error: '선택한 기간에 해당 수량을 대여할 수 없습니다.' }
    }

    const passwordHash = await hashPassword(password)

    const requestNumber = await prisma.$transaction(async (tx) => {
      const request = await tx.rentalRequest.create({
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

      const validAccessories = accessories.filter((a) => a.quantity > 0)
      if (validAccessories.length > 0) {
        await tx.rentalRequestAccessory.createMany({
          data: validAccessories.map((a) => ({
            rentalRequestId: request.id,
            accessoryId: a.accessoryId,
            quantity: a.quantity,
          })),
        })
      }

      const rn = generateRequestNumber(new Date(), request.id)
      await tx.rentalRequest.update({
        where: { id: request.id },
        data: { requestNumber: rn },
      })
      return rn
    })

    return { success: true, requestNumber }
  } catch (error) {
    console.error('createRentalRequest error:', error)
    return { success: false, error: '신청 처리 중 오류가 발생했습니다. 다시 시도해주세요.' }
  }
```

중요: 기존 try 블록의 `const request = await prisma.rentalRequest.create(...)` 와 그 뒤의 `const requestNumber = generateRequestNumber(...)`, `await prisma.rentalRequest.update(...)`, `return { success: true, requestNumber }` 를 위의 코드로 전부 대체한다.

- [ ] **Step 3: `lookupRequest` — accessories include 추가**

`lookupRequest` 함수 내부에서 equipment 신청(non-classroom) 조회 부분을 수정한다.

기존:
```ts
    const request = await prisma.rentalRequest.findUnique({
      where: { requestNumber },
      include: { equipment: { select: { name: true } } },
    })
```

변경:
```ts
    const request = await prisma.rentalRequest.findUnique({
      where: { requestNumber },
      include: {
        equipment: { select: { name: true } },
        accessories: {
          include: { accessory: { select: { name: true } } },
        },
      },
    })
```

- [ ] **Step 4: `LookupResult` 타입에 accessories 추가**

`LookupResult` 타입의 `data` 객체에 필드 추가:
```ts
export type LookupResult =
  | {
      success: true
      data: {
        requestNumber: string
        groupNumber: string | null
        status: string
        equipmentName: string
        quantity: number
        startAt: Date
        endAt: Date
        adminNote: string | null
        createdAt: Date
        accessories: { name: string; quantity: number }[]  // ← 추가
      }
      groupItems?: {
        requestNumber: string
        status: string
        equipmentName: string
        quantity: number
        adminNote: string | null
      }[]
    }
  | { success: false; error: string; remainingAttempts?: number }
```

- [ ] **Step 5: equipment 신청 조회 return에 accessories 포함**

`lookupRequest` 내부의 마지막 return 블록에서 `data` 객체에 `accessories` 추가:
```ts
      data: {
        requestNumber: request.requestNumber,
        groupNumber: request.groupNumber,
        status: request.status,
        equipmentName: request.equipment.name,
        quantity: request.quantity,
        startAt: request.startAt,
        endAt: request.endAt,
        adminNote: request.adminNote,
        createdAt: request.createdAt,
        accessories: request.accessories.map((ra) => ({   // ← 추가
          name: ra.accessory.name,
          quantity: ra.quantity,
        })),
      },
```

classroom 신청의 return 블록에는 `accessories: []` 추가:
```ts
      data: {
        requestNumber: request.requestNumber,
        groupNumber: null,
        status: request.status,
        equipmentName: `${request.classroom.roomNumber} (강의실)`,
        quantity: 1,
        startAt: request.startAt,
        endAt: request.endAt,
        adminNote: request.adminNote,
        createdAt: request.createdAt,
        accessories: [],   // ← 추가
      },
```

- [ ] **Step 6: 빌드 확인**

```bash
cd /Users/jin-eunbeom/.config/superpowers/worktrees/기자재\ 대여\ 시스템/feat-implement
npx tsc --noEmit 2>&1 | head -30
```

Expected: 새 오류 없음

- [ ] **Step 7: Commit**

```bash
git add src/app/actions/rental.ts src/lib/accessory.ts
git commit -m "feat: createRentalRequest 부속 검증 및 트랜잭션 전환, lookupRequest 부속 포함"
```

---

## Task 8: `AccessorySelector.tsx` + `RentalForm.tsx` 통합

**Files:**
- Create: `src/components/rental/AccessorySelector.tsx`
- Modify: `src/components/rental/RentalForm.tsx`

- [ ] **Step 1: `AccessorySelector.tsx` 생성**

```tsx
// src/components/rental/AccessorySelector.tsx
'use client'

import { useEffect, useState } from 'react'
import { Package, AlertCircle } from 'lucide-react'

interface AccessoryOption {
  id: number
  name: string
  description: string | null
  totalQuantity: number
  available: number
}

interface Props {
  equipmentId: number
  startAt: string   // ISO string, 빈 문자열 = 미선택
  endAt: string     // ISO string, 빈 문자열 = 미선택
  onChange: (accessories: { accessoryId: number; quantity: number }[]) => void
}

export function AccessorySelector({ equipmentId, startAt, endAt, onChange }: Props) {
  const [options, setOptions] = useState<AccessoryOption[]>([])
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)

  const hasDate = startAt && endAt

  useEffect(() => {
    setLoading(true)
    const url = hasDate
      ? `/api/equipment/${equipmentId}/accessories?startAt=${encodeURIComponent(startAt)}&endAt=${encodeURIComponent(endAt)}`
      : `/api/equipment/${equipmentId}/accessories`

    fetch(url)
      .then((r) => r.json())
      .then((data: AccessoryOption[]) => {
        setOptions(data)
        // 옵션이 변경되면 수량 초기화
        setQuantities({})
        onChange([])
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentId, startAt, endAt])

  function handleQuantityChange(id: number, value: string) {
    const num = Math.max(0, parseInt(value) || 0)
    const option = options.find((o) => o.id === id)
    const clamped = option ? Math.min(num, option.available) : num

    const next = { ...quantities, [id]: clamped }
    setQuantities(next)
    onChange(
      Object.entries(next)
        .map(([k, v]) => ({ accessoryId: parseInt(k), quantity: v }))
        .filter((a) => a.quantity > 0),
    )
  }

  if (loading) {
    return (
      <div className="text-xs text-base-muted py-2">부속 기자재 목록 불러오는 중...</div>
    )
  }

  if (options.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-base-secondary" />
        <span className="text-sm font-semibold text-base-primary">부속 기자재 선택 (선택 사항)</span>
      </div>

      {!hasDate && (
        <div className="flex items-start gap-2 text-xs text-base-secondary bg-surface-raised rounded-xl px-3.5 py-3 border border-base">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          대여 기간을 먼저 선택하면 부속 기자재 가용 수량이 표시됩니다.
        </div>
      )}

      <div className="space-y-2">
        {options.map((opt) => {
          const qty = quantities[opt.id] ?? 0
          const isUnavailable = opt.available === 0
          return (
            <div
              key={opt.id}
              className="flex items-center gap-3 bg-surface-raised rounded-xl px-3.5 py-3 border border-base"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-base-primary">{opt.name}</div>
                {opt.description && (
                  <div className="text-xs text-base-secondary truncate">{opt.description}</div>
                )}
                {hasDate ? (
                  <div className="text-xs text-base-muted mt-0.5">
                    {isUnavailable ? (
                      <span className="text-red-500 dark:text-red-400 font-medium">재고 없음</span>
                    ) : (
                      <>가용: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{opt.available}</span>개</>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-base-muted mt-0.5">총 {opt.totalQuantity}개 보유</div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(opt.id, String(qty - 1))}
                  disabled={qty === 0 || isUnavailable}
                  className="w-7 h-7 rounded-lg border border-base bg-surface text-base-primary hover:bg-surface-overlay disabled:opacity-30 text-sm font-bold transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  max={opt.available}
                  value={qty}
                  onChange={(e) => handleQuantityChange(opt.id, e.target.value)}
                  disabled={isUnavailable}
                  className="w-12 h-7 text-center text-sm border border-base rounded-lg bg-surface-raised text-base-primary focus:outline-none focus:border-brand-rose disabled:opacity-40 tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(opt.id, String(qty + 1))}
                  disabled={!hasDate || qty >= opt.available || isUnavailable}
                  className="w-7 h-7 rounded-lg border border-base bg-surface text-base-primary hover:bg-surface-overlay disabled:opacity-30 text-sm font-bold transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `RentalForm.tsx` 에 `AccessorySelector` 통합**

`RentalForm.tsx` 에서:

1. import 추가:
```tsx
import { AccessorySelector } from '@/components/rental/AccessorySelector'
```

2. state 추가 (`useState<string | null>(null)` 정의들 아래에):
```tsx
const [selectedAccessories, setSelectedAccessories] = useState<{ accessoryId: number; quantity: number }[]>([])
```

3. form submit 핸들러(`handleSubmit` 또는 `form action`)를 찾아서 FormData에 accessories 추가:

`RentalForm.tsx`에는 `form action={handleSubmit}` 또는 `onSubmit` 방식이 있다. 해당 함수에서 `createRentalRequest(formData)` 호출 직전에 추가:
```tsx
formData.set('accessories', JSON.stringify(selectedAccessories))
```

4. 폼 JSX에서 수량 입력 필드 아래, 신청자 정보 위 적절한 위치에 삽입:
```tsx
{/* 부속 기자재 선택 */}
<AccessorySelector
  equipmentId={equipmentId}
  startAt={startAt}
  endAt={endAt}
  onChange={setSelectedAccessories}
/>
```

- [ ] **Step 3: 빌드 확인**

```bash
cd /Users/jin-eunbeom/.config/superpowers/worktrees/기자재\ 대여\ 시스템/feat-implement
npx tsc --noEmit 2>&1 | head -30
```

Expected: 새 오류 없음

- [ ] **Step 4: Commit**

```bash
git add src/components/rental/AccessorySelector.tsx src/components/rental/RentalForm.tsx
git commit -m "feat: AccessorySelector 컴포넌트 생성 및 RentalForm 통합"
```

---

## Task 9: `StatusLookup.tsx` — 부속 선택 내역 표시

**Files:**
- Modify: `src/components/rental/StatusLookup.tsx`

- [ ] **Step 1: 조회 결과에 부속 섹션 추가**

`StatusLookup.tsx`에서 `result.data` 를 렌더링하는 영역을 찾아 부속 섹션 추가. 기존 코드에서 신청 상세 내역이 표시되는 `<div>` 영역에서 기자재 정보(수량, 기간 등) 다음에 삽입:

```tsx
{result.data.accessories && result.data.accessories.length > 0 && (
  <div className="space-y-1.5">
    <div className="text-xs font-semibold text-base-secondary uppercase tracking-wider flex items-center gap-1.5">
      <Package className="w-3.5 h-3.5" />
      부속 기자재
    </div>
    <div className="flex flex-wrap gap-2">
      {result.data.accessories.map((acc, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 text-xs bg-surface-raised border border-base rounded-lg px-2.5 py-1.5 text-base-primary"
        >
          {acc.name} × {acc.quantity}개
        </span>
      ))}
    </div>
  </div>
)}
```

또한 import에 `Package` 아이콘 추가:
```tsx
import { Loader2, CalendarDays, Clock, ClipboardList, Package } from 'lucide-react'
```

- [ ] **Step 2: 빌드 확인**

```bash
cd /Users/jin-eunbeom/.config/superpowers/worktrees/기자재\ 대여\ 시스템/feat-implement
npx tsc --noEmit 2>&1 | head -20
```

Expected: 새 오류 없음

- [ ] **Step 3: Next.js 빌드 전체 확인**

```bash
cd /Users/jin-eunbeom/.config/superpowers/worktrees/기자재\ 대여\ 시스템/feat-implement
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` 또는 `Route (app)` 출력

- [ ] **Step 4: Commit**

```bash
git add src/components/rental/StatusLookup.tsx
git commit -m "feat: 신청 조회 화면에 부속 기자재 선택 내역 표시"
```
