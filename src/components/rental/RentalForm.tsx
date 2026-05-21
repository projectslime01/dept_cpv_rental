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

const inputCls = 'w-full h-10 px-3.5 rounded-xl border border-[#3a3640] text-sm bg-[#1a191b] text-[#e5e2e1] placeholder:text-[#4a4448] focus:outline-none focus:border-[#7d7173] transition-colors'

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
      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-8 text-center space-y-5">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-950/50 border border-emerald-900/50">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#e5e2e1]">신청 완료!</h2>
          <p className="text-sm text-[#9b8f91] mt-1">{equipmentName} 대여 신청이 접수됐습니다.</p>
        </div>
        <div className="bg-[#1a191b] rounded-xl border border-[#2e2b2f] p-4">
          <p className="text-[11px] font-bold text-[#6b6468] uppercase tracking-wider mb-2">신청 번호</p>
          <p className="font-mono text-lg font-black text-[#ffb2ba]">{requestNumber}</p>
        </div>
        <p className="text-xs text-red-400 font-medium bg-red-950/40 rounded-xl px-4 py-2.5 border border-red-900/50">
          ⚠️ 위 번호를 반드시 저장하세요. 조회 시 사용됩니다.
        </p>
        <div className="flex gap-2 justify-center">
          <a href="/" className="h-10 px-5 rounded-xl border border-[#3a3640] text-sm font-semibold text-[#9b8f91] hover:bg-[#252228] hover:text-[#e5e2e1] transition-colors flex items-center">목록으로</a>
          <a href="/status" className="h-10 px-5 rounded-xl bg-[#ff4f73] hover:bg-[#e03d61] text-white text-sm font-semibold transition-colors flex items-center gap-1.5">
            신청 조회 <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-6 space-y-5">
      <div className="flex items-center gap-3 bg-[#1a191b] rounded-xl px-4 py-3 border border-[#2e2b2f]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#ffb2ba] shrink-0" />
        <span className="text-sm font-semibold text-[#c8c4c3]">{equipmentName}</span>
      </div>

      <form action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="applicantName" className="block text-xs font-medium text-[#9b8f91]">이름 *</label>
            <input id="applicantName" name="applicantName" required className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="studentId" className="block text-xs font-medium text-[#9b8f91]">학번 *</label>
            <input id="studentId" name="studentId" required className={inputCls} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className="block text-xs font-medium text-[#9b8f91]">연락처 *</label>
          <input id="phone" name="phone" type="tel" placeholder="010-0000-0000" required className={inputCls} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[#9b8f91]">대여 시작 *</p>
            <DateTimePicker value={startAt} onChange={setStartAt} placeholder="대여 시작" disablePast />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[#9b8f91]">반납 예정 *</p>
            <DateTimePicker value={endAt} onChange={setEndAt} placeholder="반납 예정" disablePast />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="quantity" className="block text-xs font-medium text-[#9b8f91]">수량 * <span className="text-[#4a4448]">(최대 {maxQuantity}개)</span></label>
          <input id="quantity" name="quantity" type="number" min={1} max={maxQuantity} defaultValue={1} required className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-xs font-medium text-[#9b8f91]">조회용 비밀번호 * <span className="text-[#4a4448]">(4~8자리)</span></label>
          <input id="password" name="password" type="password" minLength={4} maxLength={8} required className={inputCls} />
          <p className="text-[11px] text-[#6b6468]">신청 후 조회 시 사용합니다. 분실 시 복구 불가.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="purpose" className="block text-xs font-medium text-[#9b8f91]">사용 목적 <span className="text-[#4a4448]">(선택)</span></label>
          <textarea id="purpose" name="purpose" rows={2}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#3a3640] text-sm bg-[#1a191b] text-[#e5e2e1] focus:outline-none focus:border-[#7d7173] transition-colors resize-none" />
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">{error}</div>
        )}

        <button type="submit" disabled={isPending || !startAt || !endAt}
          className="w-full h-11 rounded-xl bg-[#ff4f73] hover:bg-[#e03d61] text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {isPending ? '신청 중...' : '대여 신청하기'}
        </button>
      </form>
    </div>
  )
}
