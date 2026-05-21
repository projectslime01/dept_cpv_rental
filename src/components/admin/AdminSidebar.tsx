'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Package, History } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/requests', label: '신청 관리', icon: ClipboardList },
  { href: '/admin/equipment', label: '기자재 관리', icon: Package },
  { href: '/admin/history', label: '대여 이력', icon: History },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 shrink-0 border-r border-[#2a2830] bg-[#1a191b]">
      <nav className="p-3 space-y-0.5">
        <p className="text-[10px] font-bold text-[#6b6468] uppercase tracking-wider px-3 py-2">메뉴</p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#ffb2ba]/15 text-[#ffb2ba]'
                  : 'text-[#9b8f91] hover:bg-[#252228] hover:text-[#e5e2e1]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
