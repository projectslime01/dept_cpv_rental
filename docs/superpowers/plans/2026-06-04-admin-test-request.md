# 관리자 테스트 신청 생성 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 어드민 패널에서 시간/날짜 제한 없이 테스트용 대여 신청을 생성하고, 어떤 관리자가 만들었는지 신청 목록에 표시한다.

**Architecture:** Prisma 스키마에 `isTest`/`testAdminId` 컬럼을 추가하고 `db push`로 반영한다. 기존 `admin.ts` 서버 액션에 `requireAdminSession()` 헬퍼와 두 개의 테스트 신청 액션을 추가한다. 새 어드민 페이지와 클라이언트 폼 컴포넌트를 만들고, 기존 신청 목록에 테스트 배지와 생성 관리자 이름을 표시한다.

**Tech Stack:** Next.js 14 App Router, Prisma 7 + Neon PostgreSQL, NextAuth, `'use server'` 서버 액션, Tailwind CSS, lucide-react

---

## 파일 구조

| 파일 | 변경 유형 |
|------|-----------|
| `prisma/schema.prisma` | 수정 — `isTest`, `testAdminId`, `testAdmin` relation 추가 |
| `src/app/actions/admin.ts` | 수정 — `requireAdminSession`, `createTestRentalRequest`, `createTestClassroomRentalRequest` 추가 |
| `src/app/admin/test-request/page.tsx` | 신규 — 서버 컴포넌트, 기자재/강의실 목록 조회 후 폼에 전달 |
| `src/components/admin/TestRequestForm.tsx` | 신규 — 클라이언트 컴포넌트, 탭 UI + 폼 |
| `src/app/admin/requests/page.tsx` | 수정 — `testAdmin` include, 테스트 배지/생성자 표시 |
| `src/app/admin/classroom/page.tsx` | 수정 — `testAdmin` include, 테스트 배지/생성자 표시 |
| `src/components/admin/AdminSidebar.tsx` | 수정 — "테스트 신청" 메뉴 항목 추가 |
| `src/components/admin/AdminBottomNav.tsx` | 수정 — "테스트" 모바일 탭 추가 |

---

## Task 1: Prisma 스키마 변경 + DB 반영

**Files:**
- Modify: `prisma/schema.prisma`

### 컨텍스트

- 프로젝트 경로: `/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement`
- DB URL은 `.env.local`에 있음: `DATABASE_URL="postgresql://..."`
- `prisma db push` 사용 (마이그레이션 없음)
- `Admin` 모델이 이미 있으며 두 곳에서 역방향 relation을 추가해야 함 → named relation 필수

- [ ] **Step 1: 현재 스키마 확인**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
cat prisma/schema.prisma
```

- [ ] **Step 2: 스키마에 컬럼 및 relation 추가**

`prisma/schema.prisma`의 `RentalRequest` 모델에 다음 세 줄을 `accessories RentalRequestAccessory[]` 줄 바로 뒤에 추가:

```prisma
  isTest      Boolean @default(false)
  testAdminId Int?
  testAdmin   Admin?  @relation("RentalTestAdmin", fields: [testAdminId], references: [id], onDelete: SetNull)
```

`ClassroomRentalRequest` 모델에 다음 세 줄을 `classroom Classroom @relation(...)` 줄 바로 뒤에 추가:

```prisma
  isTest      Boolean @default(false)
  testAdminId Int?
  testAdmin   Admin?  @relation("ClassroomTestAdmin", fields: [testAdminId], references: [id], onDelete: SetNull)
```

`Admin` 모델에 다음 두 줄을 `createdAt DateTime @default(now())` 줄 바로 뒤에 추가:

```prisma
  testRentalRequests    RentalRequest[]          @relation("RentalTestAdmin")
  testClassroomRequests ClassroomRentalRequest[] @relation("ClassroomTestAdmin")
```

- [ ] **Step 3: DB에 반영**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
export $(grep -v '^#' .env.local | xargs)
npx prisma db push
```

Expected output 포함 문구: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Prisma 클라이언트 재생성**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
export $(grep -v '^#' .env.local | xargs)
npx prisma generate
```

- [ ] **Step 5: TypeScript 타입 체크**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음 (또는 스키마 변경과 무관한 기존 에러만)

- [ ] **Step 6: 커밋**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
git add prisma/schema.prisma
git commit -m "feat: add isTest and testAdminId fields to rental request models"
```

---

## Task 2: 관리자 서버 액션 추가

**Files:**
- Modify: `src/app/actions/admin.ts`

### 컨텍스트

- `admin.ts` 는 `'use server'` 파일이며, 모든 export는 async function이어야 함
- 기존 `requireAdmin()` 은 세션 확인만 하고 세션 정보를 반환하지 않음
- 새 헬퍼 `requireAdminSession()` 은 `{ adminId: number, adminName: string }` 를 반환
- `generateRequestNumber` 는 `@/lib/rental` 에서 import 가능
- `checkAvailability` 도 `@/lib/rental` 에서 import 가능
- `checkClassroomAvailability` 는 `@/app/actions/classroomRental` 에 export 되어 있음
- `findTimetableConflict` 는 `@/lib/timetable` 에서 import 가능
- `format` 은 `date-fns` 에서 import

파일 맨 위 import 섹션 현재 상태:
```ts
'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
```

- [ ] **Step 1: admin.ts 현재 내용 확인**

```bash
cat "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement/src/app/actions/admin.ts" | head -15
```

- [ ] **Step 2: import 추가**

파일 상단 import 섹션에 다음 줄들을 추가 (기존 4개 import 아래):

```ts
import { format } from 'date-fns'
import {
  checkAvailability,
  generateRequestNumber,
} from '@/lib/rental'
import { checkClassroomAvailability } from '@/app/actions/classroomRental'
import { findTimetableConflict } from '@/lib/timetable'
import { hashPassword } from '@/lib/password'
```

- [ ] **Step 3: requireAdminSession 헬퍼 추가**

기존 `requireAdmin()` 함수 바로 뒤에 추가:

```ts
async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error('Unauthorized')
  return {
    adminId: parseInt(session.user.id),
    adminName: session.user.name ?? '관리자',
  }
}

function generateClassroomRN(date: Date, id: number): string {
  return `ROOM-${format(date, 'yyyyMMdd')}-${String(id).padStart(4, '0')}`
}
```

- [ ] **Step 4: createTestRentalRequest 액션 추가**

파일 맨 끝에 추가:

```ts
export type TestRentalResult =
  | { success: true; requestNumber: string }
  | { success: false; error: string }

export async function createTestRentalRequest(formData: FormData): Promise<TestRentalResult> {
  const { adminId } = await requireAdminSession()

  const equipmentId = parseInt(formData.get('equipmentId') as string)
  const quantity = parseInt(formData.get('quantity') as string)
  const startAt = new Date(formData.get('startAt') as string)
  const endAt = new Date(formData.get('endAt') as string)
  const applicantName = (formData.get('applicantName') as string).trim()
  const studentId = (formData.get('studentId') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const password = formData.get('password') as string
  const purpose = (formData.get('purpose') as string | null)?.trim() || null

  if (isNaN(equipmentId) || equipmentId < 1) return { success: false, error: '기자재 정보가 올바르지 않습니다.' }
  if (isNaN(quantity) || quantity < 1) return { success: false, error: '수량이 올바르지 않습니다.' }
  if (!applicantName || !studentId || !phone || !password) return { success: false, error: '필수 항목을 모두 입력해주세요.' }
  if (password.length < 4 || password.length > 8) return { success: false, error: '비밀번호는 4~8자리여야 합니다.' }
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || startAt >= endAt) return { success: false, error: '대여 기간이 올바르지 않습니다.' }

  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { minRentalQuantity: true, maxRentalQuantity: true, totalQuantity: true, status: true },
  })
  if (!equipment || equipment.status !== 'active') return { success: false, error: '해당 기자재를 찾을 수 없습니다.' }
  if (quantity < equipment.minRentalQuantity) {
    return { success: false, error: `이 기자재는 최소 ${equipment.minRentalQuantity}개 이상 신청해야 합니다.` }
  }
  const effectiveMax = equipment.maxRentalQuantity !== null
    ? Math.min(equipment.maxRentalQuantity, equipment.totalQuantity)
    : equipment.totalQuantity
  if (quantity > effectiveMax) {
    return { success: false, error: `이 기자재는 최대 ${effectiveMax}개까지 신청 가능합니다.` }
  }

  // isSubmissionTimeValid, isValidStartDate 건너뜀 (테스트 전용)
  const available = await checkAvailability(equipmentId, quantity, startAt, endAt)
  if (!available) return { success: false, error: '선택한 기간에 해당 수량을 대여할 수 없습니다.' }

  try {
    const requestNumber = await prisma.$transaction(async (tx) => {
      const passwordHash = await hashPassword(password)
      const req = await tx.rentalRequest.create({
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
          isTest: true,
          testAdminId: adminId,
        },
      })
      const rn = generateRequestNumber(new Date(), req.id)
      await tx.rentalRequest.update({ where: { id: req.id }, data: { requestNumber: rn } })
      return rn
    })
    revalidatePath('/admin/requests')
    return { success: true, requestNumber }
  } catch (error) {
    console.error('createTestRentalRequest error:', error)
    return { success: false, error: '신청 처리 중 오류가 발생했습니다.' }
  }
}
```

- [ ] **Step 5: createTestClassroomRentalRequest 액션 추가**

바로 이어서 파일 끝에 추가:

```ts
export async function createTestClassroomRentalRequest(formData: FormData): Promise<TestRentalResult> {
  const { adminId } = await requireAdminSession()

  const classroomId = parseInt(formData.get('classroomId') as string)
  const startAt = new Date(formData.get('startAt') as string)
  const endAt = new Date(formData.get('endAt') as string)
  const applicantName = (formData.get('applicantName') as string).trim()
  const studentId = (formData.get('studentId') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const password = formData.get('password') as string
  const purpose = (formData.get('purpose') as string | null)?.trim() || null
  const isGroup = formData.get('isGroup') === 'true'
  const groupCount = isGroup ? parseInt(formData.get('groupCount') as string) || null : null
  const groupMembers = isGroup ? ((formData.get('groupMembers') as string | null)?.trim() || null) : null
  const monitorAssets = (formData.get('monitorAssets') as string | null)?.trim() || null

  if (isNaN(classroomId) || classroomId < 1) return { success: false, error: '강의실 정보가 올바르지 않습니다.' }
  if (!applicantName || !studentId || !phone || !password) return { success: false, error: '필수 항목을 모두 입력해주세요.' }
  if (password.length < 4 || password.length > 8) return { success: false, error: '비밀번호는 4~8자리여야 합니다.' }
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || startAt >= endAt) return { success: false, error: '대여 기간이 올바르지 않습니다.' }

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: { status: true },
  })
  if (!classroom || classroom.status !== 'active') return { success: false, error: '해당 강의실을 찾을 수 없습니다.' }

  // isSubmissionTimeValid, isValidStartDate 건너뜀 (테스트 전용)

  // 시간표 충돌 검증
  const timetables = await prisma.classroomTimetable.findMany({ where: { classroomId } })
  const conflict = findTimetableConflict(timetables, startAt, endAt)
  if (conflict) {
    return { success: false, error: `정규 수업 시간과 겹칩니다.` }
  }

  // 승인된 예약 중복 검증
  const isAvailable = await checkClassroomAvailability(classroomId, startAt, endAt)
  if (!isAvailable) return { success: false, error: '해당 강의실은 선택한 기간에 이미 예약되어 있습니다.' }

  try {
    const passwordHash = await hashPassword(password)
    const req = await prisma.classroomRentalRequest.create({
      data: {
        requestNumber: `TEMP-${Date.now()}`,
        passwordHash,
        applicantName,
        studentId,
        phone,
        classroomId,
        startAt,
        endAt,
        purpose,
        isGroup,
        groupCount,
        groupMembers,
        monitorAssets,
        isTest: true,
        testAdminId: adminId,
      },
    })
    const rn = generateClassroomRN(new Date(), req.id)
    await prisma.classroomRentalRequest.update({ where: { id: req.id }, data: { requestNumber: rn } })
    revalidatePath('/admin/classroom')
    revalidatePath('/admin/requests')
    return { success: true, requestNumber: rn }
  } catch (error) {
    console.error('createTestClassroomRentalRequest error:', error)
    return { success: false, error: '신청 처리 중 오류가 발생했습니다.' }
  }
}
```

- [ ] **Step 6: TypeScript 타입 체크**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
npx tsc --noEmit 2>&1 | head -40
```

Expected: 에러 없음

- [ ] **Step 7: 커밋**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
git add src/app/actions/admin.ts
git commit -m "feat: add createTestRentalRequest and createTestClassroomRentalRequest actions"
```

---

## Task 3: TestRequestForm 컴포넌트 + 관리자 페이지 생성

**Files:**
- Create: `src/components/admin/TestRequestForm.tsx`
- Create: `src/app/admin/test-request/page.tsx`

### 컨텍스트

- `TestRequestForm` 은 `'use client'` 컴포넌트
- `useTransition` 으로 pending 상태 처리
- `useRef<HTMLFormElement>` + `formRef.current?.reset()` 으로 폼 리셋
- 탭 두 개: "기자재" / "강의실"
- 기자재 탭에서 선택된 기자재에 따라 수량 min/max가 달라짐
- Props 타입:
  ```ts
  interface Equipment { id: number; name: string; category: string; totalQuantity: number; minRentalQuantity: number; maxRentalQuantity: number | null }
  interface ClassroomOption { id: number; roomNumber: string }
  interface Props { equipments: Equipment[]; classrooms: ClassroomOption[] }
  ```
- 성공 시 초록색 배너로 신청번호 표시 + 폼 리셋
- 실패 시 빨간색 배너로 에러 메시지 표시
- 서버 액션 import: `createTestRentalRequest`, `createTestClassroomRentalRequest`

- [ ] **Step 1: TestRequestForm.tsx 생성**

파일 `src/components/admin/TestRequestForm.tsx` 전체 내용:

```tsx
'use client'

import { useTransition, useRef, useState } from 'react'
import { createTestRentalRequest, createTestClassroomRentalRequest } from '@/app/actions/admin'

interface Equipment {
  id: number
  name: string
  category: string
  totalQuantity: number
  minRentalQuantity: number
  maxRentalQuantity: number | null
}

interface ClassroomOption {
  id: number
  roomNumber: string
}

interface Props {
  equipments: Equipment[]
  classrooms: ClassroomOption[]
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-base bg-surface-raised text-sm text-base-primary placeholder:text-base-faint focus:outline-none focus:border-brand-rose transition-colors'
const labelClass = 'block text-xs font-semibold text-base-secondary mb-1.5'

export function TestRequestForm({ equipments, classrooms }: Props) {
  const [tab, setTab] = useState<'equipment' | 'classroom'>('equipment')
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(
    equipments[0]?.id ?? null,
  )
  const [isGroup, setIsGroup] = useState(false)
  const [equipmentPending, startEquipmentTransition] = useTransition()
  const [classroomPending, startClassroomTransition] = useTransition()
  const [equipmentResult, setEquipmentResult] = useState<
    { success: true; requestNumber: string } | { success: false; error: string } | null
  >(null)
  const [classroomResult, setClassroomResult] = useState<
    { success: true; requestNumber: string } | { success: false; error: string } | null
  >(null)
  const equipmentFormRef = useRef<HTMLFormElement>(null)
  const classroomFormRef = useRef<HTMLFormElement>(null)

  const selectedEquipment = equipments.find((e) => e.id === selectedEquipmentId) ?? null
  const minQty = selectedEquipment?.minRentalQuantity ?? 1
  const maxQty = selectedEquipment
    ? selectedEquipment.maxRentalQuantity !== null
      ? Math.min(selectedEquipment.maxRentalQuantity, selectedEquipment.totalQuantity)
      : selectedEquipment.totalQuantity
    : 1

  function handleEquipmentSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setEquipmentResult(null)
    startEquipmentTransition(async () => {
      const result = await createTestRentalRequest(fd)
      setEquipmentResult(result)
      if (result.success) equipmentFormRef.current?.reset()
    })
  }

  function handleClassroomSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setClassroomResult(null)
    startClassroomTransition(async () => {
      const result = await createTestClassroomRentalRequest(fd)
      setClassroomResult(result)
      if (result.success) {
        classroomFormRef.current?.reset()
        setIsGroup(false)
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* 탭 */}
      <div className="flex border-b border-base gap-2">
        <button
          type="button"
          onClick={() => setTab('equipment')}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 transition-all duration-200 ${
            tab === 'equipment'
              ? 'border-brand-rose text-brand-rose'
              : 'border-transparent text-base-secondary hover:text-base-primary'
          }`}
        >
          기자재
        </button>
        <button
          type="button"
          onClick={() => setTab('classroom')}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 transition-all duration-200 ${
            tab === 'classroom'
              ? 'border-brand-rose text-brand-rose'
              : 'border-transparent text-base-secondary hover:text-base-primary'
          }`}
        >
          강의실
        </button>
      </div>

      {/* 기자재 탭 */}
      {tab === 'equipment' && (
        <form ref={equipmentFormRef} onSubmit={handleEquipmentSubmit} className="space-y-4">
          {equipmentResult && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium border ${
                equipmentResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30'
              }`}
            >
              {equipmentResult.success
                ? `✅ 테스트 신청 완료 — 신청번호: ${equipmentResult.requestNumber}`
                : `❌ ${equipmentResult.error}`}
            </div>
          )}

          <div>
            <label className={labelClass}>기자재 *</label>
            <select
              name="equipmentId"
              required
              value={selectedEquipmentId ?? ''}
              onChange={(e) => setSelectedEquipmentId(parseInt(e.target.value))}
              className={inputClass}
            >
              {equipments.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  [{eq.category}] {eq.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>대여 시작 *</label>
              <input type="datetime-local" name="startAt" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>대여 종료 *</label>
              <input type="datetime-local" name="endAt" required className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>신청자 이름 *</label>
              <input type="text" name="applicantName" required placeholder="홍길동" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>학번 *</label>
              <input type="text" name="studentId" required placeholder="20240001" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>연락처 *</label>
              <input type="text" name="phone" required placeholder="010-0000-0000" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                수량 * (최소 {minQty} / 최대 {maxQty})
              </label>
              <input
                type="number"
                name="quantity"
                required
                min={minQty}
                max={maxQty}
                defaultValue={minQty}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>비밀번호 * (4~8자)</label>
              <input type="password" name="password" required minLength={4} maxLength={8} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>목적 (선택)</label>
            <textarea name="purpose" rows={2} className={inputClass} />
          </div>

          <button
            type="submit"
            disabled={equipmentPending || equipments.length === 0}
            className="w-full py-2.5 rounded-xl bg-brand-rose text-white font-semibold text-sm disabled:opacity-50 hover:bg-brand-rose/90 transition-colors"
          >
            {equipmentPending ? '처리 중...' : '테스트 신청 생성'}
          </button>
        </form>
      )}

      {/* 강의실 탭 */}
      {tab === 'classroom' && (
        <form ref={classroomFormRef} onSubmit={handleClassroomSubmit} className="space-y-4">
          {classroomResult && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium border ${
                classroomResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30'
              }`}
            >
              {classroomResult.success
                ? `✅ 테스트 신청 완료 — 신청번호: ${classroomResult.requestNumber}`
                : `❌ ${classroomResult.error}`}
            </div>
          )}

          <div>
            <label className={labelClass}>강의실 *</label>
            <select name="classroomId" required className={inputClass}>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.roomNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>대여 시작 *</label>
              <input type="datetime-local" name="startAt" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>대여 종료 *</label>
              <input type="datetime-local" name="endAt" required className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>신청자 이름 *</label>
              <input type="text" name="applicantName" required placeholder="홍길동" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>학번 *</label>
              <input type="text" name="studentId" required placeholder="20240001" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>연락처 *</label>
              <input type="text" name="phone" required placeholder="010-0000-0000" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>비밀번호 * (4~8자)</label>
              <input type="password" name="password" required minLength={4} maxLength={8} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>모니터 자산 (선택)</label>
              <input type="text" name="monitorAssets" placeholder="없음" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>목적 (선택)</label>
            <textarea name="purpose" rows={2} className={inputClass} />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isGroup"
              checked={isGroup}
              onChange={(e) => setIsGroup(e.target.checked)}
              className="w-4 h-4 accent-brand-rose"
            />
            <label htmlFor="isGroup" className="text-sm text-base-primary cursor-pointer">
              단체 신청
            </label>
            <input type="hidden" name="isGroup" value={String(isGroup)} />
          </div>

          {isGroup && (
            <div className="grid grid-cols-2 gap-3 pl-6">
              <div>
                <label className={labelClass}>인원 수 *</label>
                <input type="number" name="groupCount" required min={2} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>구성원 (선택)</label>
                <input type="text" name="groupMembers" placeholder="홍길동, 김철수" className={inputClass} />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={classroomPending || classrooms.length === 0}
            className="w-full py-2.5 rounded-xl bg-brand-rose text-white font-semibold text-sm disabled:opacity-50 hover:bg-brand-rose/90 transition-colors"
          >
            {classroomPending ? '처리 중...' : '테스트 신청 생성'}
          </button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 관리자 페이지 생성**

디렉토리 먼저 생성:

```bash
mkdir -p "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement/src/app/admin/test-request"
```

파일 `src/app/admin/test-request/page.tsx` 전체 내용:

```tsx
import { prisma } from '@/lib/prisma'
import { TestTube2 } from 'lucide-react'
import { TestRequestForm } from '@/components/admin/TestRequestForm'

export const dynamic = 'force-dynamic'

export default async function TestRequestPage() {
  const [equipments, classrooms] = await Promise.all([
    prisma.equipment.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
        category: true,
        totalQuantity: true,
        minRentalQuantity: true,
        maxRentalQuantity: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.classroom.findMany({
      where: { status: 'active' },
      select: { id: true, roomNumber: true },
      orderBy: { roomNumber: 'asc' },
    }),
  ])

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-2.5">
        <TestTube2 className="w-5 h-5 text-brand-rose" />
        <h1 className="text-xl font-bold text-base-primary">테스트 신청 생성</h1>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
        평일 업무시간(09:00~17:00) 및 2일 전 신청 제한이 적용되지 않습니다. 테스트 목적으로만 사용하세요.
      </div>

      <div className="bg-surface-base rounded-2xl border border-base p-5">
        {equipments.length === 0 && classrooms.length === 0 ? (
          <p className="text-sm text-base-muted text-center py-8">
            등록된 기자재 또는 강의실이 없습니다.
          </p>
        ) : (
          <TestRequestForm equipments={equipments} classrooms={classrooms} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript 타입 체크**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
npx tsc --noEmit 2>&1 | head -40
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
git add src/components/admin/TestRequestForm.tsx src/app/admin/test-request/page.tsx
git commit -m "feat: add admin test request form and page"
```

---

## Task 4: 기존 신청 목록에 테스트 배지 표시

**Files:**
- Modify: `src/app/admin/requests/page.tsx`
- Modify: `src/app/admin/classroom/page.tsx`

### 컨텍스트

**`/admin/requests/page.tsx`** 의 현재 기자재 신청 조회:
```ts
const equipmentRequests = currentType === 'equipment'
  ? await prisma.rentalRequest.findMany({
      where: { ... },
      include: { equipment: { select: { name: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    })
  : []
```

강의실 신청도 비슷하게 `classroomRequests` 로 조회됨.

배지는 신청번호(`requestNumber`) 옆에 표시하고, 생성 관리자 이름은 신청자 이름(`applicantName`) 셀 아래에 표시한다.

**`/admin/classroom/page.tsx`** 도 동일한 패턴으로 수정.

- [ ] **Step 1: `/admin/requests/page.tsx` — 기자재 include 수정**

기존:
```ts
include: { equipment: { select: { name: true, category: true } } },
```

변경 후:
```ts
include: {
  equipment: { select: { name: true, category: true } },
  testAdmin: { select: { name: true } },
},
```

- [ ] **Step 2: `/admin/requests/page.tsx` — 기자재 테이블 배지 + 생성자 추가**

기존 신청번호 셀:
```tsx
<td className="px-4 py-3 font-mono text-xs text-base-secondary">{r.requestNumber}</td>
```

변경 후:
```tsx
<td className="px-4 py-3 font-mono text-xs text-base-secondary">
  <div className="flex items-center gap-1.5 flex-wrap">
    <span>{r.requestNumber}</span>
    {r.isTest && (
      <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50">
        테스트
      </span>
    )}
  </div>
</td>
```

기존 신청자 이름 셀:
```tsx
<td className="px-4 py-3 text-base-primary">{r.applicantName}</td>
```

변경 후:
```tsx
<td className="px-4 py-3 text-base-primary">
  <div>{r.applicantName}</div>
  {r.isTest && (
    <div className="text-[11px] text-base-muted">
      생성: {r.testAdmin?.name ?? '삭제된 관리자'}
    </div>
  )}
</td>
```

- [ ] **Step 3: `/admin/requests/page.tsx` — 강의실 include 수정**

기존:
```ts
const classroomRequests = currentType === 'classroom'
  ? await prisma.classroomRentalRequest.findMany({
      where: { ... },
      include: { classroom: { select: { roomNumber: true } } },
      orderBy: { createdAt: 'desc' },
    })
  : []
```

변경 후 (`include` 부분):
```ts
include: {
  classroom: { select: { roomNumber: true } },
  testAdmin: { select: { name: true } },
},
```

- [ ] **Step 4: `/admin/requests/page.tsx` — 강의실 테이블 배지 + 생성자 추가**

강의실 테이블의 신청번호 셀 (기존):
```tsx
<td className="px-4 py-3 font-mono text-xs text-base-secondary">{r.requestNumber}</td>
```

변경 후:
```tsx
<td className="px-4 py-3 font-mono text-xs text-base-secondary">
  <div className="flex items-center gap-1.5 flex-wrap">
    <span>{r.requestNumber}</span>
    {r.isTest && (
      <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50">
        테스트
      </span>
    )}
  </div>
</td>
```

강의실 테이블의 신청자 이름 셀 (기존):
```tsx
<td className="px-4 py-3 text-base-primary">{r.applicantName}</td>
```

변경 후:
```tsx
<td className="px-4 py-3 text-base-primary">
  <div>{r.applicantName}</div>
  {r.isTest && (
    <div className="text-[11px] text-base-muted">
      생성: {r.testAdmin?.name ?? '삭제된 관리자'}
    </div>
  )}
</td>
```

- [ ] **Step 5: `/admin/classroom/page.tsx` — include 수정**

기존:
```ts
const requests = await prisma.classroomRentalRequest.findMany({
  where: statusFilter ? { status: statusFilter } : {},
  include: { classroom: { select: { roomNumber: true } } },
  orderBy: { createdAt: 'desc' },
})
```

변경 후:
```ts
const requests = await prisma.classroomRentalRequest.findMany({
  where: statusFilter ? { status: statusFilter } : {},
  include: {
    classroom: { select: { roomNumber: true } },
    testAdmin: { select: { name: true } },
  },
  orderBy: { createdAt: 'desc' },
})
```

- [ ] **Step 6: `/admin/classroom/page.tsx` — 배지 + 생성자 추가**

신청번호 셀 (기존):
```tsx
<td className="px-4 py-3 font-mono text-xs text-base-secondary whitespace-nowrap">{r.requestNumber}</td>
```

변경 후:
```tsx
<td className="px-4 py-3 font-mono text-xs text-base-secondary">
  <div className="flex items-center gap-1.5 flex-wrap">
    <span className="whitespace-nowrap">{r.requestNumber}</span>
    {r.isTest && (
      <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50">
        테스트
      </span>
    )}
  </div>
</td>
```

신청자 이름 셀 (기존):
```tsx
<td className="px-4 py-3 text-base-primary">{r.applicantName}</td>
```

변경 후:
```tsx
<td className="px-4 py-3 text-base-primary">
  <div>{r.applicantName}</div>
  {r.isTest && (
    <div className="text-[11px] text-base-muted">
      생성: {r.testAdmin?.name ?? '삭제된 관리자'}
    </div>
  )}
</td>
```

- [ ] **Step 7: TypeScript 타입 체크**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
npx tsc --noEmit 2>&1 | head -40
```

Expected: 에러 없음

- [ ] **Step 8: 커밋**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
git add src/app/admin/requests/page.tsx src/app/admin/classroom/page.tsx
git commit -m "feat: show test badge and creator name in admin request lists"
```

---

## Task 5: 네비게이션 메뉴 추가

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/components/admin/AdminBottomNav.tsx`

### 컨텍스트

`AdminSidebar.tsx` 의 `NAV_ITEMS` 배열:
```ts
const NAV_ITEMS = [
  { href: '/admin/dashboard',   label: '대시보드',    icon: LayoutDashboard },
  { href: '/admin/requests',    label: '기자재 신청', icon: ClipboardList },
  { href: '/admin/classroom',   label: '강의실 신청', icon: DoorOpen },
  { href: '/admin/equipment',   label: '기자재 관리', icon: Package },
  { href: '/admin/classrooms',  label: '강의실 관리', icon: Building2 },
  { href: '/admin/history',     label: '대여 이력',   icon: History },
  { href: '/admin/accounts',    label: '계정 관리',   icon: Users },
]
```

`TestTube2` 아이콘이 lucide-react에 있음.

`AdminBottomNav.tsx` 는 현재 6개 항목이 있음. 모바일 화면에서 너무 많아질 수 있으므로 "테스트"를 추가하되 label을 "테스트"(짧게)로 설정.

- [ ] **Step 1: AdminSidebar.tsx — import 수정 + NAV_ITEMS 추가**

기존 import:
```ts
import { LayoutDashboard, ClipboardList, Package, Building2, DoorOpen, History, Users } from 'lucide-react'
```

변경 후:
```ts
import { LayoutDashboard, ClipboardList, Package, Building2, DoorOpen, History, Users, TestTube2 } from 'lucide-react'
```

`NAV_ITEMS` 배열에서 `accounts` 항목 앞에 추가:
```ts
  { href: '/admin/test-request', label: '테스트 신청', icon: TestTube2 },
```

- [ ] **Step 2: AdminBottomNav.tsx — import 수정 + NAV_ITEMS 추가**

기존 import:
```ts
import { LayoutDashboard, ClipboardList, Package, Building2, History, Users } from 'lucide-react'
```

변경 후:
```ts
import { LayoutDashboard, ClipboardList, Package, Building2, History, Users, TestTube2 } from 'lucide-react'
```

`NAV_ITEMS` 배열 끝에 추가:
```ts
  { href: '/admin/test-request', label: '테스트', icon: TestTube2 },
```

- [ ] **Step 3: TypeScript 타입 체크**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
npx tsc --noEmit 2>&1 | head -40
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
git add src/components/admin/AdminSidebar.tsx src/components/admin/AdminBottomNav.tsx
git commit -m "feat: add test request navigation item to admin sidebar and bottom nav"
```

---

## 자체 검토 결과

### 스펙 커버리지

| 스펙 요구사항 | 담당 태스크 |
|--------------|------------|
| `isTest`, `testAdminId` 스키마 추가 | Task 1 |
| `onDelete: SetNull` + named relation | Task 1 |
| `requireAdminSession()` 헬퍼 | Task 2 |
| `createTestRentalRequest` — 시간 제한 우회 | Task 2 |
| `createTestClassroomRentalRequest` — 시간 제한 우회 | Task 2 |
| 재고/날짜 유효성 검증 유지 | Task 2 |
| `/admin/test-request` 페이지 | Task 3 |
| `TestRequestForm` — 탭, pending, 리셋 | Task 3 |
| `/admin/requests` 배지 + 생성자 | Task 4 |
| `/admin/classroom` 배지 + 생성자 | Task 4 |
| 사이드바/모바일 네비게이션 | Task 5 |

모든 요구사항 커버됨 ✅

### Placeholder 스캔

없음 ✅

### 타입 일관성

- `TestRentalResult` — Task 2에서 정의, `TestRequestForm` 이 반환 타입으로 사용 ✅
- `Equipment` / `ClassroomOption` props 타입 — Task 3 컴포넌트에서 정의, 페이지 Prisma 조회와 일치 ✅
- `testAdmin: { select: { name: true } }` — Task 1 스키마 relation 이름과 일치 ✅
