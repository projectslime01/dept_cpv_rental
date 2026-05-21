import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProviderWrapper } from '@/components/admin/SessionProviderWrapper'
import { CartProvider } from '@/lib/useCart'
import { CartHeaderButton } from '@/components/cart/CartHeaderButton'
import { Camera, List, Search } from 'lucide-react'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: '영상콘텐츠과 기자재 대여',
  description: '영상콘텐츠과 기자재 대여 신청 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={inter.variable}>
      <body className={inter.className}>
        <SessionProviderWrapper>
          <CartProvider>
            <div className="min-h-screen flex flex-col">
              <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
                  <a href="/" className="flex items-center gap-2.5 font-bold text-base tracking-tight hover:opacity-90 transition-opacity">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
                      <Camera className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                    <span className="text-white">영상콘텐츠과 <span className="text-sky-400">기자재</span></span>
                  </a>
                  <nav className="flex items-center gap-0.5 text-sm font-medium">
                    <a href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all duration-150">
                      <List className="w-3.5 h-3.5" />
                      <span>기자재 목록</span>
                    </a>
                    <a href="/status" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all duration-150">
                      <Search className="w-3.5 h-3.5" />
                      <span>신청 조회</span>
                    </a>
                    <CartHeaderButton />
                  </nav>
                </div>
              </header>
              <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
                {children}
              </main>
              <footer className="border-t border-slate-200 bg-white mt-auto">
                <div className="max-w-5xl mx-auto px-4 h-12 flex items-center">
                  <p className="text-xs text-slate-400">영상콘텐츠과 기자재 대여 시스템</p>
                </div>
              </footer>
            </div>
          </CartProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
