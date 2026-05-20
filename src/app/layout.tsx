import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProviderWrapper } from '@/components/admin/SessionProviderWrapper'

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
          <header className="border-b bg-white sticky top-0 z-10">
            <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
              <a href="/" className="font-bold text-lg">📷 기자재 대여</a>
              <nav className="flex gap-4 text-sm">
                <a href="/" className="hover:underline">기자재 목록</a>
                <a href="/status" className="hover:underline">신청 조회</a>
              </nav>
            </div>
          </header>
          <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
