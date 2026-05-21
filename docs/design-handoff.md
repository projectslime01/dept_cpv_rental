# 영상콘텐츠과 기자재 대여 시스템 — Design Handoff

> **대상**: Figma, Framer, v0, Locofy 등 AI 디자인 툴 또는 디자이너  
> **스택**: Next.js 14 · Tailwind CSS · shadcn/ui · lucide-react  
> **현재 구현 저장소**: `git@github.com:projectslime01/dept_cpv_rental.git` (branch: `main`)

---

## 1. 서비스 개요

**영상콘텐츠과 학생**이 카메라, 렌즈, 조명 등 기자재를 **온라인으로 대여 신청**하고 관리자가 승인하는 시스템.

| 구분 | 설명 |
|------|------|
| 공개 사용자 | 기자재 목록 조회 → 대여 신청 → 신청 번호로 상태 조회 |
| 관리자 | 로그인 → 신청 승인/거절/반납 처리 → 기자재 등록/수정 |

---

## 2. 페이지 구조

### 공개 (Public)
| 경로 | 페이지명 | 핵심 컴포넌트 |
|------|----------|----------------|
| `/` | 기자재 목록 | 검색바, EquipmentCard 그리드 |
| `/equipment/[id]` | 기자재 상세 | 장비 정보 카드, AvailabilityChecker |
| `/apply` | 대여 신청 | RentalForm (단건) |
| `/cart` | 신청함 | CartPageClient (일괄 신청) |
| `/status` | 신청 조회 | StatusLookup |

### 관리자 (Admin — 로그인 필요)
| 경로 | 페이지명 |
|------|----------|
| `/admin` | 로그인 |
| `/admin/dashboard` | 대시보드 (통계 + 기자재 재고) |
| `/admin/requests` | 신청 관리 (승인/거절/반납 처리) |
| `/admin/equipment` | 기자재 관리 (등록/수정/비활성화) |
| `/admin/history` | 대여 이력 (검색 필터) |

---

## 3. 디자인 토큰

### 색상 팔레트

#### 페이지 배경
```
body background:  #f6f7f9   (bg-[#f6f7f9])
card background:  #ffffff
```

#### 핵심 색상
```
브랜드 강조:  sky-400  → #38bdf8
              sky-500  → #0ea5e9
텍스트 주요:  slate-900 → #0f172a
텍스트 보조:  slate-500 → #64748b
텍스트 힌트:  slate-400 → #94a3b8
테두리:       slate-100 → #f1f5f9
              slate-200 → #e2e8f0
```

#### 헤더 (Public)
```
배경:   bg-slate-900  → #0f172a
텍스트: text-white
아이콘 박스: bg-sky-500/20 border-sky-500/30
아이콘 색:   text-sky-400
네비 기본:   text-slate-300
네비 호버:   text-white bg-slate-800
```

#### 어드민 헤더
```
배경:   bg-slate-900  (공개와 동일)
"관리자" 뱃지: bg-slate-700 text-slate-300 rounded-full px-2 py-0.5 text-xs
```

#### 어드민 사이드바
```
배경:   bg-white border-r border-slate-200
활성 링크: bg-slate-900 text-white rounded-xl
비활성 링크: text-slate-600 hover:bg-slate-50 hover:text-slate-900
```

#### 상태 뱃지 (Status Badge)
```
승인 대기 (pending):  bg-amber-50   text-amber-700  border-amber-200
승인됨   (approved): bg-emerald-50 text-emerald-700 border-emerald-200
거절됨   (rejected): bg-red-50     text-red-600    border-red-200
반납 완료 (returned): bg-slate-100  text-slate-600  border-slate-200
```

#### 카테고리 뱃지 & 아이콘 색상
```
카메라 바디:   icon: text-sky-600    bg-sky-50    / badge: text-sky-700    bg-sky-50    border-sky-200
렌즈:          icon: text-violet-600 bg-violet-50 / badge: text-violet-700 bg-violet-50 border-violet-200
영상 장비:     icon: text-blue-600   bg-blue-50   / badge: text-blue-700   bg-blue-50   border-blue-200
조명:          icon: text-amber-600  bg-amber-50  / badge: text-amber-700  bg-amber-50  border-amber-200
저장 매체:     icon: text-emerald-600 bg-emerald-50/ badge: text-emerald-700 bg-emerald-50 border-emerald-200
삼각대/지지대: icon: text-slate-600  bg-slate-100 / badge: text-slate-700  bg-slate-100 border-slate-200
필터:          icon: text-indigo-600 bg-indigo-50 / badge: text-indigo-700 bg-indigo-50 border-indigo-200
배터리:        icon: text-orange-600 bg-orange-50 / badge: text-orange-700 bg-orange-50 border-orange-200
음향:          icon: text-pink-600   bg-pink-50   / badge: text-pink-700   bg-pink-50   border-pink-200
기타:          icon: text-gray-500   bg-gray-100  / badge: text-gray-600   bg-gray-100  border-gray-200
```

#### 가용 수량 표시
```
대여 가능 (> 0): text-emerald-500, progress bar bg-emerald-400
대여 불가 (= 0): text-red-400,     progress bar bg-red-300
```

---

### 타이포그래피

```
폰트:    Inter (Google Fonts, variable font)
본문:    text-sm  → 14px
소제목:  text-xs  → 12px
h1:      text-2xl font-bold → 24px 700
h2:      text-xl  font-bold → 20px 700
카드 제목: text-sm font-semibold
레이블:   text-xs  font-medium text-slate-400 uppercase tracking-wider
모노스페이스(신청번호): font-mono
```

---

### 간격 & 레이아웃

```
페이지 최대 너비: max-w-5xl (1024px) mx-auto px-4
헤더 높이:       h-14 (56px)
어드민 사이드바: w-52 (208px)
카드 패딩:       p-5, p-6
섹션 간격:       space-y-5, space-y-6
```

---

### 테두리 & 그림자

```
카드:     rounded-2xl border border-slate-100 shadow-sm
카드 호버: hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
입력창:   rounded-xl border border-slate-200
버튼:     rounded-xl
뱃지:     rounded-full border
내부 섹션 카드: rounded-xl border border-slate-100
```

---

## 4. 컴포넌트 규격

### Button (버튼)

#### Primary (기본)
```
bg-slate-900 hover:bg-slate-700 text-white
text-sm font-bold
h-10 (small) / h-11 (medium) / h-12 (large)
rounded-xl
disabled:opacity-40 disabled:cursor-not-allowed
```

#### Secondary (보조)
```
border border-slate-200 text-slate-600 hover:bg-slate-50
text-sm font-semibold
h-10 rounded-xl
```

#### Danger / Destructive
```
bg-red-500 hover:bg-red-600 text-white rounded-xl
```

---

### Input (입력창)
```
h-10 px-3.5 rounded-xl
border border-slate-200
bg-slate-50  →  focus: bg-white border-slate-400
text-sm
placeholder:text-slate-300
focus:outline-none transition-colors
```

#### Textarea
```
px-3.5 py-2.5 rounded-xl
border border-slate-200 bg-slate-50
resize-none text-sm
```

#### Select
```
h-9 px-3.5 rounded-xl
border border-slate-200 bg-white text-sm
```

---

### Card (카드)
```
bg-white rounded-2xl border border-slate-100 shadow-sm
```

#### Section Card (섹션 헤더 있는 카드)
```
[헤더] flex items-center gap-2 px-5 py-3.5 border-b border-slate-50
  Icon: w-4 h-4 text-slate-400
  Text: text-sm font-semibold text-slate-700
  Count badge (optional): text-xs text-slate-400 ml-auto
[내용] p-5
```

---

### Badge (뱃지)
```
inline-flex items-center
text-xs font-semibold
px-2.5 py-1 rounded-full border
```
상태별 색상은 위 3.색상 팔레트 참조.

---

### EquipmentCard (기자재 카드)
```
레이아웃: flex-col, min-h ~160px
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[헤더]  px-4 pt-4 pb-3
  ┌ 카테고리 아이콘 p-2 rounded-xl  (카테고리별 배경색)
  └ 기자재명 text-sm font-semibold + 카테고리 뱃지

[설명] px-4 text-xs text-slate-500 line-clamp-1

[가용 수량] px-4 pt-3 pb-3
  ┌ "대여 가능" label + 숫자 (text-base font-black)
  └ 진행률 바 h-1 rounded-full

[액션] px-4 pb-4 flex gap-2 border-t pt-3
  ┌ 선택 버튼 (AddToCartButton, w-auto)
  └ 상세/단건 신청 버튼 (flex-1, bg-slate-900)
     or "대여 불가" (disabled state)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
호버: shadow-md -translate-y-0.5
```

---

### 어드민 테이블
```
테이블 컨테이너: bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden

<thead>
  tr: bg-slate-50 border-b border-slate-100
  th: px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap

<tbody>
  tr: hover:bg-slate-50 transition-colors
      divide-y divide-slate-50
  td: px-4 py-3

외부 래퍼: overflow-x-auto (가로 스크롤)
```

---

## 5. 페이지별 레이아웃 상세

### 공개 헤더 (sticky, z-40)
```
bg-slate-900 h-14 border-b border-slate-800
max-w-5xl mx-auto px-4

왼쪽: 로고
  [카메라 아이콘 박스 w-7 h-7 rounded-lg]
  "영상콘텐츠과 기자재" (white + sky-400)

오른쪽: 네비게이션
  [List 아이콘] 기자재 목록
  [Search 아이콘] 신청 조회
  [ClipboardList 아이콘] 신청함 (sky-400 카운트 뱃지)
```

---

### 기자재 목록 페이지 (`/`)
```
헤더:
  h1 "기자재 대여 목록" text-2xl font-bold
  subtitle "전체 N종 · 대여 가능 N종" text-sm text-slate-500

검색 영역 (bg-white rounded-2xl border shadow-sm p-4):
  [Search 아이콘] 텍스트 입력  +  [SlidersHorizontal 아이콘] 카테고리 드롭다운  +  검색 버튼

그리드: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
  → EquipmentCard × N
```

---

### 기자재 상세 페이지 (`/equipment/[id]`)
```
max-w-2xl

breadcrumb: 기자재 목록 > {이름}

기자재 정보 카드 (bg-white rounded-2xl):
  [카테고리 아이콘 박스 p-3 rounded-2xl] + 기자재명(h1) + 카테고리 뱃지 + 총 보유 수
  + [AddToCartButton] 오른쪽 상단
  + 설명 (bg-slate-50 rounded-xl)

가용 수량 확인기 카드:
  DateTimePicker × 2 (대여 시작 / 반납 예정)
  [재고 확인] 버튼
  결과: emerald/red 박스
  [이 기간으로 신청하기] CTA 버튼 (재고 있을 때만)
```

---

### 대여 신청 페이지 (`/apply`)
```
max-w-lg

RentalForm 카드:
  기자재명 표시 (bg-slate-50 rounded-xl)
  이름 + 학번 (grid 2열)
  연락처
  DateTimePicker 대여 시작 + 반납 예정 (grid 2열)
  수량 (min 1, max N)
  조회용 비밀번호 (4~8자리)
  사용 목적 textarea (선택)
  에러 메시지
  [대여 신청하기] 버튼 (full-width h-11)

성공 화면:
  CheckCircle2 아이콘 (emerald)
  신청 완료! + 신청 번호 (mono font)
  ⚠️ 번호 저장 안내 (red-50 박스)
  [목록으로] + [신청 조회 →] 버튼 2개
```

---

### 신청함 (`/cart`)
```
max-w-5xl

1. 선택한 기자재 목록 카드
   각 항목: 카테고리 뱃지 + 기자재명 + [-] 수량 [+] + 삭제 버튼

2. 대여 기간 카드 (전체 공통)
   DateTimePicker × 2

3. 신청자 정보 카드
   이름+학번, 연락처, 비밀번호, 사용목적

4. [N종 기자재 일괄 신청 →] 버튼 (h-12)
```

---

### 신청 조회 (`/status`)
```
max-w-lg, 중앙 정렬

헤더: [FileSearch 아이콘 on slate-900 bg] "신청 조회"

조회 폼:
  신청번호 입력 (font-mono)
  비밀번호 입력
  에러 메시지
  [조회하기] 버튼

결과:
  대여 기간 (bg-slate-50 rounded-xl)
  단건 or 일괄 그룹 (신청번호 + 기자재명 × 수량 + StatusBadge)
```

---

### 어드민 공통 레이아웃
```
min-h-screen bg-[#f6f7f9] flex flex-col

[어드민 헤더] h-14 bg-slate-900
  로고 + "관리자" 뱃지 + [로그아웃 →] (오른쪽)

[본문 영역] flex flex-1
  [사이드바] w-52 bg-white border-r
    "메뉴" 레이블 (10px uppercase)
    nav 아이템: 아이콘 + 텍스트, 활성=bg-slate-900, 비활성=hover:bg-slate-50

  [메인 콘텐츠] flex-1 p-8
```

---

### 어드민 로그인 (`/admin`)
```
로그인 전: 전체화면 bg-[#f6f7f9] flex items-center justify-center
  흰 카드 (bg-white rounded-2xl border shadow-sm p-8 max-w-sm)
    카메라 아이콘 (bg-slate-900 rounded-2xl w-12 h-12)
    "관리자 로그인" + "영상콘텐츠과 기자재 관리 시스템"
    아이디/비밀번호 입력
    에러 메시지
    [로그인] 버튼 (h-11 bg-slate-900 full-width)
```

---

## 6. 아이콘 목록 (lucide-react)

```
Camera         — 로고, 어드민 로그인
List           — 기자재 목록 nav
Search         — 신청 조회 nav, 이력 검색 버튼
ClipboardList  — 신청함 nav, 대여 신청 관련
CheckCircle2   — 신청 완료
ArrowRight     — CTA 이동 버튼
ChevronRight   — breadcrumb
Loader2        — 로딩 스피너 (animate-spin)
Trash2         — 신청함 항목 삭제
Minus / Plus   — 수량 조절
CalendarDays   — 대여 기간 섹션
Clock          — 대여 기간 표시
FileSearch     — 신청 조회 페이지
XCircle        — 재고 없음
LayoutDashboard — 어드민 대시보드
ClipboardList  — 어드민 신청 관리
Package        — 어드민 기자재 관리
History        — 어드민 대여 이력
LogOut         — 로그아웃
SlidersHorizontal — 필터
Aperture, Video, Sun, HardDrive, Grip, Layers, Battery, Mic — 카테고리 아이콘
```

---

## 7. 개선이 필요한 부분 (디자이너 참고)

아래 항목들은 현재 기능은 동작하지만 디자인 개선 여지가 있습니다:

| 우선순위 | 항목 | 현황 |
|----------|------|------|
| 🔴 High | 모바일 반응형 | 현재 모바일 뷰 미최적화 (태블릿 이상 기준으로 개발됨) |
| 🔴 High | DateTimePicker | 기능 동작하나 캘린더 UI가 단순함, 개선 여지 있음 |
| 🟡 Mid | 어드민 대시보드 차트 | 현재 텍스트 테이블만 있음, 시각화 차트 추가 가능 |
| 🟡 Mid | 빈 상태 (empty state) | 기자재 목록 빈 상태 일러스트 없음 |
| 🟡 Mid | 기자재 이미지 | 현재 아이콘으로 대체 중, 실제 사진 업로드 기능 없음 |
| 🟢 Low | 다크모드 | CSS 변수는 준비됨, 실제 적용 미구현 |
| 🟢 Low | 신청함 헤더 뱃지 애니메이션 | 정적 카운터, 입력 시 애니메이션 추가 가능 |

---

## 8. AI 디자인 툴 사용 시 프롬프트 가이드

### Figma AI / Framer AI에 전달할 핵심 컨텍스트

```
이 사이트는 대학교 영상콘텐츠과 기자재(카메라, 렌즈, 조명 등) 대여 신청 시스템입니다.

디자인 원칙:
- 색상: slate-900(#0f172a) + sky-400(#38bdf8) 투톤이 브랜드 컬러
- 배경: 연한 회색 #f6f7f9 위에 흰 카드(white) 레이어 구조
- 라디우스: 카드 rounded-2xl(16px), 버튼/입력창 rounded-xl(12px), 뱃지 rounded-full
- 그림자: 카드 shadow-sm (0 1px 2px rgba(0,0,0,0.05))
- 폰트: Inter, 한국어 혼용
- 카테고리마다 고유 색상 시스템 (sky/violet/blue/amber/emerald/indigo/orange/pink)

레이아웃:
- 공개 사이트: sticky dark 헤더 + max-w-5xl centered content
- 어드민: dark 헤더 + 좌측 w-52 사이드바 + 메인 콘텐츠 full-width
```

### v0.dev 프롬프트 예시

```
Create a Korean university equipment rental system UI.
Design language: minimal, clean, light gray (#f6f7f9) page background,
white cards with rounded-2xl corners and subtle shadow-sm border,
dark slate-900 header with sky-400 brand accent.
Font: Inter. All Korean text.
```

---

## 9. 데이터 모델 요약 (디자인 참고용)

```
Equipment {
  id, name, category, description
  totalQuantity: Int
  status: 'active' | 'inactive'
}

RentalRequest {
  requestNumber: "REQ-YYYYMMDD-NNNN" (표시용 ID)
  groupNumber: String?  (일괄 신청 시 묶음 ID)
  equipmentId, applicantName, studentId, phone
  quantity, startAt, endAt
  status: 'pending' | 'approved' | 'rejected' | 'returned'
  adminNote: String?
  passwordHash: String  (조회용 비밀번호)
}
```
