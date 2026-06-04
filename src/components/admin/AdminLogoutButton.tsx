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
      className="flex items-center gap-1.5 text-xs text-base-secondary hover:text-base-primary transition-colors px-3 py-2 rounded-lg hover:bg-surface-raised min-h-[44px]"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">로그아웃</span>
    </button>
  )
}
