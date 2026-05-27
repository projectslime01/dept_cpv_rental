# 부속 기자재 선택 시스템 설계

**작성일:** 2026-05-27  
**상태:** 승인됨

---

## 개요

기자재 단건 대여 신청 시, 해당 기자재에 연결된 부속 기자재(배터리, 충전기, 메모리카드 등)를 옵션으로 선택해 함께 신청할 수 있는 시스템. 부속 기자재는 독립적인 재고를 갖고, 관리자가 메인 기자재별로 지정한다.

---

## 요구사항 결정 사항

| 항목 | 결정 |
|---|---|
| 재고 추적 | 있음 — 부속도 총 보유 수량 관리, approved 상태만 집계 |
| 연결 방식 | 전용 부속 (1:N) — 부속은 하나의 메인 기자재에만 속함 |
| 수량 선택 | 가능 — 0(선택 안 함)부터 가용 수량까지 직접 입력 |
| 적용 범위 | 단건 신청(`/apply`)만 지원. 장바구니(일괄 신청) 미지원 |
| 관리 주체 | 관리자가 기자재별 부속 등록/삭제 |

---

## 데이터 모델

### 신규 모델

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

### 기존 모델 변경

- `Equipment`에 `accessories EquipmentAccessory[]` 관계 추가
- `RentalRequest`에 `accessories RentalRequestAccessory[]` 관계 추가

### Cascade 규칙

| 관계 | onDelete | 이유 |
|---|---|---|
| `Equipment` → `EquipmentAccessory` | Cascade | 기자재 삭제 시 부속 정의도 삭제 |
| `EquipmentAccessory` → `RentalRequestAccessory` | Restrict | 대여 기록 있는 부속 삭제 방지 |
| `RentalRequest` → `RentalRequestAccessory` | Cascade | 신청 삭제 시 부속 내역도 함께 삭제 |

---

## 가용 수량 계산

```
가용 = totalQuantity - SUM(quantity)
       WHERE accessoryId = :id
         AND status = 'approved'
         AND startAt < :endAt
         AND endAt > :startAt
```

메인 기자재와 동일하게 `approved` 상태만 집계한다. `pending` 상태는 가용 수량에서 차감하지 않는다.

---

## API

### `GET /api/equipment/[id]/accessories`

쿼리 파라미터: `startAt` (선택), `endAt` (선택)

```ts
// 응답 형식
[{
  id: number
  name: string
  description: string | null
  totalQuantity: number
  available: number  // startAt/endAt 없으면 totalQuantity와 동일
}]
```

- `status = 'active'`인 항목만 반환
- 날짜 범위 없이 호출 시 `available = totalQuantity` 반환 (날짜 선택 전 UI 초기 렌더링용)

---

## 서버 액션

### `createRentalRequest` 수정

**FormData 추가 필드:**
```
accessories: JSON.stringify([{ accessoryId: number; quantity: number }])
```
빈 배열(`[]`) 또는 필드 없음 → 부속 없이 신청.

**검증 순서:**
1. JSON 파싱 실패 시 에러 반환
2. 각 accessoryId가 해당 equipmentId에 속하는 `active` 부속인지 확인
3. 각 quantity ≥ 1 검증
4. 각 부속의 가용 수량 ≥ 요청 수량 검증

**DB 쓰기 (단일 `$transaction` 안에서):**
```ts
const rn = await prisma.$transaction(async (tx) => {
  const req = await tx.rentalRequest.create({ data: { ... } })
  if (accessories.length > 0) {
    await tx.rentalRequestAccessory.createMany({
      data: accessories.map(a => ({
        rentalRequestId: req.id,
        accessoryId: a.accessoryId,
        quantity: a.quantity,
      })),
    })
  }
  const requestNumber = generateRequestNumber(new Date(), req.id)
  await tx.rentalRequest.update({ where: { id: req.id }, data: { requestNumber } })
  return requestNumber
})
```

> 기존의 create → update 두 번 호출 방식도 이 트랜잭션으로 대체되어 원자성이 개선된다.

### `lookupRequest` 수정

`RentalRequest` 조회 시 accessories include 추가:
```ts
include: {
  equipment: { select: { name: true } },
  accessories: {
    include: { accessory: { select: { name: true } } },
  },
}
```

`LookupResult.data`에 추가:
```ts
accessories: { name: string; quantity: number }[]
```

### 신규 admin 액션

```ts
// src/app/actions/admin.ts 에 추가
createEquipmentAccessory(formData: FormData): Promise<AccessoryResult>
deleteEquipmentAccessory(id: number): Promise<void>
```

`AccessoryResult = { success: true; entry: CreatedAccessoryEntry } | { success: false; error: string }`

---

## 파일 구조

### 신규 파일 (5개)

| 파일 | 역할 |
|---|---|
| `src/lib/accessory.ts` | `getAvailableAccessoryQuantity(id, start, end)` 유틸 |
| `src/app/api/equipment/[id]/accessories/route.ts` | 가용 수량 API GET 핸들러 |
| `src/components/admin/EquipmentAccessoryManager.tsx` | 관리자 부속 CRUD 클라이언트 컴포넌트 |
| `src/app/admin/equipment/[id]/accessories/page.tsx` | 관리자 부속 관리 페이지 |
| `src/components/rental/AccessorySelector.tsx` | 신청 폼용 부속 선택 클라이언트 컴포넌트 |

### 수정 파일 (6개)

| 파일 | 변경 내용 |
|---|---|
| `prisma/schema.prisma` | 모델 2개 추가, Equipment·RentalRequest에 관계 추가 |
| `src/app/actions/admin.ts` | `createEquipmentAccessory`, `deleteEquipmentAccessory` 추가 |
| `src/app/actions/rental.ts` | `createRentalRequest` 수정, `lookupRequest` 수정 |
| `src/components/rental/RentalForm.tsx` | `AccessorySelector` 통합 |
| `src/app/admin/equipment/page.tsx` | 각 기자재 행에 "부속 관리" 링크 추가 |
| `src/components/rental/StatusLookup.tsx` | 부속 선택 내역 표시 추가 |

---

## UX 흐름

### 학생 — 신청 폼 (`/apply`)

1. **날짜 미선택 상태**: "대여 기간을 먼저 선택하면 부속 기자재 가용 수량이 표시됩니다" 안내
2. **날짜 선택 시**: API 자동 호출 → 부속 목록 + 각 항목별 가용 수량 표시
3. **수량 입력**: 0 = 선택 안 함. `available = 0`이면 입력 비활성화 + "재고 없음" 표시
4. **폼 제출**: 선택된 부속(quantity > 0)만 `accessories` JSON으로 전송

### 관리자 — 부속 관리

- 기자재 목록 각 행에 "부속 관리" 링크 → `/admin/equipment/[id]/accessories`
- 페이지 구성: `ClassroomTimetableManager`와 동일한 패턴
  - 상단: 등록된 부속 목록 테이블 (이름, 설명, 총 수량, 삭제 버튼 + 인라인 확인)
  - 하단: 새 부속 추가 폼 (이름, 설명, 총 수량)

### 신청 조회 (`/status`)

- 부속 선택이 있는 신청에 "부속 기자재" 섹션 표시
- 형식: `배터리 팩 × 2개`, `충전기 × 1개` 등

---

## 오류 처리

| 상황 | 처리 |
|---|---|
| 부속이 해당 기자재 소속이 아님 | 서버에서 `{ success: false, error: '...' }` 반환 |
| 부속 가용 수량 초과 | 서버에서 `{ success: false, error: '부속 "X" 재고가 부족합니다 (가용: N개)' }` |
| 가용 수량 = 0 | 클라이언트 입력 비활성화 + 서버에서 이중 검증 |
| 날짜 미선택 시 API 호출 | `available = totalQuantity` 반환 (날짜 없으면 차감 없음) |

---

## 범위 외

- 장바구니(일괄 신청) 경로에서의 부속 선택 — 미지원
- 부속 수정(이름/수량 변경) — 삭제 후 재등록으로 대체
- 부속의 별도 승인/반납 상태 추적 — 메인 기자재 신청 상태와 연동
