import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminBottomNav } from '@/components/admin/AdminBottomNav'
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton'
import { ThemeToggle } from '@/components/ThemeToggle'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="bg-surface-base rounded-2xl border border-base shadow-xl p-8 w-full max-w-sm">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Admin header */}
      <header className="bg-surface-header border-b border-base h-14 flex items-center px-4 md:px-6 shrink-0">
        <div className="flex items-center gap-2.5 font-bold text-base tracking-tight">
          <div className="w-7 h-7 flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          <span className="text-base-primary">
            연성대학교 영상콘텐츠과{' '}
            <span className="text-brand-rose">기자재 대여</span>
          </span>
          <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-rose-muted text-brand-rose border border-brand-rose">
            관리자
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-base-muted hidden sm:inline">
            <span className="text-brand-rose font-bold">{session.user.name || '관리자'}</span>님 환영합니다
          </span>
          <ThemeToggle />
          <AdminLogoutButton />
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
