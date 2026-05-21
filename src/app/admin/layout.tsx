import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Camera, LogOut } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return (
      <div className="min-h-screen bg-[#131315] flex items-center justify-center">
        <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] shadow-xl p-8 w-full max-w-sm">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#131315] flex flex-col">
      {/* Admin header */}
      <header className="bg-[#0f0e11] border-b border-[#2a2830] h-14 flex items-center px-6 shrink-0">
        <div className="flex items-center gap-2.5 font-bold text-base tracking-tight">
          <div className="w-7 h-7 rounded-lg bg-[#ffb2ba]/15 border border-[#ffb2ba]/25 flex items-center justify-center">
            <Camera className="w-3.5 h-3.5 text-[#ffb2ba]" />
          </div>
          <span className="text-[#e5e2e1]">영상콘텐츠과 <span className="text-[#ffb2ba]">기자재</span></span>
          <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#ffb2ba]/15 text-[#ffb2ba] border border-[#ffb2ba]/25">관리자</span>
        </div>
        <div className="ml-auto">
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="flex items-center gap-1.5 text-xs text-[#9b8f91] hover:text-[#e5e2e1] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#201f21]">
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
