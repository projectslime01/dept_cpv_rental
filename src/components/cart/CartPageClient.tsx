'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/useCart'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createBatchRentalRequest } from '@/app/actions/rental'
import { ClipboardList, Trash2, CheckCircle2, Minus, Plus } from 'lucide-react'

const CATEGORY_COLORS: Record<string, string> = {
  '카메라 바디': 'text-sky-600 bg-sky-50',
  '렌즈': 'text-violet-600 bg-violet-50',
  '영상 장비': 'text-blue-600 bg-blue-50',
  '조명': 'text-amber-600 bg-amber-50',
  '저장 매체': 'text-emerald-600 bg-emerald-50',
  '삼각대/지지대': 'text-slate-600 bg-slate-100',
  '필터': 'text-indigo-600 bg-indigo-50',
  '배터리': 'text-orange-600 bg-orange-50',
  '음향': 'text-pink-600 bg-pink-50',
  '기타': 'text-gray-600 bg-gray-100',
}

function SuccessScreen({
  groupNumber,
  requestNumbers,
  onClear,
}: {
  groupNumber: string
  requestNumbers: string[]
  onClear: () => void
}) {
  return (
    <div className="border rounded-2xl p-6 bg-green-50 text-center space-y-5">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100">
        <CheckCircle2 className="w-7 h-7 text-green-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold">신청이 완료됐습니다</h2>
        <p className="text-sm text-muted-foreground mt-1">{requestNumbers.length}종 기자재가 일괄 신청됐습니다.</p>
      </div>

      <div className="bg-white border rounded-xl p-4 text-left space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">신청 번호</p>
        {requestNumbers.map((rn, i) => (
          <p key={rn} className="font-mono text-sm font-bold text-slate-800">
            {rn}
          </p>
        ))}
      </div>

      <p className="text-xs text-red-600 font-medium bg-red-50 rounded-lg px-3 py-2">
        ⚠️ 위 번호를 반드시 저장하세요. 조회 시 필요합니다.
      </p>

      <div className="flex gap-2 justify-center pt-1">
        <Button variant="outline" asChild onClick={onClear}>
          <Link href="/">목록으로</Link>
        </Button>
        <Button asChild>
          <Link href="/status">신청 조회</Link>
        </Button>
      </div>
    </div>
  )
}

export function CartPageClient() {
  const { items, remove, setQty, clear, hydrated } = useCart()
  const [isPending, startTransition] = useTransition()
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ groupNumber: string; requestNumbers: string[] } | null>(null)

  if (!hydrated) return null

  if (result) {
    return <SuccessScreen {...result} onClear={clear} />
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground space-y-3">
        <ClipboardList className="w-12 h-12 mx-auto opacity-20" />
        <p className="text-sm">선택한 기자재가 없습니다.</p>
        <Button asChild variant="outline">
          <Link href="/">기자재 목록으로</Link>
        </Button>
      </div>
    )
  }

  function handleSubmit(formData: FormData) {
    formData.set('startAt', startAt)
    formData.set('endAt', endAt)
    formData.set('items', JSON.stringify(items.map(i => ({ equipmentId: i.equipmentId, quantity: i.quantity }))))
    setError(null)
    startTransition(async () => {
      const res = await createBatchRentalRequest(formData)
      if (res.success) {
        setResult({ groupNumber: res.groupNumber, requestNumbers: res.requestNumbers })
        clear()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* 선택 목록 */}
      <div className="border rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm">선택한 기자재 <span className="text-muted-foreground font-normal">({items.length}종)</span></h2>
        </div>
        <div className="divide-y">
          {items.map(item => {
            const colorClass = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS['기타']
            return (
              <div key={item.equipmentId} className="flex items-center gap-3 px-4 py-3">
                <div className={`px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0 ${colorClass}`}>
                  {item.category}
                </div>
                <p className="flex-1 text-sm font-medium truncate">{item.name}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setQty(item.equipmentId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="w-7 h-7 rounded-lg border flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQty(item.equipmentId, item.quantity + 1)}
                    disabled={item.quantity >= item.totalQuantity}
                    className="w-7 h-7 rounded-lg border flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.equipmentId)}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <form action={handleSubmit} className="space-y-4">
        {/* 대여 기간 */}
        <div className="border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-sm">대여 기간 <span className="text-xs text-muted-foreground font-normal">(전체 기자재 공통)</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">대여 시작 *</Label>
              <DateTimePicker value={startAt} onChange={setStartAt} placeholder="대여 시작" disablePast />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">반납 예정 *</Label>
              <DateTimePicker value={endAt} onChange={setEndAt} placeholder="반납 예정" disablePast />
            </div>
          </div>
        </div>

        {/* 신청자 정보 */}
        <div className="border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-sm">신청자 정보</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="applicantName" className="text-xs text-muted-foreground">이름 *</Label>
              <Input id="applicantName" name="applicantName" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studentId" className="text-xs text-muted-foreground">학번 *</Label>
              <Input id="studentId" name="studentId" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs text-muted-foreground">연락처 *</Label>
            <Input id="phone" name="phone" type="tel" placeholder="010-0000-0000" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs text-muted-foreground">조회용 비밀번호 * (4~8자리)</Label>
            <Input id="password" name="password" type="password" minLength={4} maxLength={8} required />
            <p className="text-xs text-muted-foreground">신청 후 조회 시 사용합니다. 분실 시 복구 불가.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="purpose" className="text-xs text-muted-foreground">사용 목적 (선택)</Label>
            <Textarea id="purpose" name="purpose" rows={2} />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <Button
          type="submit"
          className="w-full bg-slate-900 hover:bg-slate-700"
          disabled={isPending || !startAt || !endAt}
        >
          {isPending ? '신청 중...' : `${items.length}종 기자재 일괄 신청`}
        </Button>
      </form>
    </div>
  )
}
