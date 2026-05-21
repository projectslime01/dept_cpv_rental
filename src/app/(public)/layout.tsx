import { CartProvider } from '@/lib/useCart'
import { CartHeaderButton } from '@/components/cart/CartHeaderButton'
import { Camera, List, Search } from 'lucide-react'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        <header className="bg-[#0f0e11] border-b border-[#2a2830] sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 font-bold text-base tracking-tight hover:opacity-90 transition-opacity min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#ffb2ba]/15 border border-[#ffb2ba]/25 flex items-center justify-center shrink-0">
                <Camera className="w-3.5 h-3.5 text-[#ffb2ba]" />
              </div>
              <span className="text-[#e5e2e1] truncate">영상콘텐츠과 <span className="text-[#ffb2ba]">기자재</span></span>
            </a>
            <nav className="flex items-center gap-0.5 text-sm font-medium shrink-0 ml-2">
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
