'use client'

import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { useCart } from '@/lib/useCart'

export function CartHeaderButton() {
  const { count, hydrated } = useCart()

  return (
    <Link
      href="/cart"
      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#9b8f91] hover:text-[#e5e2e1] hover:bg-[#201f21] transition-all duration-150 text-sm font-medium"
    >
      <ClipboardList className="w-3.5 h-3.5" />
      <span>신청함</span>
      {hydrated && count > 0 && (
        <span className="absolute -top-1 -right-1 bg-[#ff4f73] text-white text-[10px] font-black rounded-full flex items-center justify-center min-w-[18px] px-1 h-[18px]">
          {count}
        </span>
      )}
    </Link>
  )
}
