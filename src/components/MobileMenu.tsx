'use client'

import { useState, useEffect } from 'react'
import { Menu, X, List, Building2, CalendarDays, Search, BookOpen, FileText, ShoppingCart } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useCart } from '@/lib/useCart'

const NAV_ITEMS = [
  { href: '/', icon: List, label: '기자재 대여' },
  { href: '/classrooms', icon: Building2, label: '강의실 대여' },
  { href: '/rental-status', icon: CalendarDays, label: '전체 대여 현황' },
  { href: '/status', icon: Search, label: '신청 조회' },
  { href: '/guide', icon: BookOpen, label: '이용 가이드' },
  { href: '/regulations', icon: FileText, label: '대여 규정' },
] as const

export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const { items } = useCart()
  const cartCount = items.reduce((s, i) => s + i.quantity, 0)

  // 메뉴 열릴 때 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* 모바일 우측 액션 버튼들 */}
      <div className="flex items-center gap-1 sm:hidden">
        {/* 장바구니 */}
        <a
          href="/cart"
          className="relative flex items-center justify-center w-10 h-10 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-raised transition-colors"
          aria-label="신청함"
        >
          <ShoppingCart className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-rose text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </a>

        {/* 햄버거 */}
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-raised transition-colors"
          aria-label="메뉴 열기"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* 드로어 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-50 sm:hidden"
          onClick={() => setOpen(false)}
        >
          {/* 반투명 배경 */}
          <div className="absolute inset-0 bg-black/50" />

          {/* 슬라이드 패널 */}
          <div
            className="absolute top-0 right-0 bottom-0 w-72 bg-surface-header border-l border-base flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 패널 헤더 */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-base shrink-0">
              <span className="text-sm font-bold text-base-primary">메뉴</span>
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-raised transition-colors"
                aria-label="메뉴 닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 메뉴 항목 */}
            <nav className="flex-1 overflow-y-auto py-3 px-3">
              {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-base-secondary hover:text-base-primary hover:bg-surface-raised transition-colors"
                >
                  <Icon className="w-5 h-5 shrink-0 text-brand-rose" />
                  <span className="text-sm font-medium">{label}</span>
                </a>
              ))}
            </nav>

            {/* 하단 — 테마 토글 */}
            <div className="px-5 py-4 border-t border-base shrink-0 flex items-center justify-between">
              <span className="text-xs text-base-faint">화면 테마</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
