# 관리자 테스트 신청 생성 기능 설계

**날짜:** 2026-06-04  
**목적:** 관리자가 어드민 패널에서 시간/날짜 제한 없이 테스트용 대여 신청을 생성하고, 어떤 관리자가 생성했는지 추적

---

## 배경 및 문제

현재 기자재/강의실 대여 신청은 다음 규칙에 의해 차단된다:
- `isSubmissionTimeValid`: 평일 09:00~17:00 외 신청 불가
- `isValidStartDate`: 평일 기준 최소 2일 전 대여 시작일 필요

관리자가 평일 업무시간 외에 시스템을 테스트하거나, 당일/내일 날짜로 테스트 신청을 만들 수 없어 개발 및 운영 테스트가 어렵다.

---

## 설계 범위

이 기능은 단일 스펙으로 구현 가능한 범위다:
1. DB 스키마 변경 (`isTest`, `testAdminId` 컬럼)
2. 관리자 전용 서버 액션 (시간 제한 우회)
3. 관리자 전용 테스트 신청 페이지
4. 기존 신청 목록에 테스트 배지 + 생성 관리자 표시

---

## 아키텍처

### 인증 방식

`getServerSession(authOptions)` 으로 현재 로그인된 관리자 세션을 가져온다. `session.user.id` 는 Admin 테이블의 `id` 를 `String`으로 변환한 값이다.

새 헬퍼 `requireAdminSession()` 을 `admin.ts` 에 추가:
```ts
async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error('Unauthorized')
  return { adminId: parseInt(session.user.id), adminName: session.user.name ?? '관리자' }
}
```
기존 `requireAdmin()` 은 그대로 유지한다.

---

## DB 스키마 변경

### `prisma/schema.prisma`

`RentalRequest` 에 추가:
```prisma
isTest      Boolean @default(false)
testAdminId Int?
testAdmin   Admin?  @relation("RentalTestAdmin", fields: [testAdminId], references: [id], onDelete: SetNull)
```

`ClassroomRentalRequest` 에 추가:
```prisma
isTest      Boolean @default(false)
testAdminId Int?
testAdmin   Admin?  @relation("ClassroomTestAdmin", fields: [testAdminId], references: [id], onDelete: SetNull)
```

`Admin` 모델에 역방향 relation 추가:
```prisma
testRentalRequests         RentalRequest[]         @relation("RentalTestAdmin")
testClassroomRequests      ClassroomRentalRequest[] @relation("ClassroomTestAdmin")
```

**설계 결정:**
- `@default(false)` → 기존 신청은 변경 없음
- `onDelete: SetNull` → 관리자 계정 삭제 시 신청 기록 보존, `testAdminId`가 `null`로 바뀜
- Named relation (`"RentalTestAdmin"` 등) 사용 → Admin이 여러 relation을 갖기 때문에 명시 필요

---

## 서버 액션 (`src/app/actions/admin.ts`)

### `createTestRentalRequest(formData: FormData)`

반환 타입: `Promise<{ success: true; requestNumber: string } | { success: false; error: string }>`

**건너뛰는 검증:**
- `isSubmissionTimeValid` (신청 가능 시간)
- `isValidStartDate` (평일 2일 전 제한)

**유지하는 검증:**
- `startAt < endAt` (날짜 범위 유효성)
- 장비 존재 여부 및 `status === 'active'`
- 최소/최대 수량 제한
- 재고 가용 수량 (`checkAvailability`)

**FormData 필드:**
- `equipmentId`, `quantity`, `startAt`, `endAt`
- `applicantName`, `studentId`, `phone`, `password`
- `purpose` (선택)

**저장:**
- `isTest: true`
- `testAdminId: adminId` (requireAdminSession에서 가져옴)
- `$transaction` + `generateRequestNumber` 사용 (기존 패턴 그대로)
- `generateRequestNumber` 는 `@/lib/rental` 에서 import
- 성공 시 `revalidatePath('/admin/requests')`

### `createTestClassroomRentalRequest(formData: FormData)`

반환 타입: 동일

**건너뛰는 검증:** `isSubmissionTimeValid`, `isValidStartDate`

**유지하는 검증:**
- `startAt < endAt`
- 강의실 존재 여부 및 `status === 'active'`
- 시간표 충돌 (`findTimetableConflict`)
- 강의실 승인 예약 중복 (`checkClassroomAvailability`)

**FormData 필드:**
- `classroomId`, `startAt`, `endAt`
- `applicantName`, `studentId`, `phone`, `password`
- `purpose` (선택), `isGroup`, `groupCount`, `groupMembers`, `monitorAssets`

**저장:**
- `isTest: true`
- `testAdminId: adminId`
- `generateClassroomRequestNumber` 는 `classroomRental.ts` 내부 함수라 외부 export가 없음 → `admin.ts` 에 동일 로직을 `generateClassroomRN(date, id)` 로 인라인 정의:
  ```ts
  function generateClassroomRN(date: Date, id: number): string {
    return `ROOM-${format(date, 'yyyyMMdd')}-${String(id).padStart(4, '0')}`
  }
  ```
- 성공 시 `revalidatePath('/admin/classroom')`, `revalidatePath('/admin/requests')`

---

## 관리자 페이지 (`src/app/admin/test-request/page.tsx`)

서버 컴포넌트. 기자재 목록과 강의실 목록을 Prisma로 조회해 `TestRequestForm` 에 props로 전달.

```tsx
// 데이터 조회
const equipments = await prisma.equipment.findMany({
  where: { status: 'active' },
  select: { id: true, name: true, category: true, totalQuantity: true,
            minRentalQuantity: true, maxRentalQuantity: true },
  orderBy: { name: 'asc' },
})
const classrooms = await prisma.classroom.findMany({
  where: { status: 'active' },
  select: { id: true, roomNumber: true },
  orderBy: { roomNumber: 'asc' },
})
```

---

## 클라이언트 컴포넌트 (`src/components/admin/TestRequestForm.tsx`)

`'use client'` 컴포넌트. 탭 두 개:

### 기자재 탭
필드:
- 기자재 선택 (`<select>`) — 드롭다운
- 대여 시작 (`datetime-local`)
- 대여 종료 (`datetime-local`)
- 신청자 이름, 학번, 연락처
- 수량 (숫자 입력, 선택된 기자재의 min/max 적용)
- 목적 (선택, `<textarea>`)
- 비밀번호 (4~8자)

### 강의실 탭
필드:
- 강의실 선택 (`<select>`)
- 대여 시작 / 종료 (`datetime-local`)
- 신청자 이름, 학번, 연락처
- 목적 (선택)
- 비밀번호
- 단체 여부 (`checkbox`) → 체크 시 인원수 / 구성원 필드 표시

### UX
- `useTransition` 으로 제출 pending 처리
- 성공 시: 신청번호 표시 (초록색 배너), 폼 초기화
- 실패 시: 에러 메시지 인라인 표시 (빨간색 배너)
- `formRef.current?.reset()` 로 폼 초기화

---

## 기존 신청 목록 수정

### `/admin/requests/page.tsx`

1. Prisma 조회에 `testAdmin` include 추가:
```ts
include: {
  equipment: { select: { name: true, category: true } },
  testAdmin: { select: { name: true } },  // 추가
}
```

2. 신청 행에 테스트 배지 추가:
```tsx
{req.isTest && (
  <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded
    bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400
    border border-amber-300 dark:border-amber-700/50">
    테스트
  </span>
)}
```

3. 테스트 생성자 표시 (신청자 정보 아래):
```tsx
{req.isTest && (
  <div className="text-[11px] text-base-muted">
    생성: {req.testAdmin?.name ?? '삭제된 관리자'}
  </div>
)}
```

### `/admin/classroom/page.tsx`

동일한 패턴으로 `testAdmin` include + 배지 + 생성자 표시 추가.

---

## 내비게이션

어드민 사이드바/헤더에 "테스트 신청" 링크 추가:
- 경로: `/admin/test-request`
- 아이콘: `TestTube2` (lucide-react)

기존 네비게이션 링크들이 있는 레이아웃 파일(`src/app/admin/layout.tsx`)에 추가.

---

## 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `prisma/schema.prisma` | `isTest`, `testAdminId`, relation 추가 |
| `src/app/actions/admin.ts` | `requireAdminSession`, `createTestRentalRequest`, `createTestClassroomRentalRequest` 추가 |
| `src/app/admin/test-request/page.tsx` | 신규 생성 |
| `src/components/admin/TestRequestForm.tsx` | 신규 생성 |
| `src/app/admin/requests/page.tsx` | `testAdmin` include, 배지/생성자 표시 |
| `src/app/admin/classroom/page.tsx` | `testAdmin` include, 배지/생성자 표시 |
| `src/app/admin/layout.tsx` | "테스트 신청" 네비게이션 링크 추가 |

---

## 테스트 시나리오

1. **평일 업무시간 외 테스트 신청 생성** → 성공
2. **당일 날짜로 시작일 설정** → 성공 (2일 전 제한 우회)
3. **재고 초과 수량으로 시도** → 실패 (재고 검증 유지)
4. **신청 목록에서 "테스트" 배지 확인** → 표시
5. **생성한 관리자 이름 표시** → 표시
6. **관리자 계정 삭제 후 해당 테스트 신청 조회** → "삭제된 관리자" 표시
