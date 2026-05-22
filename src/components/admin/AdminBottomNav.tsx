'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Package, Building2, History, Users } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/requests', label: '신청', icon: ClipboardList },
  { href: '/admin/equipment', label: '기자재', icon: Package },
  { href: '/admin/classrooms', label: '강의실', icon: Building2 },
  { href: '/admin/history', label: '이력', icon: History },
  { href: '/admin/accounts', label: '계정', icon: Users },
]

export function AdminBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f0e11] border-t border-[#2a2830]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                active ? 'text-[#ffb2ba]' : 'text-[#6b6468] hover:text-[#9b8f91]'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
