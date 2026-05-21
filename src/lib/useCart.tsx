'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export interface CartItem {
  equipmentId: number
  name: string
  category: string
  totalQuantity: number
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  add: (item: Omit<CartItem, 'quantity'>) => void
  remove: (equipmentId: number) => void
  setQty: (equipmentId: number, qty: number) => void
  clear: () => void
  count: number
  hydrated: boolean
}

const CartContext = createContext<CartContextValue | null>(null)
const STORAGE_KEY = 'rental-cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

  const add = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems(prev => {
      if (prev.some(i => i.equipmentId === item.equipmentId)) return prev
      return [...prev, { ...item, quantity: 1 }]
    })
  }, [])

  const remove = useCallback((equipmentId: number) => {
    setItems(prev => prev.filter(i => i.equipmentId !== equipmentId))
  }, [])

  const setQty = useCallback((equipmentId: number, qty: number) => {
    setItems(prev => prev.map(i =>
      i.equipmentId === equipmentId
        ? { ...i, quantity: Math.max(1, Math.min(qty, i.totalQuantity)) }
        : i
    ))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  return (
    <CartContext.Provider value={{ items, add, remove, setQty, clear, count: items.length, hydrated }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
