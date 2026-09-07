'use client'

import { useEffect, useState, useCallback } from 'react'
import { Package, AlertCircle } from 'lucide-react'

interface AccessoryOption {
  id: number
  name: string
  description: string | null
  totalQuantity: number
  available: number
}

interface Props {
  equipmentId: number
  startAt: string   // ISO string, empty string = not selected
  endAt: string     // ISO string, empty string = not selected
  onChange: (accessories: { accessoryId: number; quantity: number }[]) => void
}

export function AccessorySelector({ equipmentId, startAt, endAt, onChange }: Props) {
  const [options, setOptions] = useState<AccessoryOption[]>([])
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)

  const hasDate = !!(startAt && endAt)

  const stableOnChange = useCallback(onChange, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 기자재가 바뀌면(다른 부속 세트) 선택을 초기화한다. 날짜 변경으로는 초기화하지 않는다.
  useEffect(() => {
    setQuantities({})
  }, [equipmentId])

  // 옵션/가용 수량 조회. 날짜가 바뀌어도 선택 수량은 보존하고, 아래 clamp 이펙트가
  // 새 가용치에 맞춰 정리한다. (예전엔 여기서 매번 선택을 []로 초기화해, 부속을 먼저
  // 고른 뒤 대여 기간을 선택하면 선택이 지워지는 버그가 있었다.)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFetchError(false)
    const url = hasDate
      ? `/api/equipment/${equipmentId}/accessories?startAt=${encodeURIComponent(startAt)}&endAt=${encodeURIComponent(endAt)}`
      : `/api/equipment/${equipmentId}/accessories`

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: AccessoryOption[]) => {
        if (cancelled) return
        setOptions(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (cancelled) return
        setFetchError(true)
        setOptions([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [equipmentId, startAt, endAt, hasDate])

  // 옵션(가용 수량)이 갱신되면 선택 수량을 가용치 내로 정리한다. 선택 자체는 보존.
  useEffect(() => {
    setQuantities((prev) => {
      const next: Record<number, number> = {}
      for (const opt of options) {
        const q = prev[opt.id] ?? 0
        const clamped = hasDate ? Math.max(0, Math.min(q, opt.available)) : Math.max(0, q)
        if (clamped > 0) next[opt.id] = clamped
      }
      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(next)
      if (prevKeys.length === nextKeys.length && nextKeys.every((k) => prev[+k] === next[+k])) {
        return prev // 변경 없음 — 같은 참조 반환으로 불필요한 렌더/루프 방지
      }
      return next
    })
  }, [options, hasDate])

  // 선택 수량을 부모로 전달.
  useEffect(() => {
    stableOnChange(
      Object.entries(quantities)
        .map(([k, v]) => ({ accessoryId: parseInt(k), quantity: v }))
        .filter((a) => a.quantity > 0),
    )
  }, [quantities, stableOnChange])

  function handleQuantityChange(id: number, value: string) {
    const num = Math.max(0, parseInt(value) || 0)
    const option = options.find((o) => o.id === id)
    const clamped = option ? Math.min(num, option.available) : num

    setQuantities((prev) => {
      const next = { ...prev }
      if (clamped > 0) next[id] = clamped
      else delete next[id]
      return next
    })
  }

  if (loading) {
    return (
      <div className="text-xs text-base-muted py-2">부속 기자재 목록 불러오는 중...</div>
    )
  }

  if (fetchError) {
    return (
      <div className="text-xs text-base-muted py-2">부속 기자재 목록을 불러오지 못했습니다.</div>
    )
  }

  if (options.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-base-secondary" />
        <span className="text-sm font-semibold text-base-primary">부속 기자재 선택 (선택 사항)</span>
      </div>

      {!hasDate && (
        <div className="flex items-start gap-2 text-xs text-base-secondary bg-surface-raised rounded-xl px-3.5 py-3 border border-base">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          대여 기간을 먼저 선택하면 부속 기자재 가용 수량이 표시됩니다.
        </div>
      )}

      <div className="space-y-2">
        {options.map((opt) => {
          const qty = quantities[opt.id] ?? 0
          const isUnavailable = hasDate && opt.available === 0
          return (
            <div
              key={opt.id}
              className="flex items-center gap-3 bg-surface-raised rounded-xl px-3.5 py-3 border border-base"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-base-primary">{opt.name}</div>
                {opt.description && (
                  <div className="text-xs text-base-secondary truncate">{opt.description}</div>
                )}
                {hasDate ? (
                  <div className="text-xs text-base-muted mt-0.5">
                    {isUnavailable ? (
                      <span className="text-red-500 dark:text-red-400 font-medium">재고 없음</span>
                    ) : (
                      <>가용: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{opt.available}</span>개</>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-base-muted mt-0.5">총 {opt.totalQuantity}개 보유</div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(opt.id, String(qty - 1))}
                  disabled={qty === 0 || isUnavailable}
                  className="w-7 h-7 rounded-lg border border-base bg-surface text-base-primary hover:bg-surface-overlay disabled:opacity-30 text-sm font-bold transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  max={opt.available}
                  value={qty}
                  onChange={(e) => handleQuantityChange(opt.id, e.target.value)}
                  disabled={isUnavailable}
                  className="w-12 h-7 text-center text-sm border border-base rounded-lg bg-surface-raised text-base-primary focus:outline-none focus:border-brand-rose disabled:opacity-40 tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(opt.id, String(qty + 1))}
                  disabled={qty >= opt.available || isUnavailable}
                  className="w-7 h-7 rounded-lg border border-base bg-surface text-base-primary hover:bg-surface-overlay disabled:opacity-30 text-sm font-bold transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
