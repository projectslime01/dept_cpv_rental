# 사용 가이드 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생/관리자 대상 이미지 기반 단계별 가이드 페이지를 구현하고, 슬라이드 모드 + PDF 저장 기능을 제공한다.

**Architecture:** `guide-content.ts` 에 콘텐츠 데이터를 정의하고, `GuideSlide.tsx` (단일 슬라이드 표현) → `GuideViewer.tsx` (일반 모드 + 슬라이드 오버레이 + 인쇄 컨테이너 관리) 순으로 클라이언트 컴포넌트를 구성한다. `/guide` 와 `/admin/guide` 는 각각 서버 컴포넌트로 데이터를 넘겨준다. 스크린샷은 브라우저 자동화(`mcp__Claude_in_Chrome`)로 직접 캡쳐한다.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS (프로젝트 디자인 토큰), lucide-react, next/image

---

## 파일 맵

| 파일 | 역할 | 변경 |
|------|------|------|
| `public/guide/placeholder.svg` | 스크린샷 없을 때 폴백 이미지 | 신규 |
| `public/guide/student/*.png` | 학생용 스크린샷 (Task 6에서 생성) | 신규 |
| `public/guide/admin/*.png` | 관리자용 스크린샷 (Task 6에서 생성) | 신규 |
| `src/lib/guide-content.ts` | 가이드 콘텐츠 데이터 + 타입 정의 | 신규 |
| `src/components/guide/GuideSlide.tsx` | 단일 슬라이드 표현 컴포넌트 | 신규 |
| `src/components/guide/GuideViewer.tsx` | 가이드 뷰어 (일반 + 슬라이드 모드) | 신규 |
| `src/app/(public)/guide/page.tsx` | 학생용 가이드 페이지 (서버 컴포넌트) | 신규 |
| `src/app/admin/guide/page.tsx` | 관리자용 가이드 페이지 (서버 컴포넌트) | 신규 |
| `src/app/globals.css` | `@media print` 스타일 추가 | 수정 |
| `src/app/(public)/layout.tsx` | "이용 가이드" nav 링크 추가 | 수정 |
| `src/components/admin/AdminSidebar.tsx` | "이용 가이드" 링크 추가 | 수정 |
| `src/components/admin/AdminBottomNav.tsx` | "가이드" 링크 추가 | 수정 |

---

## Task 1: 플레이스홀더 SVG + 가이드 콘텐츠 데이터

**Files:**
- Create: `public/guide/placeholder.svg`
- Create: `src/lib/guide-content.ts`

- [ ] **Step 1: 폴더 생성 확인**

```bash
mkdir -p "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement/public/guide/student"
mkdir -p "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement/public/guide/admin"
```

- [ ] **Step 2: placeholder.svg 생성**

`public/guide/placeholder.svg` 파일 생성:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f4f4f6"/>
  <rect x="400" y="220" width="160" height="120" rx="12" fill="#e2e2e8"/>
  <path d="M480 260 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0 M455 300 h50 l-10-20 h-30 z" fill="#b0b0bc"/>
  <text x="480" y="370" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="18" fill="#9090a0">스크린샷 준비 중</text>
  <text x="480" y="398" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="13" fill="#b0b0bc">실제 스크린샷으로 교체 예정</text>
</svg>
```

- [ ] **Step 3: guide-content.ts 생성**

`src/lib/guide-content.ts` 파일 생성:

```ts
export interface GuideStep {
  title: string
  description: string
  imagePath: string
  imageAlt: string
}

export interface GuideSection {
  id: string
  title: string
  iconName: string   // lucide-react 아이콘 이름 — GuideViewer에서 매핑
  steps: GuideStep[]
}

// ────────────────────────────────────────────────────────────
// 학생용 가이드
// ────────────────────────────────────────────────────────────
export const studentGuide: GuideSection[] = [
  {
    id: 'equipment-rental',
    title: '기자재 대여 신청',
    iconName: 'Package',
    steps: [
      {
        title: '기자재 목록 확인',
        description:
          '홈 화면에서 대여 가능한 기자재 목록을 확인합니다. 카테고리별로 필터링하거나 검색으로 원하는 기자재를 빠르게 찾을 수 있습니다.',
        imagePath: '/guide/student/01-01-equipment-list.png',
        imageAlt: '기자재 목록 화면',
      },
      {
        title: '기자재 상세 정보 확인',
        description:
          '기자재를 클릭하면 상세 정보와 대여 가능 수량, 부속 기자재 목록을 확인할 수 있습니다. 장바구니 담기 또는 바로 신청 버튼으로 신청을 시작합니다.',
        imagePath: '/guide/student/01-02-equipment-detail.png',
        imageAlt: '기자재 상세 페이지',
      },
      {
        title: '장바구니에 담기',
        description:
          '여러 기자재를 한 번에 신청하려면 장바구니에 담아두세요. 오른쪽 상단 장바구니 아이콘을 누르면 담긴 항목을 확인하고 한꺼번에 신청할 수 있습니다.',
        imagePath: '/guide/student/01-03-add-to-cart.png',
        imageAlt: '장바구니 화면',
      },
      {
        title: '신청서 작성',
        description:
          '이름, 학번, 연락처, 대여 기간, 사용 목적을 입력합니다. 비밀번호는 나중에 신청 현황을 조회할 때 필요하므로 꼭 기억해두세요.',
        imagePath: '/guide/student/01-04-apply-form.png',
        imageAlt: '기자재 신청서 작성 화면',
      },
      {
        title: '신청 완료',
        description:
          '신청이 완료되면 신청번호가 발급됩니다. 신청번호를 메모해두면 언제든지 신청 현황 조회 메뉴에서 승인 여부를 확인할 수 있습니다.',
        imagePath: '/guide/student/01-05-apply-complete.png',
        imageAlt: '기자재 신청 완료 화면',
      },
    ],
  },
  {
    id: 'classroom-rental',
    title: '강의실 대여 신청',
    iconName: 'Building2',
    steps: [
      {
        title: '강의실 목록 확인',
        description:
          '상단 메뉴의 강의실 대여를 클릭하여 대여 가능한 강의실 목록을 확인합니다.',
        imagePath: '/guide/student/02-01-classroom-list.png',
        imageAlt: '강의실 목록 화면',
      },
      {
        title: '강의실 시간표 확인',
        description:
          '강의실을 클릭하면 현재 사용 중인 수업 시간표를 확인할 수 있습니다. 기존 수업 시간과 겹치지 않는 시간대를 선택해야 합니다.',
        imagePath: '/guide/student/02-02-classroom-detail.png',
        imageAlt: '강의실 상세 및 시간표 화면',
      },
      {
        title: '신청서 작성',
        description:
          '신청자 정보, 사용 날짜와 시간, 사용 목적, 단체 여부를 입력합니다. 단체 사용 시 인원수와 구성원 이름을 함께 입력해 주세요.',
        imagePath: '/guide/student/02-03-classroom-apply.png',
        imageAlt: '강의실 신청서 작성 화면',
      },
      {
        title: '신청 완료',
        description:
          '신청이 완료되면 신청번호가 발급됩니다. 관리자 승인 후 강의실을 이용하실 수 있으며, 신청 조회 메뉴에서 상태를 확인할 수 있습니다.',
        imagePath: '/guide/student/02-04-classroom-complete.png',
        imageAlt: '강의실 신청 완료 화면',
      },
    ],
  },
  {
    id: 'status-lookup',
    title: '신청 현황 조회',
    iconName: 'Search',
    steps: [
      {
        title: '신청 조회 페이지 접속',
        description:
          '상단 메뉴의 신청 조회를 클릭해 조회 페이지로 이동합니다. 기자재와 강의실 신청 내역 모두 이 페이지에서 확인할 수 있습니다.',
        imagePath: '/guide/student/03-01-status-page.png',
        imageAlt: '신청 조회 페이지',
      },
      {
        title: '신청번호와 비밀번호 입력',
        description:
          '신청 시 발급받은 신청번호와 본인이 설정한 비밀번호를 입력합니다. 두 정보가 일치해야 조회가 가능합니다.',
        imagePath: '/guide/student/03-02-status-input.png',
        imageAlt: '신청번호와 비밀번호 입력 화면',
      },
      {
        title: '신청 상태 확인',
        description:
          '현재 승인 상태(대기 중 / 승인됨 / 반려됨)와 대여 기간, 부속 기자재 내역을 확인할 수 있습니다. 반려된 경우 사유가 함께 표시됩니다.',
        imagePath: '/guide/student/03-03-status-result.png',
        imageAlt: '신청 상태 결과 화면',
      },
    ],
  },
  {
    id: 'rental-status',
    title: '전체 대여 현황',
    iconName: 'CalendarDays',
    steps: [
      {
        title: '전체 대여 현황 접속',
        description:
          '상단 메뉴의 전체 대여 현황을 클릭합니다. 학과 기자재 전체의 승인 완료된 대여 내역을 캘린더에서 한눈에 확인할 수 있습니다.',
        imagePath: '/guide/student/04-01-rental-status.png',
        imageAlt: '전체 대여 현황 페이지',
      },
      {
        title: '날짜별 예약 현황 확인',
        description:
          '캘린더에서 날짜를 선택하면 해당 날짜의 기자재별 대여 예약 현황을 확인할 수 있습니다. 원하는 날짜에 대여 가능 여부를 미리 파악해두세요.',
        imagePath: '/guide/student/04-02-rental-calendar.png',
        imageAlt: '캘린더 날짜별 현황 화면',
      },
    ],
  },
]

// ────────────────────────────────────────────────────────────
// 관리자용 가이드
// ────────────────────────────────────────────────────────────
export const adminGuide: GuideSection[] = [
  {
    id: 'admin-dashboard',
    title: '대시보드',
    iconName: 'LayoutDashboard',
    steps: [
      {
        title: '통계 카드 확인',
        description:
          '대시보드 상단에 오늘의 신청 건수, 대기 중인 신청, 현재 대여 중인 기자재 수 등 핵심 통계를 확인할 수 있습니다.',
        imagePath: '/guide/admin/01-01-dashboard.png',
        imageAlt: '관리자 대시보드 통계 카드',
      },
      {
        title: '최근 신청 목록 확인',
        description:
          '대시보드 하단에 최근 접수된 신청 목록이 표시됩니다. 빠른 처리가 필요한 신청을 파악하고 해당 관리 페이지로 이동할 수 있습니다.',
        imagePath: '/guide/admin/01-02-dashboard-requests.png',
        imageAlt: '대시보드 최근 신청 목록',
      },
    ],
  },
  {
    id: 'admin-requests',
    title: '기자재 신청 관리',
    iconName: 'ClipboardList',
    steps: [
      {
        title: '신청 목록 조회',
        description:
          '접수된 기자재 대여 신청을 전체 조회합니다. 상태(대기 / 승인 / 반려)별로 필터링할 수 있습니다.',
        imagePath: '/guide/admin/02-01-requests-list.png',
        imageAlt: '기자재 신청 목록 화면',
      },
      {
        title: '신청 상세 확인',
        description:
          '신청 항목을 펼치면 신청자 정보, 대여 기간, 목적, 수량 등 상세 내용을 확인할 수 있습니다.',
        imagePath: '/guide/admin/02-02-requests-detail.png',
        imageAlt: '기자재 신청 상세 화면',
      },
      {
        title: '승인 처리',
        description:
          '내용을 검토한 뒤 승인 버튼을 클릭합니다. 재고 가용 수량이 자동으로 차감되며 신청자에게 승인 상태가 반영됩니다.',
        imagePath: '/guide/admin/02-03-requests-approve.png',
        imageAlt: '기자재 신청 승인 화면',
      },
      {
        title: '반려 처리',
        description:
          '반려 사유를 입력하고 반려 버튼을 클릭합니다. 반려된 신청은 재고에서 차감되지 않으며 사유가 신청자에게 표시됩니다.',
        imagePath: '/guide/admin/02-04-requests-reject.png',
        imageAlt: '기자재 신청 반려 화면',
      },
    ],
  },
  {
    id: 'admin-classroom-requests',
    title: '강의실 신청 관리',
    iconName: 'DoorOpen',
    steps: [
      {
        title: '강의실 신청 목록 조회',
        description:
          '접수된 강의실 대여 신청을 전체 조회합니다. 상태별로 필터링할 수 있으며 단체 신청은 별도로 표시됩니다.',
        imagePath: '/guide/admin/03-01-classroom-requests.png',
        imageAlt: '강의실 신청 목록 화면',
      },
      {
        title: '승인 / 반려 처리',
        description:
          '신청 내용과 시간표 충돌 여부를 확인한 후 승인 또는 반려 처리합니다. 충돌이 있는 경우 신청이 자동으로 차단되어 있습니다.',
        imagePath: '/guide/admin/03-02-classroom-approve.png',
        imageAlt: '강의실 신청 승인 반려 화면',
      },
    ],
  },
  {
    id: 'admin-equipment',
    title: '기자재 관리',
    iconName: 'Package',
    steps: [
      {
        title: '기자재 목록 확인',
        description:
          '등록된 기자재와 수량, 현재 상태를 확인합니다. 비활성화된 기자재는 학생 화면에서 숨겨집니다.',
        imagePath: '/guide/admin/04-01-equipment-list.png',
        imageAlt: '관리자 기자재 목록 화면',
      },
      {
        title: '기자재 등록',
        description:
          '기자재 추가 버튼으로 새 기자재를 등록합니다. 이름, 카테고리, 총 수량, 최소/최대 대여 수량을 입력합니다.',
        imagePath: '/guide/admin/04-02-equipment-add.png',
        imageAlt: '기자재 등록 화면',
      },
      {
        title: '기자재 수정 / 비활성화',
        description:
          '기존 기자재 정보를 수정하거나 일시적으로 비활성화하여 신청을 차단할 수 있습니다.',
        imagePath: '/guide/admin/04-03-equipment-edit.png',
        imageAlt: '기자재 수정 화면',
      },
      {
        title: '부속 기자재 관리',
        description:
          '기자재 항목의 부속 관리를 클릭하여 함께 대여되는 부속 기자재(케이블, 어댑터 등)를 등록하고 수량을 관리합니다.',
        imagePath: '/guide/admin/04-04-equipment-accessory.png',
        imageAlt: '부속 기자재 관리 화면',
      },
    ],
  },
  {
    id: 'admin-classrooms',
    title: '강의실 관리',
    iconName: 'Building2',
    steps: [
      {
        title: '강의실 목록 확인',
        description:
          '등록된 강의실 목록과 현재 상태를 확인합니다. 비활성화된 강의실은 학생 화면에서 숨겨집니다.',
        imagePath: '/guide/admin/05-01-classrooms-list.png',
        imageAlt: '관리자 강의실 목록 화면',
      },
      {
        title: '강의실 등록',
        description:
          '강의실 추가 버튼으로 새 강의실을 등록합니다. 호수(예: A101)와 초기 상태를 입력합니다.',
        imagePath: '/guide/admin/05-02-classrooms-add.png',
        imageAlt: '강의실 등록 화면',
      },
      {
        title: '시간표 설정',
        description:
          '강의실별 시간표 관리에서 수업 시간을 등록합니다. 요일, 시작/종료 시간, 과목명, 학기 기간을 입력하면 해당 시간대에는 신청이 자동으로 차단됩니다.',
        imagePath: '/guide/admin/05-03-classrooms-timetable.png',
        imageAlt: '강의실 시간표 설정 화면',
      },
    ],
  },
  {
    id: 'admin-history',
    title: '대여 이력',
    iconName: 'History',
    steps: [
      {
        title: '이력 목록 조회',
        description:
          '과거 대여 완료 및 처리된 기록을 전체 조회합니다. 기자재별, 강의실별 이력을 모두 확인할 수 있습니다.',
        imagePath: '/guide/admin/06-01-history-list.png',
        imageAlt: '대여 이력 목록 화면',
      },
      {
        title: '날짜 / 기자재 필터',
        description:
          '날짜 범위나 기자재를 선택해 특정 기간의 이력을 필터링합니다. 검색 결과를 통해 대여 패턴을 파악할 수 있습니다.',
        imagePath: '/guide/admin/06-02-history-filter.png',
        imageAlt: '대여 이력 필터 화면',
      },
    ],
  },
  {
    id: 'admin-test-request',
    title: '테스트 신청',
    iconName: 'TestTube2',
    steps: [
      {
        title: '테스트 신청 페이지 접속',
        description:
          '좌측 메뉴의 테스트 신청을 클릭합니다. 평일 업무시간 외에도 시스템 테스트 목적으로 대여 신청을 자유롭게 생성할 수 있습니다.',
        imagePath: '/guide/admin/07-01-test-request.png',
        imageAlt: '테스트 신청 페이지',
      },
      {
        title: '기자재 테스트 신청 생성',
        description:
          '기자재 탭에서 기자재, 날짜, 신청자 정보를 입력하고 신청을 생성합니다. 시간 제한 없이 임의 날짜로 테스트 신청을 만들 수 있습니다.',
        imagePath: '/guide/admin/07-02-test-equipment.png',
        imageAlt: '기자재 테스트 신청 생성 화면',
      },
      {
        title: '강의실 테스트 신청 생성',
        description:
          '강의실 탭에서 강의실과 사용 시간을 입력하고 신청을 생성합니다. 생성된 테스트 신청은 일반 신청 목록에 테스트 배지로 구분되어 표시됩니다.',
        imagePath: '/guide/admin/07-03-test-classroom.png',
        imageAlt: '강의실 테스트 신청 생성 화면',
      },
    ],
  },
]
```

- [ ] **Step 4: 빌드 타입 체크**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음 (guide-content.ts는 순수 데이터이므로 타입 오류 없어야 함)

- [ ] **Step 5: 커밋**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
git add public/guide/ src/lib/guide-content.ts
git commit -m "feat: add guide content data and placeholder asset"
```

---

## Task 2: GuideSlide 컴포넌트

**Files:**
- Create: `src/components/guide/GuideSlide.tsx`

- [ ] **Step 1: GuideSlide.tsx 생성**

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { GuideStep } from '@/lib/guide-content'

interface Props {
  step: GuideStep
  sectionTitle: string
  stepIndex: number   // 1-based 전체 슬라이드 번호
  totalSteps: number
}

export function GuideSlide({ step, sectionTitle, stepIndex, totalSteps }: Props) {
  const [imgSrc, setImgSrc] = useState(step.imagePath)

  return (
    <div className="flex flex-col md:flex-row gap-8 items-center w-full">
      {/* 스크린샷 */}
      <div className="w-full md:w-3/5 relative aspect-video rounded-2xl overflow-hidden border border-base bg-surface-raised shrink-0">
        <Image
          src={imgSrc}
          alt={step.imageAlt}
          fill
          className="object-cover"
          onError={() => setImgSrc('/guide/placeholder.svg')}
          unoptimized
        />
      </div>

      {/* 텍스트 */}
      <div className="w-full md:w-2/5 space-y-3">
        <p className="text-xs font-medium text-base-muted uppercase tracking-wider">
          {sectionTitle}
        </p>
        <h2 className="text-xl font-bold text-base-primary leading-snug">
          {step.title}
        </h2>
        <p className="text-sm text-base-secondary leading-relaxed">
          {step.description}
        </p>
        <p className="text-xs text-base-faint font-mono">
          {stepIndex} / {totalSteps}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
git add src/components/guide/GuideSlide.tsx
git commit -m "feat: add GuideSlide component"
```

---

## Task 3: GuideViewer 컴포넌트

**Files:**
- Create: `src/components/guide/GuideViewer.tsx`

GuideViewer는 일반 모드(모든 섹션 카드 목록)와 슬라이드 모드(전체화면 오버레이)를 관리하는 핵심 클라이언트 컴포넌트다. 또한 `@media print` 시 모든 슬라이드를 순서대로 렌더링하는 숨겨진 컨테이너를 유지한다.

- [ ] **Step 1: GuideViewer.tsx 생성**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  Package, Building2, Search, CalendarDays,
  LayoutDashboard, ClipboardList, DoorOpen, History,
  Users, TestTube2, BookOpen,
  Presentation, X, ChevronLeft, ChevronRight, Printer,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { GuideSlide } from './GuideSlide'
import type { GuideSection, GuideStep } from '@/lib/guide-content'

// ─── 아이콘 이름 → 컴포넌트 매핑 ──────────────────────────────
const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Package,
  Building2,
  Search,
  CalendarDays,
  LayoutDashboard,
  ClipboardList,
  DoorOpen,
  History,
  Users,
  TestTube2,
  BookOpen,
}

// ─── 전체 슬라이드 평탄화 ────────────────────────────────────
interface FlatSlide {
  sectionTitle: string
  step: GuideStep
  globalIndex: number  // 1-based
}

function flattenSlides(sections: GuideSection[]): FlatSlide[] {
  const result: FlatSlide[] = []
  let idx = 1
  for (const section of sections) {
    for (const step of section.steps) {
      result.push({ sectionTitle: section.title, step, globalIndex: idx++ })
    }
  }
  return result
}

// ─── 내부 StepCard (일반 모드용) ─────────────────────────────
function StepCard({ step, stepNumber }: { step: GuideStep; stepNumber: number }) {
  const [imgSrc, setImgSrc] = useState(step.imagePath)

  return (
    <div className="rounded-2xl border border-base bg-surface-raised overflow-hidden">
      {/* 제목 행 */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-base">
        <span className="w-6 h-6 rounded-full bg-brand-rose text-white text-xs font-bold flex items-center justify-center shrink-0">
          {stepNumber}
        </span>
        <span className="text-sm font-semibold text-base-primary">{step.title}</span>
      </div>
      {/* 이미지 + 설명 */}
      <div className="flex flex-col md:flex-row">
        <div className="md:w-1/2 relative aspect-video bg-surface-overlay">
          <Image
            src={imgSrc}
            alt={step.imageAlt}
            fill
            className="object-cover"
            onError={() => setImgSrc('/guide/placeholder.svg')}
            unoptimized
          />
        </div>
        <div className="md:w-1/2 px-5 py-4 flex items-center">
          <p className="text-sm text-base-secondary leading-relaxed">{step.description}</p>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────
interface Props {
  sections: GuideSection[]
  title: string         // 페이지 제목 (예: "학생 이용 가이드")
  subtitle: string      // 부제목
}

export function GuideViewer({ sections, title, subtitle }: Props) {
  const [slideMode, setSlideMode] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const allSlides = flattenSlides(sections)
  const totalSlides = allSlides.length
  const currentSlide = allSlides[currentIndex]

  const goNext = useCallback(() => {
    setCurrentIndex(i => Math.min(i + 1, totalSlides - 1))
  }, [totalSlides])

  const goPrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0))
  }, [])

  const closeSlide = useCallback(() => setSlideMode(false), [])

  const openSlide = useCallback(() => {
    setCurrentIndex(0)
    setSlideMode(true)
  }, [])

  // 키보드 이벤트 — 슬라이드 모드일 때만
  useEffect(() => {
    if (!slideMode) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'Escape') closeSlide()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slideMode, goNext, goPrev, closeSlide])

  return (
    <div>
      {/* ─── 페이지 헤더 ─── */}
      <div className="border-b border-base pb-6 mb-8 no-print">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-rose-muted border border-brand-rose flex items-center justify-center text-brand-rose shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-base-primary tracking-tight">
                {title}
              </h1>
              <p className="text-sm text-base-secondary mt-0.5">{subtitle}</p>
            </div>
          </div>
          {/* 슬라이드 모드 버튼 */}
          <button
            onClick={openSlide}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-rose text-white text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
          >
            <Presentation className="w-4 h-4" />
            슬라이드 모드
          </button>
        </div>
      </div>

      {/* ─── 일반 모드: 모든 섹션 ─── */}
      <div className="space-y-14 no-print">
        {sections.map(section => {
          const Icon = ICON_MAP[section.iconName] ?? BookOpen
          return (
            <div key={section.id} className="space-y-5">
              {/* 섹션 헤더 */}
              <div className="flex items-center gap-3 pb-3 border-b border-base">
                <div className="w-9 h-9 rounded-xl bg-brand-rose-muted border border-brand-rose flex items-center justify-center text-brand-rose shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-base-primary">{section.title}</h2>
              </div>
              {/* Step 카드 목록 */}
              <div className="space-y-4">
                {section.steps.map((step, stepIdx) => (
                  <StepCard key={stepIdx} step={step} stepNumber={stepIdx + 1} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── 슬라이드 모드 오버레이 ─── */}
      {slideMode && currentSlide && (
        <div className="fixed inset-0 z-50 bg-surface flex flex-col no-print">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-base shrink-0">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-base-muted truncate">{currentSlide.sectionTitle}</span>
              <span className="text-base-faint shrink-0">›</span>
              <span className="font-semibold text-base-primary truncate">
                {currentSlide.step.title}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <span className="text-sm text-base-muted font-mono">
                {currentIndex + 1} / {totalSlides}
              </span>
              <button
                onClick={closeSlide}
                className="p-1.5 rounded-lg hover:bg-surface-raised text-base-muted hover:text-base-primary transition-colors"
                aria-label="슬라이드 모드 닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 슬라이드 내용 */}
          <div className="flex-1 flex items-center justify-center px-8 py-6 overflow-hidden">
            <div className="w-full max-w-5xl">
              <GuideSlide
                step={currentSlide.step}
                sectionTitle={currentSlide.sectionTitle}
                stepIndex={currentIndex + 1}
                totalSteps={totalSlides}
              />
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-base shrink-0">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-base text-sm font-medium text-base-secondary hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-raised border border-base text-sm font-medium text-base-secondary hover:bg-surface-overlay transition-colors"
            >
              <Printer className="w-4 h-4" />
              PDF로 저장
            </button>

            <button
              onClick={goNext}
              disabled={currentIndex === totalSlides - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-base text-sm font-medium text-base-secondary hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── 인쇄 전용 컨테이너 (평소에는 숨김) ─── */}
      {/* @media print 에서만 표시. 모든 슬라이드를 한 장씩 인쇄 */}
      <div className="guide-print-container" style={{ display: 'none' }}>
        {allSlides.map((slide, i) => (
          <div key={i} className="guide-print-slide">
            <div className="guide-print-section-label">
              {slide.sectionTitle} — {slide.step.title}
            </div>
            <GuideSlide
              step={slide.step}
              sectionTitle={slide.sectionTitle}
              stepIndex={slide.globalIndex}
              totalSteps={totalSlides}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement" && npx tsc --noEmit 2>&1 | head -30
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
git add src/components/guide/GuideViewer.tsx
git commit -m "feat: add GuideViewer component with slide mode and print container"
```

---

## Task 4: 가이드 페이지 + 인쇄 CSS

**Files:**
- Create: `src/app/(public)/guide/page.tsx`
- Create: `src/app/admin/guide/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: 학생용 가이드 페이지 생성**

`src/app/(public)/guide/page.tsx`:

```tsx
import { Metadata } from 'next'
import { GuideViewer } from '@/components/guide/GuideViewer'
import { studentGuide } from '@/lib/guide-content'

export const metadata: Metadata = {
  title: '이용 가이드 | 연성대학교 영상콘텐츠과 기자재 대여',
  description: '기자재 및 강의실 대여 시스템 이용 방법을 단계별로 안내합니다.',
}

export default function GuidePage() {
  return (
    <GuideViewer
      sections={studentGuide}
      title="이용 가이드"
      subtitle="기자재 및 강의실 대여 시스템 사용 방법을 단계별로 안내합니다."
    />
  )
}
```

- [ ] **Step 2: 관리자용 가이드 페이지 생성**

`src/app/admin/guide/page.tsx`:

```tsx
import { Metadata } from 'next'
import { GuideViewer } from '@/components/guide/GuideViewer'
import { adminGuide } from '@/lib/guide-content'

export const metadata: Metadata = {
  title: '이용 가이드 | 관리자',
  description: '관리자 패널 기능별 사용 방법을 단계별로 안내합니다.',
}

export default function AdminGuidePage() {
  return (
    <GuideViewer
      sections={adminGuide}
      title="관리자 이용 가이드"
      subtitle="기자재·강의실 신청 관리, 기자재 관리, 테스트 신청 등 관리자 기능을 안내합니다."
    />
  )
}
```

- [ ] **Step 3: globals.css에 @media print 추가**

`src/app/globals.css` 파일 끝에 다음 내용을 추가한다 (기존 내용은 그대로 유지):

```css
/* ============================================================
   Guide: Print / PDF 저장 스타일
   ============================================================ */
@media print {
  /* 일반 UI 요소 숨김 */
  header,
  footer,
  nav,
  .no-print {
    display: none !important;
  }

  /* 인쇄 전용 컨테이너 표시 */
  .guide-print-container {
    display: block !important;
  }

  /* 슬라이드 1장 = 인쇄 1페이지 */
  .guide-print-slide {
    page-break-after: always;
    break-after: page;
    padding: 1.5cm 2cm;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* 섹션 레이블 */
  .guide-print-section-label {
    font-size: 11pt;
    color: #888;
    font-weight: 600;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e2e2e8;
    margin-bottom: 0.5rem;
  }
}
```

- [ ] **Step 4: 빌드 확인**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
git add src/app/'(public)'/guide/page.tsx src/app/admin/guide/page.tsx src/app/globals.css
git commit -m "feat: add guide pages and print CSS"
```

---

## Task 5: 네비게이션 링크 추가

**Files:**
- Modify: `src/app/(public)/layout.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/components/admin/AdminBottomNav.tsx`

- [ ] **Step 1: 공개 헤더에 이용 가이드 링크 추가**

`src/app/(public)/layout.tsx` 의 import 줄을 수정:

```tsx
// 기존:
import { List, Search, CalendarDays, Building2 } from 'lucide-react'
// 변경 후:
import { List, Search, CalendarDays, Building2, BookOpen } from 'lucide-react'
```

nav 영역에서 `<CartHeaderButton />` 바로 앞에 추가:

```tsx
<a
  href="/guide"
  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-raised transition-all duration-150 min-h-[44px]"
>
  <BookOpen className="w-4 h-4 shrink-0" />
  <span className="hidden sm:inline">이용 가이드</span>
</a>
```

- [ ] **Step 2: AdminSidebar에 이용 가이드 링크 추가**

`src/components/admin/AdminSidebar.tsx`:

```tsx
// 기존:
import { LayoutDashboard, ClipboardList, Package, Building2, DoorOpen, History, Users, TestTube2 } from 'lucide-react'
// 변경 후:
import { LayoutDashboard, ClipboardList, Package, Building2, DoorOpen, History, Users, TestTube2, BookOpen } from 'lucide-react'
```

NAV_ITEMS 배열의 `{ href: '/admin/accounts', ... }` 바로 앞에 추가:

```ts
{ href: '/admin/guide', label: '이용 가이드', icon: BookOpen },
```

최종 NAV_ITEMS:

```ts
const NAV_ITEMS = [
  { href: '/admin/dashboard',   label: '대시보드',    icon: LayoutDashboard },
  { href: '/admin/requests',    label: '기자재 신청', icon: ClipboardList },
  { href: '/admin/classroom',   label: '강의실 신청', icon: DoorOpen },
  { href: '/admin/equipment',   label: '기자재 관리', icon: Package },
  { href: '/admin/classrooms',  label: '강의실 관리', icon: Building2 },
  { href: '/admin/history',     label: '대여 이력',   icon: History },
  { href: '/admin/test-request', label: '테스트 신청', icon: TestTube2 },
  { href: '/admin/guide',       label: '이용 가이드', icon: BookOpen },
  { href: '/admin/accounts',    label: '계정 관리',   icon: Users },
]
```

- [ ] **Step 3: AdminBottomNav에 가이드 링크 추가**

`src/components/admin/AdminBottomNav.tsx`:

```tsx
// 기존:
import { LayoutDashboard, ClipboardList, Package, Building2, History, Users, TestTube2 } from 'lucide-react'
// 변경 후:
import { LayoutDashboard, ClipboardList, Package, Building2, History, Users, TestTube2, BookOpen } from 'lucide-react'
```

NAV_ITEMS:

```ts
const NAV_ITEMS = [
  { href: '/admin/dashboard',   label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/requests',    label: '신청',    icon: ClipboardList },
  { href: '/admin/equipment',   label: '기자재',  icon: Package },
  { href: '/admin/classrooms',  label: '강의실',  icon: Building2 },
  { href: '/admin/history',     label: '이력',    icon: History },
  { href: '/admin/accounts',    label: '계정',    icon: Users },
  { href: '/admin/test-request', label: '테스트', icon: TestTube2 },
  { href: '/admin/guide',       label: '가이드',  icon: BookOpen },
]
```

- [ ] **Step 4: 빌드 타입 체크**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
git add src/app/'(public)'/layout.tsx src/components/admin/AdminSidebar.tsx src/components/admin/AdminBottomNav.tsx
git commit -m "feat: add guide navigation links to public header and admin nav"
```

---

## Task 6: 스크린샷 캡쳐

**전제조건:**
- DB에 기자재·강의실 시드 데이터가 존재해야 한다
- `npm run dev` 가 실행 중이어야 한다 (포트 3000)
- `mcp__Claude_in_Chrome` 브라우저 자동화 도구 사용

**파일:**
- Create: `public/guide/student/*.png` (14개)
- Create: `public/guide/admin/*.png` (20개)

- [ ] **Step 1: 개발 서버 실행**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement" && npm run dev &
```

서버가 `http://localhost:3000` 에서 실행될 때까지 대기. 브라우저에서 `http://localhost:3000` 접속 확인.

- [ ] **Step 2: 학생용 스크린샷 캡쳐 (14개)**

아래 순서로 `mcp__Claude_in_Chrome` 를 사용해 각 페이지에 접속하고 스크린샷을 캡쳐한다. 뷰포트: 1440 × 900. 저장 경로는 `/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement/public/guide/student/`.

| 파일명 | URL | 비고 |
|--------|-----|------|
| `01-01-equipment-list.png` | `http://localhost:3000/` | 기자재 목록 |
| `01-02-equipment-detail.png` | `http://localhost:3000/equipment/{첫 번째 기자재 ID}` | 기자재 상세 |
| `01-03-add-to-cart.png` | 기자재 상세에서 장바구니 담기 클릭 후 캡쳐 | 장바구니 상태 |
| `01-04-apply-form.png` | `http://localhost:3000/apply` (장바구니 → 신청) | 신청서 |
| `01-05-apply-complete.png` | 신청 완료 후 성공 메시지 화면 | 신청 완료 |
| `02-01-classroom-list.png` | `http://localhost:3000/classrooms` | 강의실 목록 |
| `02-02-classroom-detail.png` | `http://localhost:3000/classrooms/{첫 번째 강의실 ID}` | 강의실 상세 |
| `02-03-classroom-apply.png` | `http://localhost:3000/classrooms/{ID}/apply` | 강의실 신청서 |
| `02-04-classroom-complete.png` | 강의실 신청 완료 후 성공 화면 | 신청 완료 |
| `03-01-status-page.png` | `http://localhost:3000/status` | 신청 조회 진입 |
| `03-02-status-input.png` | 신청번호 + 비밀번호 입력 화면 (검색 전) | 입력 폼 |
| `03-03-status-result.png` | 신청 조회 결과 (실제 신청번호 입력 후) | 결과 화면 |
| `04-01-rental-status.png` | `http://localhost:3000/rental-status` | 전체 현황 |
| `04-02-rental-calendar.png` | 캘린더에서 날짜 클릭 후 상세 표시 | 날짜 선택 상태 |

- [ ] **Step 3: 관리자 로그인**

`http://localhost:3000/admin` 접속 → 관리자 계정으로 로그인.
로그인 성공 후 대시보드로 이동 확인.

- [ ] **Step 4: 관리자용 스크린샷 캡쳐 (20개)**

저장 경로: `public/guide/admin/`

| 파일명 | URL | 비고 |
|--------|-----|------|
| `01-01-dashboard.png` | `http://localhost:3000/admin/dashboard` | 통계 카드 영역 |
| `01-02-dashboard-requests.png` | 대시보드 하단 신청 목록 스크롤 | 최근 신청 영역 |
| `02-01-requests-list.png` | `http://localhost:3000/admin/requests` | 기자재 신청 목록 |
| `02-02-requests-detail.png` | 신청 항목 펼친 상태 | 상세 확인 |
| `02-03-requests-approve.png` | 승인 버튼 클릭 전 상태 | 승인 처리 |
| `02-04-requests-reject.png` | 반려 사유 입력 상태 | 반려 처리 |
| `03-01-classroom-requests.png` | `http://localhost:3000/admin/classroom` | 강의실 신청 목록 |
| `03-02-classroom-approve.png` | 강의실 신청 승인 처리 화면 | 승인 화면 |
| `04-01-equipment-list.png` | `http://localhost:3000/admin/equipment` | 기자재 목록 |
| `04-02-equipment-add.png` | 기자재 추가 폼 표시 상태 | 등록 폼 |
| `04-03-equipment-edit.png` | 기자재 수정 폼 표시 상태 | 수정 폼 |
| `04-04-equipment-accessory.png` | `http://localhost:3000/admin/equipment/{ID}/accessories` | 부속 관리 |
| `05-01-classrooms-list.png` | `http://localhost:3000/admin/classrooms` | 강의실 목록 |
| `05-02-classrooms-add.png` | 강의실 추가 폼 표시 상태 | 등록 폼 |
| `05-03-classrooms-timetable.png` | `http://localhost:3000/admin/classrooms/{ID}/timetable` | 시간표 설정 |
| `06-01-history-list.png` | `http://localhost:3000/admin/history` | 이력 목록 |
| `06-02-history-filter.png` | 필터 조건 선택 상태 | 필터 화면 |
| `07-01-test-request.png` | `http://localhost:3000/admin/test-request` | 테스트 신청 진입 |
| `07-02-test-equipment.png` | 기자재 탭 신청 폼 | 기자재 탭 |
| `07-03-test-classroom.png` | 강의실 탭 신청 폼 | 강의실 탭 |

- [ ] **Step 5: 가이드 페이지에서 이미지 표시 확인**

`http://localhost:3000/guide` 접속 → 스크린샷이 플레이스홀더 대신 실제 이미지로 표시되는지 확인.

- [ ] **Step 6: 스크린샷 커밋**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
git add public/guide/
git commit -m "feat: add guide screenshots captured via browser automation"
```

- [ ] **Step 7: GitHub 푸시**

```bash
git push origin feat/implement:main
```

Expected: 푸시 성공

---

## 셀프 리뷰 체크리스트

스펙 vs 계획 대조:

| 스펙 요구사항 | 커버 태스크 |
|-------------|-----------|
| `/guide` 공개 페이지 | Task 4 |
| `/admin/guide` 관리자 페이지 | Task 4 |
| `GuideSection` / `GuideStep` 타입 | Task 1 |
| `GuideSlide.tsx` 컴포넌트 | Task 2 |
| `GuideViewer.tsx` 일반 모드 | Task 3 |
| 슬라이드 모드 오버레이 + 키보드 지원 | Task 3 |
| ESC 닫기 | Task 3 |
| PDF 저장 버튼 (`window.print()`) | Task 3 |
| `@media print` CSS | Task 4 |
| 인쇄 전용 숨겨진 컨테이너 | Task 3 |
| 이미지 onError 폴백 → placeholder.svg | Task 2, Task 3 |
| 공개 헤더 이용 가이드 링크 | Task 5 |
| AdminSidebar 이용 가이드 링크 | Task 5 |
| AdminBottomNav 가이드 링크 | Task 5 |
| 학생용 4섹션 콘텐츠 | Task 1 |
| 관리자용 7섹션 콘텐츠 | Task 1 |
| 브라우저 자동화 스크린샷 34개 | Task 6 |
| placeholder.svg 공통 폴백 | Task 1 |
