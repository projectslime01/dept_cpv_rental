# 대여 관리 시스템 — 재사용 청사진 (PROJECT BLUEPRINT)

> 이 문서 하나면 **같은 구조의 대여/예약 관리 사이트**를 새로 만들 수 있다.
> 새 프로젝트를 시작할 때 담당 에이전트에게 **① 기관/사이트 이름, ② 대여 품목 목록,
> ③ 바꿀 규칙(수정사항)** 만 주면, 이 청사진을 기준으로 작업을 이어갈 수 있도록 작성했다.
>
> 원본 레퍼런스 프로젝트: 연성대학교 영상콘텐츠과 기자재/강의실 통합 대여 시스템
> (`git@github.com:projectslime01/dept_cpv_rental.git`, 프로덕션 `https://dept-cpv-rental.vercel.app`)

---

## 0. 새 프로젝트 시작 체크리스트 (요약)

담당자가 "이름 + 품목 + 수정사항"만 줬을 때 순서대로 처리한다.

1. **레포 복제 → 이름/브랜딩 치환** — §9.1
2. **품목(장비) 시드 교체** — `prisma/seed.ts`의 `equipmentData`, 카테고리는 `src/lib/categories.ts`의 `CATEGORY_ORDER` — §5, §9.2
3. **대여 규칙 상수 조정** — 대여 정책은 대부분 `src/lib/rentalUtils.ts` 한 파일에 모여 있다 — §4, §9.3
4. **자격/학년/커스텀 문구** — `src/lib/grade.ts`, `src/lib/eligibility.ts` — §6
5. **환경변수 + DB 초기화** — §8
6. **배포** — §8.3 (fresh clone → `main` 푸시, Vercel 자동 배포)

> 핵심 원칙: **정책·표시 순서·문구는 코드 곳곳이 아니라 지정된 "단일 소스" 파일에서만 바꾼다.** (§4~§6)

---

## 1. 프로젝트 개요

학과(또는 조직) 구성원이 **기자재(장비)와 강의실(공간)을 온라인으로 신청**하고,
관리자가 **승인·반납·재고·이력**을 관리하는 풀스택 웹앱.

- **공개(학생) 영역** `/` : 장비 카탈로그, 단건/장바구니(다건) 신청, 강의실 신청, 신청 조회, 전체 대여 현황(달력), 이용 가이드, 대여 규정(PDF).
- **관리자 영역** `/admin` : 대시보드, 신청 관리(승인/거절/반납), 기자재·강의실·부속 관리, 학생 명단, 대여 제한자, 대여 이력, 계정 관리, 테스트 신청, 규정 무시 수동 등록.
- **인증**: 관리자만 로그인(NextAuth Credentials). 학생은 로그인 없이 "신청번호+비밀번호"로 본인 신청을 조회.

---

## 2. 기술 스택

| 영역 | 사용 |
|---|---|
| 프레임워크 | **Next.js 14 (App Router)**, React 18, Server Actions |
| 언어 | TypeScript (strict) |
| DB/ORM | **Prisma 7** + **PostgreSQL(Neon)**. 로컬은 SQLite로도 구동 가능(어댑터 전환) |
| DB 드라이버 | `@prisma/adapter-neon`(서버리스/HTTP), `@prisma/adapter-better-sqlite3`(로컬) |
| 인증 | **NextAuth 4** (CredentialsProvider, JWT 세션) |
| 스타일 | **Tailwind CSS** + 커스텀 CSS 변수 토큰(라이트/다크), `tailwindcss-animate`, Radix UI 일부 |
| 아이콘 | `lucide-react` |
| 비밀번호 | `bcryptjs` |
| 날짜 | `date-fns` (+ 자체 KST 유틸) |
| 엑셀(명단) | `xlsx` (SheetJS) |
| 테스트 | **vitest**(단위), Playwright(E2E) |
| 배포 | **Vercel** (region `icn1`) |

빌드 커맨드(`vercel.json`): `node scripts/prepare-db.js && prisma generate && prisma db push && prisma db seed && next build`
→ 배포 시 **스키마가 자동으로 DB에 push되고 seed가 실행**된다. 마이그레이션 파일이 아니라 `db push` 방식.

---

## 3. 디렉터리 구조

```
src/
  app/
    (public)/            # 학생/공개 영역 (레이아웃 공유)
      page.tsx           # 홈 = 기자재 대여 목록(카탈로그) + 카테고리 필터
      equipment/[id]/    # 장비 상세 + 단건 신청(RentalForm, 다단계)
      cart/              # 장바구니(다건) 신청 (CartPageClient)
      classrooms/…       # 강의실 목록/상세/신청
      status/            # 신청 조회 (StatusLookup)
      rental-status/     # 전체 대여 현황(달력, GlobalRentalCalendar)
      guide/ regulations/# 이용 가이드 / 대여 규정(PDF)
    admin/               # 관리자 영역 (AdminSidebar + AdminBottomNav 레이아웃, 인증 필요)
      dashboard/ requests/ classroom/ equipment/ classrooms/
      students/ restrictions/ history/ accounts/ guide/
      test-request/      # 테스트 신청(재고엔 미반영, status=pending)
      manual-request/    # 규정 무시 수동 등록(즉시 승인, 재고 반영)
    api/
      auth/[...nextauth]/  rentals/  equipment/[id]/availability/
      equipment/[id]/accessories/  classrooms/[id]/availability/
      students/verify/  health/
    actions/             # ★ 서버 액션(핵심 비즈니스 로직)
      rental.ts          #   기자재 신청 생성(단건/배치)·조회·재고
      classroomRental.ts #   강의실 신청
      admin.ts           #   승인/거절/반납, 장비·강의실·부속 CRUD, 테스트/수동 등록
      admin-accounts.ts  #   관리자 계정 (owner만 추가/삭제)
      students.ts restrictions.ts timetable.ts
  components/
    rental/  cart/  equipment/  classroom/  guide/  admin/  ui/
  lib/                   # ★ 순수 로직·설정의 "단일 소스"들 (§4~§6)
prisma/
  schema.prisma  seed.ts  migrations/
scripts/
  prepare-db.js          # provider(postgres/sqlite) 자동 전환
  generate-guide-pdf.ts  set-equipment-grades.ts  migrate-legacy-requests.ts
```

---

## 4. 데이터 모델 (`prisma/schema.prisma`)

주요 모델과 역할. **새 프로젝트에서 "예약 대상"만 바뀌면 대부분 그대로 재사용**한다.

- **Equipment** — 대여 품목. `totalQuantity`(총 보유), `minRentalQuantity`/`maxRentalQuantity`(1회 신청 최소/최대), `minGrade`(대여 가능 최소 학년 1/2/3), `category`, `status`(active/inactive).
- **RentalRequest** — 기자재 신청. `requestNumber`(REQ-YYYYMMDD-####, 표시/조회 키), `groupNumber`(2건 이상 묶음 신청이면 대표 신청번호 공유), `passwordHash`(조회용), `applicantName/studentId/phone`, `quantity`, `grade`(명단에서 확정), `startAt/endAt`, `purpose`, `groupMembers`(팀플 조원, 선택), `status`(pending/approved/rejected/returned), `adminNote`, `returnedAt`, `isTest`(테스트 신청 표시), `testAdminId`.
- **EquipmentAccessory** — 부속 기자재(배터리·케이블 등). `sharedStockKey`가 같은 부속끼리는 **물리적 재고 풀을 공유**(예: FX3·A7M4 공용 배터리). null이면 단독 재고.
- **RentalRequestAccessory** — 신청↔부속 연결(수량). `@@unique([rentalRequestId, accessoryId])`.
- **Admin** — 관리자. `role`(**owner**=계정 추가/삭제 가능 / **staff**=자기 비번만). 새 계정은 기본 staff.
- **Classroom / ClassroomTimetable / ClassroomRentalRequest** — 강의실·정규수업 시간표·강의실 신청. 시간표와 겹치면 신청 차단.
- **Student** — 학과 명단(학번=PK, name, grade, major). **명단에 없으면 신청 차단**. `major`로 전공별 명부 교체 범위 구분.
- **StudentRosterUpload** — 명단 업로드 이력.
- **RentalRestriction** — 대여 제한자(노쇼/손망실/연체). `endAt` 지나면 자동 해제, `releasedAt`로 수동 해제.
- **RateLimitAttempt** — 조회 비밀번호 무차별 대입 방지.

> **DDL 변경 방식**: 마이그레이션이 아니라 `prisma db push`. 컬럼 추가는 **nullable로** 하면 기존 앱·데이터에 비파괴적(운영 중 미리 push해도 안전).

---

## 5. 도메인 규칙 — 대여 정책 (단일 소스: `src/lib/rentalUtils.ts`)

대여 가능 여부를 판정하는 순수 함수가 **한 파일에 모여 있다.** 규칙을 바꾸려면 여기만 본다.

- `isSubmissionTimeValid(date)` — **신청(폼 제출)은 평일 09:00~17:00, 공휴일 제외**.
- `getEarliestAllowedStartDate(applyDate)` / `isValidStartDate` — **대여 시작은 신청일 기준 평일 2일 전** 이후.
- `countWeekdaysInRange(start, end)` — 대여 기간 내 **평일(영업일) 수** (기간 초과 판정용).
- `includesWeekend` / `isValidWeekendRental` — **주말 포함 시 반드시 금요일 반출·월요일 반납**.
- `isHoliday(date)` — 한국 공휴일(양력 고정 + 연도별 음력·대체공휴일 하드코딩). **연도가 바뀌면 갱신 필요**.
- `generateRequestNumber(date, id)` → `REQ-YYYYMMDD-0001`.

### ⚠️ 타임존 처리 — 이 프로젝트에서 가장 중요한 함정
폼에서 오는 `startAt/endAt`은 **"YYYY-MM-DDTHH:mm" (KST 벽시계) 문자열**이고, 서버 타임존으로 파싱되어 저장된다. 이미 벽시계 값이므로 **여기에 다시 KST 변환을 걸면 UTC 서버(Vercel)에서 +9시간이 이중 적용**되어 오후 값이 다음 날로 밀린다.
- **저장된 신청 값(startAt/endAt)** → 변환 금지. `getWallClockDayStart()`로 로컬 필드 그대로 읽고, 요일은 `Date.getDay()` 그대로 사용.
- **클라이언트로 보낼 때** → `toWallClockString()` 사용(‑Z 없는 문자열). `toISOString()` 쓰면 안 됨(브라우저가 9시간 당겨 해석).
- **"현재 시각"으로 DB와 비교**할 때만 `nowKST()` / `getKSTHoursAndMinutes()`(실제 순간 → KST) 사용.
- 이 규칙은 `src/lib/__tests__/rentalUtils.test.ts`가 **TZ=UTC와 TZ=Asia/Seoul 양쪽에서** 검증한다. 규칙을 바꾸면 이 테스트를 먼저 손본다.

### 재고(가용 수량) 계산 (`src/lib/rental.ts`)
- `getAvailableQuantity` = `totalQuantity − Σ(겹치는 기간의 status='approved' 신청 수량)`.
- **`status='approved'`만 재고를 차감**한다. 그래서 **테스트 신청(pending 유지)은 재고에 영향 없음**, **수동 등록(즉시 approved)은 재고 차감**.

---

## 6. 표시/자격 설정 (단일 소스)

| 바꿀 것 | 파일 | 함수/상수 |
|---|---|---|
| **카테고리 표시 순서** (목록·필터칩·드롭다운·품목 나열 전부) | `src/lib/categories.ts` | `CATEGORY_ORDER`, `sortByCategory()`, `groupByCategory()`, `categoryIndex()` |
| **학년 자격 판정** | `src/lib/grade.ts` | `canRentByGrade(grade, minGrade)` — grade ≥ minGrade |
| **자격 표시 문구** (학년 대신 "이수 과목" 등 커스텀) | `src/lib/eligibility.ts` | `CUSTOM_ELIGIBILITY_LABEL` 맵 + `eligibilityLabel(name, minGrade)` — **표시만 바꾸고 검증엔 영향 없음** |
| **수량 단위** (카메라 바디='대', 그 외='개') | `src/lib/requestGrouping.ts` | `unitFor(category)` |
| **묶음(일괄) 신청 표시** | `src/lib/requestGrouping.ts` | `groupRequests()`, `formatItemList()` — 같은 `groupNumber`를 한 건으로 |

> `CATEGORY_ORDER`는 **앱 전역 단일 소스**다. 예전엔 별도 `categoryOrder.ts`가 중복 존재했다가 이 파일로 통합했다. 새로 만들지 말 것.
> 목록 어디서든 카테고리 정렬이 필요하면 `sortByCategory`/`groupByCategory`를, 순서 배열은 `CATEGORY_ORDER`를 재사용한다.

---

## 7. 관례 & 함정 (에이전트가 반드시 지킬 것)

1. **타임존 벽시계 규칙** (§5) — 신규 날짜 로직 추가 시 반드시 준수. TZ=UTC/Asia-Seoul 양쪽 테스트.
2. **재고엔 approved만 반영** — 신규 "신청 생성" 경로를 만들 때 status를 명확히(테스트=pending, 실제/수동=approved).
3. **묶음 신청** — 다건 생성 시 2건 이상이면 첫 신청번호를 `groupNumber`로 공유해야 "한 건"으로 표시된다.
4. **부속 공유 재고** — 부속 가용 수량은 `sharedStockKey` 그룹 기준. `src/lib/accessory.ts`의 `getAvailableAccessoryQuantity` 사용.
5. **명단 대조** — 학생 신청은 `roster.server.ts`의 `verifyStudent(studentId, name)`로 차단/통과, **학년은 서버가 명단 값으로 확정**(클라이언트 입력 불신).
6. **대여 제한자** — 신청 전 `getActiveRestriction`로 차단.
7. **권한(role)** — 파괴적/민감 관리 기능은 서버 액션에서 `role`로 재검증(예: 계정 추가/삭제는 owner만, `admin-accounts.ts`의 `requireOwner`). **UI 숨김만으로 끝내지 말 것.**
8. **품목 나열 순서** — 관리자 화면의 "대여 품목"은 카테고리 순(`sortByCategory`)으로 정렬, 부속은 각 품목 아래 `└ 부속: …`로 표시.
9. **CSS 오버플로 팝업** — 달력/드롭다운 팝업이 카드에 잘리면 부모 `overflow-hidden` 제거 또는 드롭업 처리(`DatePicker`가 참고 예시).
10. **검증 실수로 실데이터 건드리지 말 것** — dev 서버가 **프로덕션 Neon DB에 연결**된다. 디버그/검증용으로 만든 레코드는 반드시 정리(삭제)하고, 절대 실제 계정/데이터를 삭제 대상으로 삼지 말 것.

---

## 8. 개발·환경·배포

### 8.1 환경변수
- `.env` — **provider 전환용 placeholder**가 들어있을 수 있음(예: `DATABASE_URL="file:./prisma/dev.db"`). `prisma.config.ts`는 `dotenv/config`로 **`.env`만** 로드한다.
- `.env.local` — **실제 Neon `DATABASE_URL`**, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. Next 런타임은 이걸 사용.
- 필수 키: `DATABASE_URL`(postgres… Neon), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.

### 8.2 로컬 개발
```bash
npm install
npx prisma generate
npm run dev        # 프로덕션 Neon DB에 연결됨(주의) — .env.local 기준
npm test           # vitest (rentalUtils 등 정책 테스트)
```
- **스키마 변경 후**: `prisma generate` → dev 서버 재시작 필요.
- **`prisma db push`가 로컬에서 placeholder(dev.db)로 붙는 문제**: `prisma.config.ts`가 `.env`만 읽기 때문. 실제 DB로 push하려면 `.env.local`의 URL을 명시적으로 주입:
  ```bash
  DBURL="$(grep -E '^DATABASE_URL=' .env.local | cut -d= -f2- | sed 's/^\"//; s/\"$//')" \
    DATABASE_URL="$DBURL" npx prisma db push
  ```
- **Neon 콜드 스타트(P1001 can't reach)**: 엔드포인트가 절전 중이면 실패. dev 서버(HTTP 드라이버)로 아무 DB 조회를 한 번 쳐서 **깨운 뒤 재시도**하면 성공한다.

### 8.3 배포 워크플로우 (이 세션에서 실제 사용한 방식)
- 편집용 워크트리와 별개로, **깨끗한 fresh clone에서 커밋 → `main` 푸시 → Vercel 자동 배포**.
  ```bash
  git clone git@github.com:<owner>/<repo>.git work && cd work
  # 파일 반영 후
  git add -A && git commit -m "…"      # 커밋 메시지 끝에 Co-Authored-By 권장
  git push origin HEAD:main
  ```
- 스키마를 바꿨으면 **미리 nullable 컬럼을 db push**해도 되고(비파괴적), 안 해도 Vercel 빌드가 `prisma db push`로 반영한다.
- 배포 확인: `curl https://<도메인>/<경로>`로 새 문구/요소가 뜨는지 폴링.

### 8.4 검증 관례
- 소스 편집 후 `npx tsc --noEmit`로 타입 확인.
- UI/동작은 브라우저 프리뷰로 확인(관리자 화면은 로그인 필요 — 미인증 시 서버 액션이 `Unauthorized`로 막히는 게 정상).
- 임시 검증이 필요하면 `src/app/api/<임시>/route.ts` 디버그 라우트를 만들어 서버 런타임에서 확인 후 **삭제**. (폴더명이 `_`로 시작하면 App Router가 라우팅에서 제외하니 주의.)

---

## 9. 새 프로젝트로 바꾸는 법 (이름·품목·수정사항)

### 9.1 이름/브랜딩
- 헤더·타이틀·메타: `src/app/layout.tsx`, `(public)/layout.tsx`, 각 페이지 헤딩 문자열.
- 로고/파비콘: `public/` 자산.
- 대여 규정 PDF: `public/regulations/…`, 페이지 문구: `(public)/regulations/page.tsx`.
- 이용 가이드 내용: `src/lib/guide-content.ts` (+ 렌더 `components/guide/*`), PDF 생성 `scripts/generate-guide-pdf.ts`.

### 9.2 품목(장비)·카테고리
- 초기 장비 목록: `prisma/seed.ts`의 `equipmentData` 배열(name, category, totalQuantity, description, 필요 시 minGrade/max…). seed는 배포 빌드에서 실행됨.
- 카테고리 종류/순서: `src/lib/categories.ts` `CATEGORY_ORDER` (목록·필터·드롭다운·품목 나열 전부 여기 따름).
- 운영 중 추가/수정은 관리자 "기자재 관리" 화면에서도 가능(`admin.ts`의 `createEquipment`/`updateEquipment`).
- 부속 기자재는 관리자 "부속 관리"(`EquipmentAccessoryManager`) + 공용 재고는 `sharedStockKey`.

### 9.3 규칙(수정사항) — 자주 바뀌는 것들의 위치
| 바꿀 규칙 | 위치 |
|---|---|
| 신청 가능 시간대(평일 09~17 등) | `rentalUtils.ts` `isSubmissionTimeValid` |
| 며칠 전 예약(평일 2일 전) | `rentalUtils.ts` `getEarliestAllowedStartDate` |
| 주말 반출/반납 규칙 | `rentalUtils.ts` `isValidWeekendRental` |
| 공휴일(연도 갱신) | `rentalUtils.ts` `isHoliday` |
| 1회 신청 최소/최대 수량 | Equipment `minRentalQuantity`/`maxRentalQuantity` (관리자 화면/seed) |
| 학년/자격 제한 | Equipment `minGrade` + `grade.ts` + 문구 `eligibility.ts` |
| 카테고리 순서 | `categories.ts` `CATEGORY_ORDER` |
| 수량 단위(대/개) | `requestGrouping.ts` `unitFor` |
| 규정 무시 즉시 등록 필요 | `admin.ts` `createManualBatchRentalRequest`(참고 구현) |

---

## 10. 레퍼런스 프로젝트에서 구현된 기능 인벤토리

학생: 카탈로그+카테고리 필터, 단건/장바구니 다건 신청, 부속 선택, 강의실 신청, 신청 조회(묶음/부속/조원 표시), 전체 대여 현황(달력, 이름 마스킹), 가이드, 규정 PDF.
관리자: 대시보드(**대여 예정/반납 예정**, 재고 현황), 신청 관리(단건·묶음 승인/거절/반납, 카테고리 필터, **품목·부속·조원 표시**), 기자재·강의실·부속·시간표 관리, 학생 명단(엑셀 업로드), 대여 제한자, 대여 이력, **계정 관리(owner 전용 추가/삭제)**, 테스트 신청, **규정 무시 수동 등록(다건·즉시 승인·재고 반영)**.

### 이 세션에서의 주요 개선 이력(요약)
- 대여 기간 평일 계산의 **이중 KST 변환 버그** 수정(벽시계 유틸 도입, UTC/Seoul 테스트).
- 전체 대여 현황 날짜 어긋남(`toWallClockString`) 및 **묶음 신청을 한 건으로** 통합 표시.
- 렌즈 최대 수량 1로 조정, 규정 PDF/가이드 갱신·가독성 개선.
- 계정 추가/삭제를 **owner(관리자·특정 계정)만** 가능하도록 `role` 기반 서버 검증.
- DatePicker 잘림(오버플로) 수정, 장바구니 부속 선택·`+` 버튼 버그 수정.
- FX3 자격 문구를 "촬영기초, 심화 이수자"로(표시만).
- **규정 무시 수동 등록**(관리자) 신설 + **다건 등록** + 폼 레이아웃 개선.
- **카테고리 표시 순서 통합**(단일 소스) + 목록/필터/품목 나열 전반 반영.
- 관리자 품목 확인 화면에 **부속 기자재 표시**.
- 대시보드에 **기자재/강의실 대여 예정** 섹션 추가.
- 기자재 신청에 **조원 이름(선택, 팀플)** 필드 추가.

---

## 11. 빠른 참조 — 핵심 파일 지도

- 정책(시간/기간/주말/공휴일/번호): `src/lib/rentalUtils.ts` (+ 테스트 `__tests__/rentalUtils.test.ts`)
- 재고/가용: `src/lib/rental.ts`, 부속: `src/lib/accessory.ts`
- 카테고리 순서/그룹: `src/lib/categories.ts` — 묶음/단위/포맷: `src/lib/requestGrouping.ts`
- 자격: `src/lib/grade.ts`, 문구: `src/lib/eligibility.ts`
- 신청 생성/조회(기자재): `src/app/actions/rental.ts` — 강의실: `classroomRental.ts`
- 관리자 처리·CRUD·테스트/수동 등록: `src/app/actions/admin.ts` — 계정: `admin-accounts.ts`
- 인증: `src/lib/auth.ts` + `api/auth/[...nextauth]`
- 명단: `src/lib/roster*.ts`, 제한자: `restriction*.ts`, 레이트리밋: `rate-limit.ts`
- 학생 폼: `components/rental/RentalForm.tsx`(단건), `components/cart/CartPageClient.tsx`(다건)
- 관리자 폼: `components/admin/ManualRequestForm.tsx`, `TestRequestForm.tsx`, `EquipmentForm.tsx` 등
- DB/시드/전환: `prisma/schema.prisma`, `prisma/seed.ts`, `scripts/prepare-db.js`
- 배포 설정: `vercel.json`(빌드에서 db push+seed)

---

_이 문서는 레퍼런스 프로젝트 커밋 `ef801f2` 기준으로 작성되었다. 구조가 바뀌면 §3·§11의 경로를 함께 갱신할 것._
