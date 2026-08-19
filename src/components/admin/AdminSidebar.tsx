'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Package, Building2, DoorOpen, History, Users, TestTube2, BookOpen, Ban, GraduationCap } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin/dashboard',    label: '대시보드',    icon: LayoutDashboard },
  { href: '/admin/requests',     label: '기자재 신청', icon: ClipboardList },
  { href: '/admin/classroom',    label: '강의실 신청', icon: DoorOpen },
  { href: '/admin/equipment',    label: '기자재 관리', icon: Package },
  { href: '/admin/classrooms',   label: '강의실 관리', icon: Building2 },
  { href: '/admin/students',     label: '학생 명단',   icon: GraduationCap },
  { href: '/admin/restrictions', label: '대여 제한자', icon: Ban },
  { href: '/admin/history',      label: '대여 이력',   icon: History },
  { href: '/admin/test-request', label: '테스트 신청', icon: TestTube2 },
  { href: '/admin/guide',        label: '이용 가이드', icon: BookOpen },
  { href: '/admin/accounts',     label: '계정 관리',   icon: Users },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:block w-52 shrink-0 border-r border-base bg-surface-raised">
      <nav className="p-3 space-y-0.5">
        <p className="text-[10px] font-bold text-base-faint uppercase tracking-wider px-3 py-2">메뉴</p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-rose-muted text-brand-rose'
                  : 'text-base-secondary hover:bg-surface-overlay hover:text-base-primary'
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
