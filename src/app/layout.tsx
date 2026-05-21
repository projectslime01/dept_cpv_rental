import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProviderWrapper } from '@/components/admin/SessionProviderWrapper'
import { CartProvider } from '@/lib/useCart'
import { CartHeaderButton } from '@/components/cart/CartHeaderButton'
import { Camera, List, Search } from 'lucide-react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '영상콘텐츠과 기자재 대여',
  description: '영상콘텐츠과 기자재 대여 신청 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <SessionProviderWrapper>
          <CartProvider>
            <header className="bg-slate-900 text-white sticky top-0 z-10 shadow-lg">
              <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                <a href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
                  <Camera className="w-5 h-5 text-sky-400" />
                  <span>영상콘텐츠과 <span className="text-sky-400">기자재</span></span>
                </a>
                <nav className="flex gap-1 text-sm font-medium">
                  <a href="/" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-slate-700 transition-colors duration-150">
                    <List className="w-4 h-4" />
                    <span>기자재 목록</span>
                  </a>
                  <a href="/status" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-slate-700 transition-colors duration-150">
                    <Search className="w-4 h-4" />
                    <span>신청 조회</span>
                  </a>
                  <CartHeaderButton />
                </nav>
              </div>
            </header>
            <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
          </CartProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
