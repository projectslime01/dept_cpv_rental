# Responsive Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Windows/Mac/Android/iPhone 전 환경에서 동작하는 반응형 디자인 시스템 구현 (breakpoint md=768px 기준)

**Architecture:** 어드민은 모바일에서 사이드바를 숨기고 하단 탭바로 네비게이션 대체. 퍼블릭 헤더는 아이콘 전용 모바일 nav로 전환. 테이블은 min-width + overflow-x-auto 조합으로 가로 스크롤 보장. 폼 필드는 sm 이하에서 세로 스택으로 전환.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS (sm=640px, md=768px breakpoints), lucide-react

---

## 파일 목록

| 파일 | 상태 | 역할 |
|---|---|---|
| `src/app/layout.tsx` | Modify | viewport 메타 + safe-area |
| `src/components/admin/AdminBottomNav.tsx` | **Create** | 모바일 전용 하단 탭바 |
| `src/app/admin/layout.tsx` | Modify | AdminBottomNav 삽입, main 패딩 반응형 |
| `src/components/admin/AdminSidebar.tsx` | Modify | 모바일에서 hidden |
| `src/app/(public)/layout.tsx` | Modify | 헤더 nav 텍스트 sm 이하 숨김 |
| `src/app/admin/dashboard/page.tsx` | Modify | 테이블 min-w |
| `src/app/admin/equipment/page.tsx` | Modify | 테이블 min-w |
| `src/app/admin/requests/page.tsx` | Modify | 테이블 min-w |
| `src/app/admin/history/page.tsx` | Modify | 테이블 min-w + 필터 폼 반응형 |
| `src/components/rental/RentalForm.tsx` | Modify | grid 반응형, 터치 타겟 |
| `src/components/cart/CartPageClient.tsx` | Modify | grid 반응형, 터치 타겟 |
| `src/components/equipment/EquipmentCard.tsx` | Modify | 버튼 높이 터치 타겟 |

---

### Task 1: Viewport 메타 태그

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: viewport export 추가**

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionProviderWrapper } from '@/components/admin/SessionProviderWrapper'

export const metadata: Metadata = {
  title: '영상콘텐츠과 기자재 대여',
  description: '영상콘텐츠과 기자재 대여 신청 시스템',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body>
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/layout.tsx
git commit -m "feat(responsive): add viewport meta with safe-area support"
```

---

### Task 2: AdminBottomNav 컴포넌트 (신규)

**Files:**
- Create: `src/components/admin/AdminBottomNav.tsx`

- [ ] **Step 1: AdminBottomNav 파일 생성**

```tsx
// src/components/admin/AdminBottomNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Package, History } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/requests', label: '신청 관리', icon: ClipboardList },
  { href: '/admin/equipment', label: '기자재', icon: Package },
  { href: '/admin/history', label: '이력', icon: History },
]

export function AdminBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f0e11] border-t border-[#2a2830]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                active ? 'text-[#ffb2ba]' : 'text-[#6b6468] hover:text-[#9b8f91]'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/admin/AdminBottomNav.tsx
git commit -m "feat(responsive): add AdminBottomNav for mobile admin navigation"
```

---

### Task 3: Admin 레이아웃 + 사이드바 반응형

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: AdminSidebar에 `hidden md:block` 추가**

`src/components/admin/AdminSidebar.tsx` 의 `<aside>` 태그 className 변경:

```tsx
// 변경 전
<aside className="w-52 shrink-0 border-r border-[#2a2830] bg-[#1a191b]">

// 변경 후
<aside className="hidden md:block w-52 shrink-0 border-r border-[#2a2830] bg-[#1a191b]">
```

- [ ] **Step 2: admin layout에 AdminBottomNav 삽입 + main 패딩 반응형 변경**

`src/app/admin/layout.tsx` 전체 교체:

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminBottomNav } from '@/components/admin/AdminBottomNav'
import { Camera, LogOut } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return (
      <div className="min-h-screen bg-[#131315] flex items-center justify-center px-4">
        <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] shadow-xl p-8 w-full max-w-sm">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#131315] flex flex-col">
      {/* Admin header */}
      <header className="bg-[#0f0e11] border-b border-[#2a2830] h-14 flex items-center px-4 md:px-6 shrink-0">
        <div className="flex items-center gap-2.5 font-bold text-base tracking-tight">
          <div className="w-7 h-7 rounded-lg bg-[#ffb2ba]/15 border border-[#ffb2ba]/25 flex items-center justify-center">
            <Camera className="w-3.5 h-3.5 text-[#ffb2ba]" />
          </div>
          <span className="text-[#e5e2e1]">영상콘텐츠과 <span className="text-[#ffb2ba]">기자재</span></span>
          <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#ffb2ba]/15 text-[#ffb2ba] border border-[#ffb2ba]/25">관리자</span>
        </div>
        <div className="ml-auto">
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="flex items-center gap-1.5 text-xs text-[#9b8f91] hover:text-[#e5e2e1] transition-colors px-3 py-2 rounded-lg hover:bg-[#201f21] min-h-[44px]">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </form>
        </div>
      </header>

      {/* Content area */}
      <div className="flex flex-1 min-h-0">
        <AdminSidebar />
        <main className="flex-1 p-4 md:p-8 overflow-auto pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <AdminBottomNav />
    </div>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/admin/layout.tsx src/components/admin/AdminSidebar.tsx
git commit -m "feat(responsive): hide admin sidebar on mobile, add bottom nav"
```

---

### Task 4: 퍼블릭 헤더 반응형

**Files:**
- Modify: `src/app/(public)/layout.tsx`

- [ ] **Step 1: nav 텍스트 sm 이하 숨김 처리**

`src/app/(public)/layout.tsx` 전체 교체:

```tsx
import { CartProvider } from '@/lib/useCart'
import { CartHeaderButton } from '@/components/cart/CartHeaderButton'
import { Camera, List, Search } from 'lucide-react'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        <header className="bg-[#0f0e11] border-b border-[#2a2830] sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 font-bold text-base tracking-tight hover:opacity-90 transition-opacity">
              <div className="w-7 h-7 rounded-lg bg-[#ffb2ba]/15 border border-[#ffb2ba]/25 flex items-center justify-center shrink-0">
                <Camera className="w-3.5 h-3.5 text-[#ffb2ba]" />
              </div>
              <span className="text-[#e5e2e1] truncate">영상콘텐츠과 <span className="text-[#ffb2ba]">기자재</span></span>
            </a>
            <nav className="flex items-center gap-0.5 text-sm font-medium shrink-0">
              <a href="/" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[#9b8f91] hover:text-[#e5e2e1] hover:bg-[#201f21] transition-all duration-150 min-h-[44px]">
                <List className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">기자재 목록</span>
              </a>
              <a href="/status" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[#9b8f91] hover:text-[#e5e2e1] hover:bg-[#201f21] transition-all duration-150 min-h-[44px]">
                <Search className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">신청 조회</span>
              </a>
              <CartHeaderButton />
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 md:py-8">
          {children}
        </main>
        <footer className="border-t border-[#2a2830] bg-[#0f0e11] mt-auto">
          <div className="max-w-5xl mx-auto px-4 h-12 flex items-center">
            <p className="text-xs text-[#6b6468]">영상콘텐츠과 기자재 대여 시스템</p>
          </div>
        </footer>
      </div>
    </CartProvider>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add "src/app/(public)/layout.tsx"
git commit -m "feat(responsive): mobile-first public header with icon-only nav"
```

---

### Task 5: 어드민 테이블 min-width

**Files:**
- Modify: `src/app/admin/dashboard/page.tsx`
- Modify: `src/app/admin/equipment/page.tsx`
- Modify: `src/app/admin/requests/page.tsx`
- Modify: `src/app/admin/history/page.tsx`

- [ ] **Step 1: dashboard 테이블에 min-w 추가**

`src/app/admin/dashboard/page.tsx`에서 `<table className="w-full text-sm">` 를 2곳 모두 변경:

```tsx
// 반납 예정 테이블 + 기자재 현황 테이블 모두
<table className="w-full text-sm min-w-[480px]">
```

- [ ] **Step 2: equipment 테이블에 min-w 추가**

`src/app/admin/equipment/page.tsx`:
```tsx
<table className="w-full text-sm min-w-[640px]">
```

- [ ] **Step 3: requests 테이블에 min-w 추가**

`src/app/admin/requests/page.tsx`:
```tsx
<table className="w-full text-sm min-w-[720px]">
```

- [ ] **Step 4: history 테이블에 min-w 추가 + 필터 폼 반응형**

`src/app/admin/history/page.tsx` 에서 테이블:
```tsx
<table className="w-full text-sm min-w-[720px]">
```

필터 폼의 고정 너비 input들을 모바일에서 풀폭으로:
```tsx
// 변경 전
className={inputCls + ' w-44'}
// 변경 후
className={inputCls + ' w-full sm:w-44'}
```

select도 동일하게:
```tsx
// 변경 전
className={inputCls + ' w-44'}
// 변경 후
className={inputCls + ' w-full sm:w-44'}
```

- [ ] **Step 5: 커밋**

```bash
git add src/app/admin/dashboard/page.tsx src/app/admin/equipment/page.tsx src/app/admin/requests/page.tsx src/app/admin/history/page.tsx
git commit -m "feat(responsive): add table min-widths for horizontal scroll on mobile"
```

---

### Task 6: 폼 + 터치 타겟 반응형

**Files:**
- Modify: `src/components/rental/RentalForm.tsx`
- Modify: `src/components/cart/CartPageClient.tsx`
- Modify: `src/components/equipment/EquipmentCard.tsx`

- [ ] **Step 1: RentalForm grid 반응형**

`src/components/rental/RentalForm.tsx`에서:

이름/학번 행:
```tsx
// 변경 전
<div className="grid grid-cols-2 gap-3">

// 변경 후
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

대여 시작/반납 행:
```tsx
// 변경 전
<div className="grid grid-cols-2 gap-3">

// 변경 후
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

(이름/학번 행과 날짜 행 두 곳 모두 변경)

- [ ] **Step 2: CartPageClient 이름/학번 grid 반응형**

`src/components/cart/CartPageClient.tsx`에서:
```tsx
// 변경 전 (신청자 정보 섹션 내 이름/학번 행)
<div className="grid grid-cols-2 gap-3">

// 변경 후
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

CartPageClient 내 +/- 버튼 터치 타겟 개선 (w-7 h-7 → w-9 h-9):
```tsx
// 변경 전
className="w-7 h-7 rounded-lg border border-[#3a3640] flex items-center justify-center hover:bg-[#252228] disabled:opacity-30 transition-colors"

// 변경 후 (Minus 버튼, Plus 버튼 모두)
className="w-9 h-9 rounded-lg border border-[#3a3640] flex items-center justify-center hover:bg-[#252228] disabled:opacity-30 transition-colors"
```

- [ ] **Step 3: EquipmentCard 버튼 터치 타겟 개선**

`src/components/equipment/EquipmentCard.tsx`에서 Actions 섹션 버튼 높이:
```tsx
// 변경 전 (상세/단건 신청 버튼 + 대여 불가 div)
className="flex-1 flex items-center justify-center h-9 rounded-xl ..."

// 변경 후
className="flex-1 flex items-center justify-center h-11 rounded-xl ..."
```

대여 불가 div도 동일:
```tsx
// 변경 전
className="flex-1 flex items-center justify-center h-9 rounded-xl bg-[#252228] ..."

// 변경 후
className="flex-1 flex items-center justify-center h-11 rounded-xl bg-[#252228] ..."
```

- [ ] **Step 4: 커밋**

```bash
git add src/components/rental/RentalForm.tsx src/components/cart/CartPageClient.tsx src/components/equipment/EquipmentCard.tsx
git commit -m "feat(responsive): responsive form grids and improved touch targets"
```

---

### Task 7: 최종 검증 + 배포

- [ ] **Step 1: 빌드 에러 확인**

```bash
npx next build 2>&1 | grep -E "Error|error" | head -20
```
Expected: 에러 없음

- [ ] **Step 2: origin/main 푸시**

```bash
git push origin feat/implement:main
```

- [ ] **Step 3: Vercel 배포 확인**

Vercel 대시보드에서 빌드 성공 확인 후 다음 환경에서 수동 검증:
- **모바일 (375px)**: 헤더 아이콘 전용, 어드민 하단 탭바, 폼 세로 스택
- **태블릿 (768px)**: 어드민 사이드바 표시, 헤더 텍스트 표시
- **데스크탑 (1024px+)**: 기존 레이아웃 동일
