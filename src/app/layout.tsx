import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionProviderWrapper } from '@/components/admin/SessionProviderWrapper'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: '연성대학교 영상콘텐츠과 통합 대여',
  description: '연성대학교 영상콘텐츠과 통합 대여 시스템',
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
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <SessionProviderWrapper>
            {children}
          </SessionProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  )
}
