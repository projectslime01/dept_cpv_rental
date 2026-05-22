import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionProviderWrapper } from '@/components/admin/SessionProviderWrapper'

export const metadata: Metadata = {
  title: '연성대학교 영상콘텐츠과 기자재 대여',
  description: '연성대학교 영상콘텐츠과 기자재 대여 신청 시스템',
  icons: {
    icon: '/logo.png',
  },
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
