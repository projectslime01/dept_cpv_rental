'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-slate-50">
      <h3 className="font-semibold">대여 기간 선택</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>대여 시작</Label>
          <Input type="datetime-local" value={startAt} onChange={(e) => { setStartAt(e.target.value); setAvailable(null) }} />
        </div>
        <div>
          <Label>반납 예정</Label>
          <Input type="datetime-local" value={endAt} onChange={(e) => { setEndAt(e.target.value); setAvailable(null) }} />
        </div>
      </div>
      <Button variant="outline" onClick={check} disabled={!startAt || !endAt || loading} className="w-full">
        {loading ? '확인 중...' : '재고 확인'}
      </Button>
      {available !== null && (
        <div className={`text-sm font-medium ${available > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {available > 0
            ? `${available}개 대여 가능 (전체 ${totalQuantity}개)`
            : '해당 기간에 대여 가능한 수량이 없습니다.'}
        </div>
      )}
      {available !== null && available > 0 && (
        <Button onClick={goApply} className="w-full">이 기간으로 신청하기</Button>
      )}
    </div>
  )
}
