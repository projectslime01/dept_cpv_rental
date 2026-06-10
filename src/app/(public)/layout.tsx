import Image from 'next/image'
import { CartProvider } from '@/lib/useCart'
import { CartHeaderButton } from '@/components/cart/CartHeaderButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { MobileMenu } from '@/components/MobileMenu'
import { List, Search, CalendarDays, Building2, BookOpen, FileText } from 'lucide-react'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-surface">
        {/* ── Header ── */}
        <header className="bg-surface-header border-b border-base sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* Logo & Title */}
            <a
              href="/"
              className="flex items-center gap-2.5 font-bold text-base tracking-tight hover:opacity-90 transition-opacity min-w-0"
            >
              <div className="w-7 h-7 flex items-center justify-center shrink-0">
                <Image src="/logo.png" alt="Logo" width={24} height={24} className="object-contain" />
              </div>
              <span className="text-base-primary truncate">
                연성대학교 영상콘텐츠과{' '}
                <span className="text-brand-rose">통합 대여</span>
              </span>
            </a>

            {/* 데스크톱 Nav (sm 이상) */}
            <nav className="hidden sm:flex items-center gap-0.5 text-sm font-medium shrink-0 ml-2">
              <a href="/" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-raised transition-all duration-150 min-h-[44px]">
                <List className="w-4 h-4 shrink-0" />
                <span>기자재 대여</span>
              </a>
              <a href="/classrooms" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-raised transition-all duration-150 min-h-[44px]">
                <Building2 className="w-4 h-4 shrink-0" />
                <span>강의실 대여</span>
              </a>
              <a href="/rental-status" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-raised transition-all duration-150 min-h-[44px]">
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span>전체 대여 현황</span>
              </a>
              <a href="/status" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-raised transition-all duration-150 min-h-[44px]">
                <Search className="w-4 h-4 shrink-0" />
                <span>신청 조회</span>
              </a>
              <a href="/guide" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-raised transition-all duration-150 min-h-[44px]">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>이용 가이드</span>
              </a>
              <a href="/regulations" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-raised transition-all duration-150 min-h-[44px]">
                <FileText className="w-4 h-4 shrink-0" />
                <span>대여 규정</span>
              </a>
              <CartHeaderButton />
              <ThemeToggle className="ml-1" />
            </nav>

            {/* 모바일 Nav — 장바구니 + 햄버거 */}
            <MobileMenu />
          </div>
        </header>

        {/* ── Main ── */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:py-8">
          {children}
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-base bg-surface-header mt-auto">
          <div className="max-w-7xl mx-auto px-4 h-12 flex items-center">
            <p className="text-xs text-base-faint">연성대학교 영상콘텐츠과 통합 대여</p>
          </div>
        </footer>
      </div>
    </CartProvider>
  )
}
