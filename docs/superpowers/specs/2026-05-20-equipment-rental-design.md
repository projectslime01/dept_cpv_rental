# 영상콘텐츠과 기자재 대여 시스템 — 설계 문서

**작성일:** 2026-05-20  
**상태:** 승인됨

---

## 1. 개요

대학교 영상콘텐츠과 학생이 기자재를 온라인으로 신청하고, 관리자(조교/직원)가 승인·반납을 처리하는 웹 시스템. 로그인 없이 신청 가능하며, 조회용 비밀번호로 신청 상태를 확인한다.

---

## 2. 아키텍처

### 기술 스택

| 레이어 | 선택 |
|--------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 데이터베이스 | PostgreSQL + Prisma ORM |
| 인증 | NextAuth.js (관리자 세션만) |
| 스타일 | Tailwind CSS + shadcn/ui |
| 배포 | Vercel 또는 Ubuntu VPS (PM2) |

### 라우트 구조

```
/ (공개 — 로그인 불필요)
├── /                    기자재 목록 (카테고리 필터 + 검색)
├── /equipment/[id]      기자재 상세 + 날짜별 가용 수량
├── /apply               대여 신청 폼
└── /status              신청 조회 (신청번호 + 비밀번호)

/admin (관리자 세션 필요)
├── /admin               로그인
├── /admin/dashboard     현황 대시보드
├── /admin/requests      신청 목록 (승인/거절/반납 처리)
├── /admin/equipment     기자재 관리 (CRUD)
└── /admin/history       전체 대여 이력
```

---

## 3. 데이터 모델

```prisma
model Equipment {
  id            Int             @id @default(autoincrement())
  name          String
  category      String
  description   String?
  imageUrl      String?
  totalQuantity Int
  status        String          @default("active") // active | inactive
  requests      RentalRequest[]
  createdAt     DateTime        @default(now())
}

model RentalRequest {
  id            Int        @id @default(autoincrement())
  requestNumber String     @unique   // REQ-YYYYMMDD-NNNN
  passwordHash  String               // bcrypt
  applicantName String
  studentId     String
  phone         String
  equipment     Equipment  @relation(fields: [equipmentId], references: [id])
  equipmentId   Int
  quantity      Int
  startAt       DateTime             // 대여 시작 (날짜+시간)
  endAt         DateTime             // 반납 예정 (날짜+시간)
  purpose       String?
  status        String     @default("pending")
  // pending | approved | rejected | returned
  adminNote     String?
  returnedAt    DateTime?
  createdAt     DateTime   @default(now())
}

model Admin {
  id           Int    @id @default(autoincrement())
  username     String @unique
  passwordHash String
}
```

### 수량 계산 방식

- **전체 수량** = `Equipment.totalQuantity`
- **대여 중** = `status = approved` AND `startAt ≤ now ≤ endAt` 인 신청의 `quantity` 합산
- **대여 가능** = 전체 수량 − 대여 중 수량
- 재고 수량은 DB 컬럼이 아닌 실시간 계산 → 동기화 오류 방지

---

## 4. 사용자 흐름

### 학생 신청 흐름

```
1. / → 기자재 목록 (카테고리 탭 + 검색, 각 카드에 가용 수량 표시)
2. /equipment/[id] → 날짜+시간 선택 시 가용 수량 실시간 확인 → [대여 신청하기]
3. /apply → 신청 폼 작성
   - 필수: 이름, 학번, 연락처, 대여 시작/종료(날짜+시간), 수량, 조회용 비밀번호
   - 선택: 사용 목적
   - 제출 → 신청번호 발급 화면 (REQ-20260520-0001) + 메모 안내
4. /status → 신청번호 + 비밀번호 입력 → 상태 + 관리자 메모 확인
```

### 관리자 흐름

```
1. /admin → 로그인 (username + password)
2. /admin/dashboard
   - 오늘 대여 중 기자재 수, 신규 대기 신청 수
   - 반납 예정 목록 (D-Day 표시)
   - 기자재별 수량 현황: 기자재명 | 전체 | 대여 중 | 대여 가능
3. /admin/requests
   - 상태별 탭: 전체 / 대기 / 승인 / 거절 / 반납완료
   - 각 행: 신청자명, 학번, 기자재, 기간, 수량
   - 액션: [승인] [거절 + 사유 모달] / 승인 건은 [반납완료]
4. /admin/equipment
   - 기자재 목록: 기자재명 | 카테고리 | 전체 수량 | 대여 중 | 대여 가능 | 상태
   - [추가] [수정] [비활성화]
5. /admin/history
   - 전체 대여 이력 (날짜/기자재/학생 필터)
```

---

## 5. 엣지 케이스 & 제약 규칙

### 중복 신청 방지
- 신청 제출 시 서버에서 해당 기간의 `approved` 수량 합산 검증
- 가용 수량 초과 시 신청 거절 (학생 화면에서도 실시간 표시)

### 신청 상태 전이
```
pending → approved   (관리자 승인)
pending → rejected   (관리자 거절)
approved → returned  (관리자 반납 처리)
rejected → (종료)    재신청은 새 신청서 작성
```

### 조회용 비밀번호
- 4~8자리 숫자/문자 (학생이 직접 설정)
- 5회 연속 오입력 시 10분 잠금 (브루트포스 방지)
- 분실 시 관리자에게 직접 문의 (별도 복구 기능 없음)

### 기자재 비활성화
- 비활성화된 기자재는 학생 목록에서 숨김
- 기존 `approved` 대여 건은 영향 없음

---

## 6. 보안

- 관리자 페이지 전체 세션 미들웨어 보호 (`/admin/*`)
- 조회용 비밀번호 bcrypt 해시 저장 (평문 미저장)
- 신청 수량 검증은 반드시 서버 사이드에서 재검증 (클라이언트 우회 방지)
- 관리자 비밀번호 bcrypt 해시 저장

---

## 7. 벤치마킹 참고

| 사이트 | 참고 포인트 |
|--------|------------|
| [CMU Art Connect2](https://cmuart.getconnect2.com) | 달력 기반 예약, 기자재 카탈로그 구조 |
| [Yale BMEC](https://studenttechnology.yale.edu/student-resources/bass-media-equipment-checkout) | 심플한 신청 흐름 |
| [WebCheckout](https://webcheckout.net) | 관리자 대시보드 수량 현황 레이아웃 |
| [시청자미디어재단](https://kcmf.or.kr) | 국내 미디어 기자재 대여 운영 방식 |
