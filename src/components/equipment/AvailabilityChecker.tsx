'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { CalendarDays, CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { AvailabilityCalendar } from './AvailabilityCalendar'

interface Props {
  equipmentId: number
  totalQuantity: number
}

export function AvailabilityChecker({ equipmentId, totalQuantity }: Props) {
  const router = useRouter()
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [available, setAvailable] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  function handleRangeSelect(start: string, end: string) {
    setStartAt(start)
    setEndAt(end)
    setAvailable(null)
  }

  async function check() {
    if (!startAt || !endAt) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/equipment/${equipmentId}/availability?startAt=${encodeURIComponent(startAt)}&endAt=${encodeURIComponent(endAt)}`
      )
      const data = await res.json()
      setAvailable(data.available)
    } finally {
      setLoading(false)
    }
  }

  function goApply() {
    const params = new URLSearchParams({ equipmentId: String(equipmentId), startAt, endAt })
    router.push(`/apply?${params}`)
  }

  const isAvailable = available !== null && available > 0

  return (
    <div className="bg-surface-base rounded-2xl border border-base p-6 space-y-5">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-base-muted" />
        <h3 className="font-semibold text-sm text-base-primary">대여 기간 선택</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-base-muted">대여 시작</p>
          <DateTimePicker
            value={startAt}
            onChange={(v) => { setStartAt(v); setAvailable(null) }}
            placeholder="대여 시작"
            disablePast
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-base-muted">반납 예정</p>
          <DateTimePicker
            value={endAt}
            onChange={(v) => { setEndAt(v); setAvailable(null) }}
            placeholder="반납 예정"
            disablePast
          />
        </div>
      </div>

      {/* 비주얼 실시간 예약 현황 캘린더 */}
      <AvailabilityCalendar
        equipmentId={equipmentId}
        totalQuantity={totalQuantity}
        startAt={startAt}
        endAt={endAt}
        onRangeSelect={handleRangeSelect}
      />

      <button
        type="button"
        onClick={check}
        disabled={!startAt || !endAt || loading}
        className="w-full h-10 rounded-xl border border-base bg-surface-raised text-sm font-semibold text-base-secondary hover:bg-surface-overlay hover:text-base-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />확인 중...</> : '재고 확인'}
      </button>

      {available !== null && (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium border
          ${isAvailable
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400'}`}>
          {isAvailable
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <XCircle className="w-4 h-4 shrink-0" />}
          <span>
            {isAvailable
              ? `${available}개 대여 가능 (전체 ${totalQuantity}개)`
              : '해당 기간에 대여 가능한 수량이 없습니다.'}
          </span>
        </div>
      )}

      {isAvailable && (
        <button
          type="button"
          onClick={goApply}
          className="w-full h-11 rounded-xl bg-rose-600 dark:bg-brand-rose hover:bg-rose-700 dark:hover:bg-rose-400 text-white dark:text-zinc-950 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          이 기간으로 신청하기
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
