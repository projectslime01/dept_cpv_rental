# 사용 가이드 페이지 설계

**날짜:** 2026-06-04  
**목적:** 학생 및 관리자가 시스템을 쉽게 이해할 수 있도록 이미지 기반 단계별 가이드 페이지를 구현하고, 슬라이드 모드 + PDF 저장 기능을 제공

---

## 배경 및 목표

기자재·강의실 대여 시스템에 처음 접근하는 학생과 관리자가 UI를 보고 바로 사용 방법을 익힐 수 있어야 한다. 각 기능의 흐름을 스크린샷 + 단계별 설명으로 안내하고, 프레젠테이션용 PPT 대체로 슬라이드 뷰와 브라우저 인쇄(PDF 저장)를 제공한다.

---

## 핵심 결정 사항

| 항목 | 결정 |
|------|------|
| 가이드 위치 | 공개 사이트 `/guide` + 관리자 `/admin/guide` 각각 별도 |
| 이미지 출처 | 실제 스크린샷 촬영 후 `/public/guide/` 에 저장. 브라우저 자동화로 직접 캡쳐 |
| PPT 대체 | 웹 슬라이드 모드 + `window.print()` → PDF 저장 |

---

## 파일 구조

### 신규 생성

```
src/
  app/
    (public)/guide/
      page.tsx                  ← 학생용 가이드 (서버 컴포넌트)
    admin/guide/
      page.tsx                  ← 관리자용 가이드 (서버 컴포넌트)
  components/guide/
    GuideViewer.tsx             ← 공유 가이드 뷰어 (클라이언트 컴포넌트)
    GuideSlide.tsx              ← 슬라이드 모드 오버레이 (클라이언트 컴포넌트)
  lib/
    guide-content.ts            ← 가이드 콘텐츠 데이터 (studentGuide, adminGuide)

public/guide/
  placeholder.svg               ← 공통 플레이스홀더 (스크린샷 없을 때 폴백)
  student/                      ← 학생용 스크린샷 저장 폴더
  admin/                        ← 관리자용 스크린샷 저장 폴더
```

### 수정

| 파일 | 변경 내용 |
|------|---------|
| `src/app/(public)/layout.tsx` | "이용 가이드" nav 링크 (`/guide`, BookOpen 아이콘) 추가 |
| `src/components/admin/AdminSidebar.tsx` | "이용 가이드" 링크 (`/admin/guide`, BookOpen 아이콘) 추가 |
| `src/components/admin/AdminBottomNav.tsx` | "가이드" 링크 추가 |

---

## 콘텐츠 데이터 구조 (`guide-content.ts`)

```ts
export interface GuideStep {
  title: string       // 단계 제목 (예: "기자재 목록 확인")
  description: string // 설명 텍스트 (1~3문장)
  imagePath: string   // "/guide/student/01-equipment-list.png" 형식
  imageAlt: string    // 접근성 alt 텍스트
}

export interface GuideSection {
  id: string
  title: string       // 섹션 제목
  iconName: string    // lucide-react 아이콘 이름 (문자열로 저장, 컴포넌트에서 매핑)
  steps: GuideStep[]
}
```

### 학생용 가이드 섹션 (`studentGuide: GuideSection[]`)

| # | 섹션 제목 | 주요 단계 |
|---|---------|---------|
| 1 | 기자재 대여 신청 | 목록 확인 → 상세 페이지 → 장바구니 담기 → 신청서 작성 → 신청 완료 |
| 2 | 강의실 대여 신청 | 목록 확인 → 시간표 확인 → 신청서 작성 → 신청 완료 |
| 3 | 신청 현황 조회 | 신청번호 + 비밀번호 입력 → 상태 확인 → 부속 기자재 내역 확인 |
| 4 | 전체 대여 현황 | 캘린더 뷰 접속 → 날짜별 예약 현황 확인 |

### 관리자용 가이드 섹션 (`adminGuide: GuideSection[]`)

| # | 섹션 제목 | 주요 단계 |
|---|---------|---------|
| 1 | 대시보드 | 통계 카드 해석 → 최근 신청 목록 확인 |
| 2 | 기자재 신청 관리 | 신청 목록 조회 → 상세 확인 → 승인 / 반려 처리 |
| 3 | 강의실 신청 관리 | 신청 목록 조회 → 승인 / 반려 처리 |
| 4 | 기자재 관리 | 기자재 등록/수정/비활성화 → 부속 기자재 관리 |
| 5 | 강의실 관리 | 강의실 등록 → 시간표 설정 (요일/시간/학기) |
| 6 | 대여 이력 | 이력 목록 조회 → 날짜 / 기자재 필터 |
| 7 | 테스트 신청 | 기자재 / 강의실 테스트 신청 생성 → 결과 확인 |

---

## GuideViewer 컴포넌트 (`GuideViewer.tsx`)

`'use client'` 컴포넌트. `sections: GuideSection[]` prop을 받아 렌더링한다.

### 일반 모드 (기본)

- 상단에 **"슬라이드 모드"** 토글 버튼 (우측 정렬)
- 섹션별 그룹: 섹션 제목 + 아이콘 헤더 → 하위 Step 카드 목록
- 각 Step 카드 레이아웃:
  ```
  [번호 뱃지] [제목]
  ┌─────────────────────┬─────────────────────┐
  │    스크린샷 이미지   │  설명 텍스트         │
  │    (16:9 비율)      │                     │
  └─────────────────────┴─────────────────────┘
  ```
  모바일(md 미만): 이미지 → 텍스트 세로 1단

### 슬라이드 모드

- 전체화면 오버레이 (`fixed inset-0 z-50`)
- 배경: `bg-surface` (다크모드 지원)
- 슬라이드 1장씩 표시:
  ```
  ┌──────────────────────────────────────────┐
  │  [섹션명] [단계명]              [3 / 14]  │  ← 헤더
  ├──────────────────────────────────────────┤
  │                                          │
  │   [스크린샷]          [제목]              │
  │                       [설명]             │
  │                                          │
  ├──────────────────────────────────────────┤
  │  [← 이전]    [🖨 PDF로 저장]   [다음 →]  │  ← 푸터
  └──────────────────────────────────────────┘
  ```
- 키보드 지원: `←` / `→` 이전/다음, `ESC` 닫기
- "닫기(✕)" 버튼: 우측 상단, 일반 모드 복귀

### 이미지 처리

- `<Image>` 컴포넌트로 표시. `src`에 `imagePath` 전달
- 실제 파일이 없을 경우 `onError` 핸들러로 공통 플레이스홀더 SVG(`/guide/placeholder.svg`)로 폴백
- 플레이스홀더: 회색 배경 + 카메라 아이콘 + `"스크린샷 준비 중"` 텍스트

### 인쇄 / PDF 저장

- 슬라이드 모드 푸터의 "🖨 PDF로 저장" 버튼 → `window.print()` 호출
- `globals.css` 에 `@media print` 규칙 추가:
  ```css
  @media print {
    /* 일반 UI 요소 숨김 */
    header, footer, nav, .no-print { display: none !important; }
    /* 슬라이드 컨테이너 표시 */
    .guide-print-container { display: block !important; }
    /* 슬라이드 1장 = 인쇄 1페이지 */
    .guide-print-slide {
      page-break-after: always;
      width: 100%;
      padding: 2cm;
    }
  }
  ```
- 인쇄 시 모든 슬라이드를 순서대로 렌더링하는 숨겨진 `div.guide-print-container` 를 DOM에 유지

---

## GuideSlide 컴포넌트 (`GuideSlide.tsx`)

단일 슬라이드를 렌더링하는 순수 표현 컴포넌트.

```ts
interface Props {
  step: GuideStep
  sectionTitle: string
  stepIndex: number     // 1-based 슬라이드 번호
  totalSteps: number
}
```

`GuideViewer` 에서 슬라이드 모드와 인쇄 컨테이너 양쪽에서 재사용.

---

## 스크린샷 캡쳐 전략

브라우저 자동화(`mcp__Claude_in_Chrome`) 로 직접 캡쳐한다:

1. `npm run dev` 로 개발 서버 실행 (포트 3000)
2. **학생용** 페이지 순서대로 캡쳐:
   - `/` (기자재 목록)
   - `/equipment/[id]` (기자재 상세)
   - `/apply` (신청서)
   - `/status` (신청 조회)
   - `/rental-status` (전체 대여 현황)
   - `/classrooms` (강의실 목록)
   - `/classrooms/[id]` (강의실 상세)
   - `/classrooms/[id]/apply` (강의실 신청)
3. **관리자용** 페이지: 관리자 계정으로 로그인 후 순서대로 캡쳐
   - `/admin/dashboard`
   - `/admin/requests`
   - `/admin/classroom`
   - `/admin/equipment`
   - `/admin/classrooms`
   - `/admin/history`
   - `/admin/test-request`
4. 파일명 규칙: `{섹션번호:2d}-{단계번호:2d}-{kebab-description}.png`
   - 예: `01-01-equipment-list.png`, `02-01-classroom-list.png`
5. 저장 경로: `/public/guide/student/`, `/public/guide/admin/`

**전제조건:** DB에 기자재·강의실 시드 데이터가 존재해야 목록 페이지가 비어있지 않게 캡쳐된다.

---

## 네비게이션 변경

### 공개 헤더 (`PublicLayout`)

기존 nav 항목 뒤에 추가:

```tsx
import { BookOpen } from 'lucide-react'

<a href="/guide" className="...">
  <BookOpen className="w-4 h-4 shrink-0" />
  <span className="hidden sm:inline">이용 가이드</span>
</a>
```

### 관리자 사이드바 (`AdminSidebar`)

```ts
{ href: '/admin/guide', label: '이용 가이드', icon: BookOpen },
```

### 관리자 하단 네비 (`AdminBottomNav`)

```ts
{ href: '/admin/guide', label: '가이드', icon: BookOpen },
```

---

## 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `src/lib/guide-content.ts` | 신규 — 학생/관리자 가이드 콘텐츠 데이터 |
| `src/components/guide/GuideSlide.tsx` | 신규 — 단일 슬라이드 표현 컴포넌트 |
| `src/components/guide/GuideViewer.tsx` | 신규 — 가이드 뷰어 (일반 + 슬라이드 모드) |
| `src/app/(public)/guide/page.tsx` | 신규 — 학생용 가이드 페이지 |
| `src/app/admin/guide/page.tsx` | 신규 — 관리자용 가이드 페이지 |
| `src/app/globals.css` | 수정 — `@media print` 스타일 추가 |
| `src/app/(public)/layout.tsx` | 수정 — "이용 가이드" nav 링크 추가 |
| `src/components/admin/AdminSidebar.tsx` | 수정 — "이용 가이드" 링크 추가 |
| `src/components/admin/AdminBottomNav.tsx` | 수정 — "가이드" 링크 추가 |
| `public/guide/placeholder.svg` | 신규 — 공통 스크린샷 플레이스홀더 |
| `public/guide/student/*.png` | 신규 — 브라우저 자동화로 캡쳐한 스크린샷 |
| `public/guide/admin/*.png` | 신규 — 브라우저 자동화로 캡쳐한 스크린샷 |
