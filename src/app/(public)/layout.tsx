import { CartProvider } from '@/lib/useCart'
import { CartHeaderButton } from '@/components/cart/CartHeaderButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { List, Search, CalendarDays, Building2 } from 'lucide-react'

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
                <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
              </div>
              <span className="text-base-primary truncate">
                연성대학교 영상콘텐츠과{' '}
                <span className="text-brand-rose">통합 대여</span>
              </span>
            </a>

            {/* Nav */}
            <nav className="flex items-center gap-0.5 text-sm font-medium shrink-0 ml-2">
              <a
                href="/"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-raised transition-all duration-150 min-h-[44px]"
              >
                <List className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">기자재 대여</span>
              </a>
              <a
                href="/classrooms"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-raised transition-all duration-150 min-h-[44px]"
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">강의실 대여</span>
              </a>
              <a
                href="/rental-status"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-raised transition-all duration-150 min-h-[44px]"
              >
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">전체 대여 현황</span>
              </a>
              <a
                href="/status"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-raised transition-all duration-150 min-h-[44px]"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">신청 조회</span>
              </a>
              <CartHeaderButton />
              <ThemeToggle className="ml-1" />
            </nav>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:py-8">
          {children}
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-base bg-surface-header mt-auto">
          <div className="max-w-7xl mx-auto px-4 h-12 flex items-center">
            <p className="text-xs text-base-faint">연성대학교 영상콘텐츠과 기자재 대여 시스템</p>
          </div>
        </footer>
      </div>
    </CartProvider>
  )
}
