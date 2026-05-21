'use client'

import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { useCart } from '@/lib/useCart'

export function CartHeaderButton() {
  const { count, hydrated } = useCart()

  return (
    <Link
      href="/cart"
      className="relative flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-slate-700 transition-colors duration-150"
    >
      <ClipboardList className="w-4 h-4" />
      <span>신청함</span>
      {hydrated && count > 0 && (
        <span className="absolute -top-1 -right-1 bg-sky-400 text-slate-900 text-[10px] font-black rounded-full flex items-center justify-center min-w-[18px] px-1 h-[18px]">
          {count}
        </span>
      )}
    </Link>
  )
}
