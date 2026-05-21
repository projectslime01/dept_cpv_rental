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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-300 cursor-not-allowed">
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-100 text-sky-700 hover:bg-red-100 hover:text-red-600 transition-colors"
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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white transition-colors"
    >
      <ClipboardList className="w-3.5 h-3.5" />
      선택
    </button>
  )
}
