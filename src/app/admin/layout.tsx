import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Camera, LogOut } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return (
      <div className="min-h-screen bg-[#f6f7f9] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 w-full max-w-sm">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] flex flex-col">
      {/* Admin header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 h-14 flex items-center px-6 shrink-0">
        <div className="flex items-center gap-2.5 font-bold text-base tracking-tight">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
            <Camera className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <span className="text-white">영상콘텐츠과 <span className="text-sky-400">기자재</span></span>
          <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">관리자</span>
        </div>
        <div className="ml-auto">
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800">
              <LogOut className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </form>
        </div>
      </header>

      {/* Content area */}
      <div className="flex flex-1 min-h-0">
        <AdminSidebar />
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
