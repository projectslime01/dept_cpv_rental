# 영상콘텐츠과 기자재 대여 시스템 — 프로젝트 인수인계

> **작성일:** 2026-05-21  
> **저장소:** `git@github.com:projectslime01/dept_cpv_rental.git`  
> **로컬 경로:** `~/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement`  
> **관련 문서:** `docs/design-handoff.md` (UI 디자인 스펙)

---

## 1. 프로젝트 배경과 목적

### 왜 만들었는가

대학교 영상콘텐츠과 학생들은 카메라, 렌즈, 조명 등 기자재를 빌리기 위해 **직접 조교실에 방문하거나 카카오톡/문자로 신청**하고 있었다. 이 방식의 문제:

- 조교가 없는 시간에는 신청 자체가 불가능
- 현재 재고가 몇 개인지 학생이 알 방법이 없음
- 동시에 여러 학생이 같은 기자재를 신청해 겹치는 경우 발생
- 신청 기록이 카카오톡 대화에만 남아 이력 관리 불가

**이 시스템의 목적:** 학생이 온라인으로 24시간 기자재를 신청하고, 관리자가 웹에서 승인·반납을 처리할 수 있게 한다.

### 주요 사용자

| 사용자 | 목표 |
|--------|------|
| **학생** | 기자재 재고 확인 → 대여 신청 → 신청 상태 조회 |
| **관리자 (조교/직원)** | 신청 승인/거절 → 반납 처리 → 기자재 등록·수정 |

---

## 2. 핵심 기획 결정사항

프로젝트 기획 단계에서 논의 후 확정된 결정들. **이 결정들이 바뀌면 관련 로직 전체를 재검토**해야 한다.

---

### 결정 1: 학생은 회원가입/로그인 없이 신청

**결정:** 학생은 별도 계정 없이 이름·학번·연락처만 입력해 신청한다.

**이유:**
- 학과 특성상 사용 빈도가 낮아 계정 생성 장벽이 이탈로 이어짐
- 실제 기자재 대여는 대면 수령이므로 본인 확인은 수령 시 가능
- 계정 관리(분실, 탈퇴 등)로 인한 관리자 업무 증가를 피하기 위함

**영향받는 코드:**
- `src/app/(public)/apply/page.tsx` — 폼에 이름/학번 직접 입력
- `src/app/actions/rental.ts` — 인증 없이 Server Action 실행
- `middleware.ts` — `/admin/*` 만 세션 보호

---

### 결정 2: 신청 조회는 신청번호 + 조회용 비밀번호

**결정:** 신청 후 발급되는 고유 번호(`REQ-YYYYMMDD-NNNN`)와 학생이 직접 설정한 4~8자리 비밀번호로 상태를 조회한다.

**이유:**
- 로그인 없이도 본인 신청만 볼 수 있어야 함
- 이메일 기반 링크는 학교 이메일 접근성 문제가 있음
- 비밀번호는 bcrypt 해시로 저장 (평문 저장 없음)

**제약:**
- 비밀번호 분실 시 복구 기능 없음 → 관리자에게 직접 문의
- 5회 오입력 시 10분 잠금 (`src/lib/rate-limit.ts`)

**영향받는 코드:**
- `src/lib/password.ts` — bcrypt 해시/비교
- `src/lib/rate-limit.ts` — IP + 신청번호 기반 rate limit
- `src/app/actions/rental.ts` → `lookupRequest()`
- `src/components/rental/StatusLookup.tsx`

---

### 결정 3: 재고는 DB 컬럼이 아닌 실시간 계산

**결정:** `Equipment` 테이블에 `availableQuantity` 컬럼을 두지 않는다. 대여 가능 수량은 항상 즉석 계산한다.

**계산 방식:**
```
대여 가능 = totalQuantity − (해당 기간과 겹치는 approved 신청들의 quantity 합계)
겹침 조건: startAt < 요청종료 AND endAt > 요청시작
```

**이유:**
- 컬럼으로 관리하면 승인/거절/반납 처리 시마다 업데이트가 필요하고, 트랜잭션 실패 시 동기화 오류 발생 가능
- 실시간 계산이 항상 정확함

**영향받는 코드:**
- `src/lib/rental.ts` → `getAvailableQuantity()`
- `src/app/api/equipment/[id]/availability/route.ts`
- `src/app/actions/rental.ts` — 신청 제출 직전 서버에서 재검증

---

### 결정 4: 여러 기자재를 한 번에 신청하는 "신청함" 기능

**결정:** 장바구니처럼 여러 기자재를 담아 한 번에 신청하는 기능을 추가한다.

**구현 방식:**
- 신청함 상태는 `localStorage`에 저장 (서버 불필요, SSR hydration 처리)
- 제출 시 동일한 `groupNumber`를 공유하는 개별 `RentalRequest` 행 여러 개 생성
- 조회 시 같은 `groupNumber`인 신청 전체를 묶어서 표시

**이유:**
- 카메라 바디 + 렌즈 + 배터리처럼 함께 빌리는 경우가 많음
- 매번 이름/학번/연락처/비밀번호를 반복 입력하는 불편함 해소

**용어:** "장바구니"→ "신청함", "담기"→ "선택" (쇼핑 느낌 배제)

**영향받는 코드:**
- `src/lib/useCart.tsx` — CartContext, localStorage 기반
- `src/components/cart/AddToCartButton.tsx`
- `src/components/cart/CartHeaderButton.tsx`
- `src/components/cart/CartPageClient.tsx`
- `src/app/actions/rental.ts` → `createBatchRentalRequest()`
- `prisma/schema.prisma` → `RentalRequest.groupNumber String?`

---

### 결정 5: 관리자 계정은 단일 계정, DB에 직접 등록

**결정:** 관리자 회원가입 기능 없음. DB에 `Admin` 레코드를 직접 생성한다.

**이유:**
- 단과대 규모의 시스템으로 관리자 1~2명이 전부
- 자체 회원가입 기능을 만들면 보안 관리 포인트가 늘어남

**현재 테스트 계정 (운영 전 변경 필수):**
- 아이디: `admin`
- 비밀번호: `admin1234`

**변경 방법:** `prisma/seed.ts` 수정 후 `npx prisma db seed` 재실행, 또는 DB에서 직접 bcrypt 해시로 업데이트

---

### 결정 6: 신청 상태 전이는 단방향, 되돌리기 없음

**결정:** 상태 전이는 다음만 허용한다.

```
pending → approved    관리자 승인
pending → rejected    관리자 거절 (사유 선택 모달)
approved → returned   반납 완료 처리
```

되돌리기(예: rejected → pending)는 UI에서 제공하지 않는다.

**이유:**
- 상태 역전이 허용되면 이미 다른 학생에게 승인된 재고 수량 계산이 복잡해짐
- 실무상 거절된 신청은 학생이 새로 제출하는 것이 더 명확함

---

### 결정 7: 날짜+시간 단위 대여 (일 단위 아님)

**결정:** 대여 시작과 반납 예정 시각을 날짜+시간(`datetime`)으로 받는다.

**이유:**
- 하루에 여러 팀이 같은 기자재를 오전/오후로 나눠 사용하는 경우를 수용
- 일 단위로 하면 오전에 반납해도 오후 신청이 불가하여 재고 낭비

**구현:** 커스텀 `DateTimePicker` 컴포넌트 (캘린더 + 시간 직접 입력)

---

### 결정 8: 기자재 이미지는 미구현

**결정:** 초기 버전에서 기자재 이미지 업로드/표시 기능은 만들지 않는다. 카테고리별 아이콘으로 대체한다.

**이유:** 이미지 스토리지(S3, Cloudinary 등) 설정 없이 빠르게 배포 가능하도록

**향후:** `Equipment.imageUrl` 컬럼은 이미 스키마에 있음. 스토리지 연동 후 추가 가능.

---

## 3. 기술 스택 선택 근거

| 기술 | 선택 이유 | 대안 검토 |
|------|-----------|-----------|
| **Next.js 14 App Router** | Server Components로 DB 직접 조회 → API 레이어 최소화. Server Actions로 폼 제출 처리 → 별도 REST API 불필요 | - |
| **SQLite (libsql)** | 초기 버전은 단일 서버 배포 예정. PostgreSQL로 전환 시 Prisma URL만 변경 | PostgreSQL (운영 규모 커지면 전환 예정) |
| **Prisma** | TypeScript 타입 자동 생성, 마이그레이션 관리 | Drizzle |
| **NextAuth.js v4** | 관리자 세션 관리. 추후 소셜 로그인 추가 시 확장 용이 | - |
| **Tailwind CSS + shadcn/ui** | 빠른 구현. shadcn은 복사 붙여넣기 방식으로 커스텀 자유도 높음 | - |
| **bcryptjs** | 비밀번호 해시 (관리자 + 조회용 비밀번호 모두 동일) | argon2 |

---

## 4. 구현 완료 기능 목록

### 공개 (학생용)
- [x] 기자재 목록 — 이름 검색 + 카테고리 필터
- [x] 기자재 상세 — 날짜 선택 시 가용 수량 실시간 확인 (API 호출)
- [x] 단건 대여 신청 — 신청번호 발급
- [x] 신청함 (다건 일괄 신청) — localStorage 카트, groupNumber 묶음
- [x] 신청 상태 조회 — 신청번호 + 비밀번호, rate limit, 그룹 묶음 표시

### 관리자
- [x] 로그인 (NextAuth, bcrypt)
- [x] 대시보드 — 승인 대기 수, 현재 대여 중 수, 반납 예정 목록, 기자재별 재고
- [x] 신청 관리 — 상태 탭 필터, 승인/거절(사유 모달)/반납 처리, 관리자 메모
- [x] 기자재 관리 — 등록, 수정, 활성/비활성화
- [x] 대여 이력 — 이름/학번/신청번호 검색, 기자재 필터, 날짜 범위 필터

### 인프라
- [x] 어드민 라우트 미들웨어 보호
- [x] 서버 사이드 가용 수량 재검증 (클라이언트 우회 방지)
- [x] rate limit (조회 비밀번호 5회 오입력 시 10분 잠금)

---

## 5. 미구현 / 향후 과제

### 기능 (미구현)
| 항목 | 내용 | 난이도 |
|------|------|--------|
| 기자재 이미지 업로드 | `Equipment.imageUrl` 컬럼 있음. S3/Cloudinary 연동 필요 | 중 |
| 신청 확인 알림 | 승인/거절 시 학생에게 카카오톡 or 이메일 알림 | 중~높음 |
| 관리자 계정 복수화 | 현재 단일 계정. Admin 테이블 확장 or RBAC 필요 | 중 |
| 기자재 예약 달력 뷰 | 기간별 예약 현황을 달력으로 시각화 | 중 |
| 모바일 반응형 개선 | 현재 태블릿 이상 기준 레이아웃 | 낮음 |
| 관리자 대시보드 차트 | 통계 수치를 시각화 (recharts 등) | 낮음 |

### 기술 부채
| 항목 | 내용 |
|------|------|
| DB 전환 | 운영 트래픽 증가 시 SQLite → PostgreSQL 전환. Prisma URL 변경 + 마이그레이션 재실행으로 대응 가능 |
| 테스트 커버리지 | lib 레이어(rental.ts, rate-limit.ts, password.ts)는 Vitest 테스트 있음. 컴포넌트/E2E 테스트 없음 |
| 이미지 최적화 | next/image 미사용. 이미지 추가 시 적용 필요 |

---

## 6. 로컬 개발 환경 설정

```bash
# 1. Node.js 버전 확인 (v20 이상 필요)
node -v

# 2. 의존성 설치
npm install

# 3. 환경변수 설정
cp .env.example .env
# .env에서 NEXTAUTH_SECRET 값 설정 (32자 이상 임의 문자열)

# 4. DB 마이그레이션 + 시드 데이터 적용
npx prisma migrate dev
npx prisma db seed

# 5. 개발 서버 실행
npm run dev
# → http://localhost:3000

# 관리자 로그인: admin / admin1234
```

### 환경변수 목록 (`.env`)

```
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[32자 이상 임의 문자열]"
```

---

## 7. 코드 구조 안내

```
src/
├── app/
│   ├── (public)/          ← 공개 라우트 (학생용). 공개 헤더+푸터 레이아웃
│   │   ├── layout.tsx       공개 헤더 (로고, 기자재 목록, 신청 조회, 신청함)
│   │   ├── page.tsx         기자재 목록
│   │   ├── equipment/[id]/  기자재 상세
│   │   ├── apply/           단건 대여 신청
│   │   ├── cart/            신청함 (다건)
│   │   └── status/          신청 조회
│   ├── admin/             ← 관리자 라우트. 어드민 헤더+사이드바 레이아웃
│   │   ├── layout.tsx       세션 확인 + 어드민 헤더 + AdminSidebar
│   │   ├── page.tsx         로그인
│   │   ├── dashboard/
│   │   ├── requests/
│   │   ├── equipment/
│   │   └── history/
│   ├── actions/
│   │   ├── rental.ts        학생용 Server Actions (신청, 조회)
│   │   └── admin.ts         관리자용 Server Actions (승인, 거절, 반납, 기자재 CRUD)
│   ├── api/
│   │   └── equipment/[id]/availability/route.ts  재고 확인 API (AJAX)
│   └── layout.tsx           루트 레이아웃 (html, body, SessionProvider만)
│
├── components/
│   ├── equipment/
│   │   ├── EquipmentCard.tsx      기자재 목록 카드
│   │   └── AvailabilityChecker.tsx 날짜 선택 + 재고 확인 + 신청 이동
│   ├── rental/
│   │   ├── RentalForm.tsx         단건 신청 폼
│   │   └── StatusLookup.tsx       신청 조회 폼
│   ├── cart/
│   │   ├── AddToCartButton.tsx    카드에 붙는 선택/선택됨 버튼
│   │   ├── CartHeaderButton.tsx   헤더의 신청함 버튼 (카운트 뱃지)
│   │   └── CartPageClient.tsx     신청함 전체 UI
│   ├── admin/
│   │   ├── AdminSidebar.tsx       어드민 사이드바 (active link 포함)
│   │   ├── ActionModal.tsx        승인/거절/반납 버튼 + 모달
│   │   ├── EquipmentForm.tsx      기자재 등록/수정 폼
│   │   └── SessionProviderWrapper.tsx
│   └── ui/
│       └── DateTimePicker.tsx     캘린더 + 시간 직접 입력 커스텀 피커
│
└── lib/
    ├── prisma.ts         Prisma 클라이언트 싱글턴
    ├── auth.ts           NextAuth 설정 (CredentialsProvider)
    ├── password.ts       bcrypt 해시/비교
    ├── rental.ts         getAvailableQuantity(), generateRequestNumber()
    ├── rate-limit.ts     메모리 기반 rate limit (서버 재시작 시 초기화)
    └── useCart.tsx       CartContext + useCart 훅
```

---

## 8. 주요 데이터 흐름

### 학생 신청 흐름

```
[학생] 폼 제출
  → RentalForm (client) → createRentalRequest() (Server Action)
    → getAvailableQuantity() 재검증  ← DB 실시간 계산
    → 통과: RentalRequest 생성 + requestNumber 반환
    → 실패: 에러 메시지 반환
```

### 일괄 신청 흐름

```
[학생] 신청함에서 제출
  → CartPageClient → createBatchRentalRequest() (Server Action)
    → 각 아이템별 getAvailableQuantity() 검증
    → 전체 통과 시: groupNumber 생성 → RentalRequest N건 일괄 생성
    → 하나라도 실패 시: 전체 거절
```

### 신청 조회 흐름

```
[학생] 신청번호 + 비밀번호 입력
  → lookupRequest() (Server Action)
    → rate limit 체크 (5회 오입력 잠금)
    → requestNumber로 RentalRequest 조회
    → bcrypt.compare(입력 비밀번호, 저장된 해시)
    → 성공: 신청 정보 + groupNumber로 묶인 전체 그룹 반환
    → 실패: 남은 시도 횟수 포함한 에러 메시지
```

---

## 9. 배포 참고사항

현재 개발 서버 기준이며, 운영 배포 전 다음을 반드시 확인:

1. **관리자 비밀번호 변경** — `prisma/seed.ts`에서 변경 후 재시드 또는 DB 직접 수정
2. **NEXTAUTH_SECRET 설정** — 운영용 랜덤 문자열 (32자 이상)
3. **DB 변경** — Vercel 배포 시 Vercel Postgres 또는 PlanetScale 연동. `DATABASE_URL` 변경 후 `prisma migrate deploy`
4. **rate-limit 메모리 저장소** — 현재 서버 메모리 기반. 멀티 인스턴스 배포 시 Redis로 교체 필요 (`src/lib/rate-limit.ts`)
5. **NEXTAUTH_URL** — 배포 도메인으로 변경
