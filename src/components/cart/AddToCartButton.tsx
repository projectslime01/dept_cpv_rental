'use client'

import { useCart, CartItem } from '@/lib/useCart'
import { ClipboardList, Check } from 'lucide-react'

interface Props {
  item: Omit<CartItem, 'quantity'>
  disabled?: boolean
}

export function AddToCartButton({ item, disabled }: Props) {
  const { items, add, remove } = useCart()
  const inCart = items.some(i => i.equipmentId === item.equipmentId)

  if (disabled) {
    return (
      <button type="button" disabled
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#252228] text-[#4a4448] cursor-not-allowed">
        <ClipboardList className="w-3.5 h-3.5" />
        선택
      </button>
    )
  }

  if (inCart) {
    return (
      <button
        type="button"
        onClick={() => remove(item.equipmentId)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#ffb2ba]/15 text-[#ffb2ba] hover:bg-red-950/50 hover:text-red-400 transition-colors"
      >
        <Check className="w-3.5 h-3.5" />
        선택됨
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => add(item)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#252228] text-[#9b8f91] hover:bg-[#2e2b33] hover:text-[#e5e2e1] border border-[#3a3640] transition-colors"
    >
      <ClipboardList className="w-3.5 h-3.5" />
      선택
    </button>
  )
}
