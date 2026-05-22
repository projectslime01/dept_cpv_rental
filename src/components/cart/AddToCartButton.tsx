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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-raised text-base-faint cursor-not-allowed">
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-rose-muted text-brand-rose border border-brand-rose/20 hover:bg-rose-100 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-400 transition-colors"
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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-raised text-base-secondary hover:bg-surface-overlay hover:text-base-primary border border-base transition-colors"
    >
      <ClipboardList className="w-3.5 h-3.5" />
      선택
    </button>
  )
}
