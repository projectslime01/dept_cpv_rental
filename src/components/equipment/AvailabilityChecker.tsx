'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CalendarDays, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

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
    <div className="border rounded-xl p-5 space-y-5 bg-slate-50">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-slate-600" />
        <h3 className="font-semibold text-sm">대여 기간 선택</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">대여 시작</Label>
          <Input
            type="datetime-local"
            value={startAt}
            onChange={(e) => { setStartAt(e.target.value); setAvailable(null) }}
            className="bg-white text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">반납 예정</Label>
          <Input
            type="datetime-local"
            value={endAt}
            onChange={(e) => { setEndAt(e.target.value); setAvailable(null) }}
            className="bg-white text-sm"
          />
        </div>
      </div>

      <Button
        variant="outline"
        onClick={check}
        disabled={!startAt || !endAt || loading}
        className="w-full bg-white hover:bg-slate-100"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            확인 중...
          </>
        ) : '재고 확인'}
      </Button>

      {available !== null && (
        <div className={`flex items-start gap-3 rounded-lg p-3 text-sm font-medium
          ${isAvailable ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
          {isAvailable
            ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>
            {isAvailable
              ? `${available}개 대여 가능 (전체 ${totalQuantity}개)`
              : '해당 기간에 대여 가능한 수량이 없습니다.'}
          </span>
        </div>
      )}

      {isAvailable && (
        <Button onClick={goApply} className="w-full bg-slate-900 hover:bg-slate-700">
          이 기간으로 신청하기
        </Button>
      )}
    </div>
  )
}
