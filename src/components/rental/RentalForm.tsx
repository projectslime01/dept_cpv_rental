'use client'

import { useTransition, useState } from 'react'
import { createRentalRequest } from '@/app/actions/rental'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { CheckCircle2, ArrowRight } from 'lucide-react'

interface Props {
  equipmentId: number
  equipmentName: string
  defaultStartAt?: string
  defaultEndAt?: string
  maxQuantity: number
}

export function RentalForm({ equipmentId, equipmentName, defaultStartAt, defaultEndAt, maxQuantity }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState<string | null>(null)
  const [startAt, setStartAt] = useState(defaultStartAt ?? '')
  const [endAt, setEndAt] = useState(defaultEndAt ?? '')

  function handleSubmit(formData: FormData) {
    formData.set('equipmentId', String(equipmentId))
    formData.set('startAt', startAt)
    formData.set('endAt', endAt)
    setError(null)
    startTransition(async () => {
      const result = await createRentalRequest(formData)
      if (result.success) setRequestNumber(result.requestNumber)
      else setError(result.error)
    })
  }

  if (requestNumber) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center space-y-5">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">신청 완료!</h2>
          <p className="text-sm text-slate-500 mt-1">{equipmentName} 대여 신청이 접수됐습니다.</p>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">신청 번호</p>
          <p className="font-mono text-lg font-black text-slate-900">{requestNumber}</p>
        </div>
        <p className="text-xs text-red-500 font-medium bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">
          ⚠️ 위 번호를 반드시 저장하세요. 조회 시 사용됩니다.
        </p>
        <div className="flex gap-2 justify-center">
          <a href="/" className="h-10 px-5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center">목록으로</a>
          <a href="/status" className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold transition-colors flex items-center gap-1.5">
            신청 조회 <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
        <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
        <span className="text-sm font-semibold text-slate-700">{equipmentName}</span>
      </div>

      <form action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="applicantName" className="block text-xs font-medium text-slate-400">이름 *</label>
            <input id="applicantName" name="applicantName" required
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="studentId" className="block text-xs font-medium text-slate-400">학번 *</label>
            <input id="studentId" name="studentId" required
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className="block text-xs font-medium text-slate-400">연락처 *</label>
          <input id="phone" name="phone" type="tel" placeholder="010-0000-0000" required
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm bg-slate-50 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-400">대여 시작 *</p>
            <DateTimePicker value={startAt} onChange={setStartAt} placeholder="대여 시작" disablePast />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-400">반납 예정 *</p>
            <DateTimePicker value={endAt} onChange={setEndAt} placeholder="반납 예정" disablePast />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="quantity" className="block text-xs font-medium text-slate-400">수량 * <span className="text-slate-300">(최대 {maxQuantity}개)</span></label>
          <input id="quantity" name="quantity" type="number" min={1} max={maxQuantity} defaultValue={1} required
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-xs font-medium text-slate-400">조회용 비밀번호 * <span className="text-slate-300">(4~8자리)</span></label>
          <input id="password" name="password" type="password" minLength={4} maxLength={8} required
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors" />
          <p className="text-[11px] text-slate-400">신청 후 조회 시 사용합니다. 분실 시 복구 불가.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="purpose" className="block text-xs font-medium text-slate-400">사용 목적 <span className="text-slate-300">(선택)</span></label>
          <textarea id="purpose" name="purpose" rows={2}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors resize-none" />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>
        )}

        <button type="submit" disabled={isPending || !startAt || !endAt}
          className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {isPending ? '신청 중...' : '대여 신청하기'}
        </button>
      </form>
    </div>
  )
}
