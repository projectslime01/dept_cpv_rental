import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div className="max-w-sm mx-auto py-16">{children}</div>
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-48 border-r bg-slate-50 p-4 shrink-0">
        <p className="font-bold mb-6 text-sm">관리자 메뉴</p>
        <nav className="space-y-1 text-sm">
          {[
            { href: '/admin/dashboard', label: '대시보드' },
            { href: '/admin/requests', label: '신청 관리' },
            { href: '/admin/equipment', label: '기자재 관리' },
            { href: '/admin/history', label: '대여 이력' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="block px-3 py-2 rounded hover:bg-slate-200">
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 pt-4 border-t">
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="text-xs text-muted-foreground hover:underline">
              로그아웃
            </button>
          </form>
        </div>
      </aside>
      <div className="flex-1 p-8">{children}</div>
    </div>
  )
}
