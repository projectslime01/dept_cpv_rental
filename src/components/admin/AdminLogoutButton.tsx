'use client'

import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

export function AdminLogoutButton() {
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (confirm('정말 로그아웃 하시겠습니까?')) {
      await signOut({ callbackUrl: '/admin' })
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 text-xs text-[#9b8f91] hover:text-[#e5e2e1] transition-colors px-3 py-2 rounded-lg hover:bg-[#201f21] min-h-[44px]"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">로그아웃</span>
    </button>
  )
}
