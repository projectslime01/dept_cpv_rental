'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/useCart'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { createBatchRentalRequest } from '@/app/actions/rental'
import { ClipboardList, Trash2, CheckCircle2, Minus, Plus, ArrowRight, CalendarDays, User } from 'lucide-react'

const CATEGORY_STYLES: Record<string, string> = {
  '카메라 바디': 'text-sky-300 bg-sky-950/60 border-sky-900/60',
  '렌즈':        'text-violet-300 bg-violet-950/60 border-violet-900/60',
  '영상 장비':   'text-blue-300 bg-blue-950/60 border-blue-900/60',
  '조명':        'text-amber-300 bg-amber-950/60 border-amber-900/60',
  '저장 매체':   'text-emerald-300 bg-emerald-950/60 border-emerald-900/60',
  '삼각대/지지대':'text-slate-300 bg-slate-800/60 border-slate-700/60',
  '필터':        'text-indigo-300 bg-indigo-950/60 border-indigo-900/60',
  '배터리':      'text-orange-300 bg-orange-950/60 border-orange-900/60',
  '음향':        'text-pink-300 bg-pink-950/60 border-pink-900/60',
  '기타':        'text-[#9b8f91] bg-[#252228] border-[#3a3640]',
}

const inputCls = 'w-full h-10 px-3.5 rounded-xl border border-[#3a3640] text-sm bg-[#1a191b] text-[#e5e2e1] focus:outline-none focus:border-[#7d7173] transition-colors'

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#252228]">
        <Icon className="w-4 h-4 text-[#6b6468]" />
        <h2 className="text-sm font-semibold text-[#c8c4c3]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function SuccessScreen({ requestNumbers, onClear }: { groupNumber: string; requestNumbers: string[]; onClear: () => void }) {
  return (
    <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-8 text-center space-y-5">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-950/50 border border-emerald-900/50">
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-[#e5e2e1]">신청 완료!</h2>
        <p className="text-sm text-[#9b8f91] mt-1">{requestNumbers.length}종 기자재가 일괄 신청됐습니다.</p>
      </div>
      <div className="bg-[#1a191b] rounded-xl border border-[#2e2b2f] p-4 text-left space-y-2">
        <p className="text-[11px] font-bold text-[#6b6468] uppercase tracking-wider mb-3">신청 번호</p>
        {requestNumbers.map(rn => (
          <p key={rn} className="font-mono text-sm font-bold text-[#ffb2ba] bg-[#252228] rounded-lg border border-[#2e2b2f] px-3 py-2">
            {rn}
          </p>
        ))}
      </div>
      <p className="text-xs text-red-400 font-medium bg-red-950/40 rounded-xl px-4 py-2.5 border border-red-900/50">
        ⚠️ 위 번호를 반드시 저장하세요. 조회 시 사용됩니다.
      </p>
      <div className="flex gap-2 justify-center">
        <Link href="/" onClick={onClear} className="h-10 px-5 rounded-xl border border-[#3a3640] text-sm font-semibold text-[#9b8f91] hover:bg-[#252228] hover:text-[#e5e2e1] transition-colors flex items-center">
          목록으로
        </Link>
        <Link href="/status" className="h-10 px-5 rounded-xl bg-[#ff4f73] hover:bg-[#e03d61] text-white text-sm font-semibold transition-colors flex items-center gap-1.5">
          신청 조회 <ArrowRight className="w-3.5 h-3.5" />
        </Link>
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
  if (result) return <SuccessScreen {...result} onClear={clear} />

  if (items.length === 0) {
    return (
      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] py-20 text-center space-y-3">
        <ClipboardList className="w-12 h-12 mx-auto text-[#3a3640]" />
        <p className="text-sm font-medium text-[#6b6468]">선택한 기자재가 없습니다.</p>
        <Link href="/" className="inline-flex items-center h-9 px-5 rounded-xl border border-[#3a3640] text-sm font-semibold text-[#9b8f91] hover:bg-[#252228] hover:text-[#e5e2e1] transition-colors">
          기자재 목록으로
        </Link>
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
      if (res.success) { setResult({ groupNumber: res.groupNumber, requestNumbers: res.requestNumbers }); clear() }
      else setError(res.error)
    })
  }

  return (
    <div className="space-y-4">
      {/* 선택 목록 */}
      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#252228]">
          <ClipboardList className="w-4 h-4 text-[#6b6468]" />
          <h2 className="text-sm font-semibold text-[#c8c4c3]">선택한 기자재</h2>
          <span className="ml-auto text-xs text-[#6b6468]">{items.length}종</span>
        </div>
        <div className="divide-y divide-[#252228]">
          {items.map(item => {
            const catStyle = CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES['기타']
            return (
              <div key={item.equipmentId} className="flex items-center gap-3 px-5 py-3.5">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${catStyle}`}>
                  {item.category}
                </span>
                <p className="flex-1 text-sm font-medium text-[#e5e2e1] truncate">{item.name}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => setQty(item.equipmentId, item.quantity - 1)} disabled={item.quantity <= 1}
                    className="w-7 h-7 rounded-lg border border-[#3a3640] flex items-center justify-center hover:bg-[#252228] disabled:opacity-30 transition-colors">
                    <Minus className="w-3 h-3 text-[#9b8f91]" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-[#e5e2e1]">{item.quantity}</span>
                  <button type="button" onClick={() => setQty(item.equipmentId, item.quantity + 1)} disabled={item.quantity >= item.totalQuantity}
                    className="w-7 h-7 rounded-lg border border-[#3a3640] flex items-center justify-center hover:bg-[#252228] disabled:opacity-30 transition-colors">
                    <Plus className="w-3 h-3 text-[#9b8f91]" />
                  </button>
                </div>
                <button type="button" onClick={() => remove(item.equipmentId)}
                  className="p-1.5 rounded-lg text-[#4a4448] hover:text-red-400 hover:bg-red-950/40 transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <form action={handleSubmit} className="space-y-4">
        {/* 대여 기간 */}
        <SectionCard title="대여 기간 (전체 공통)" icon={CalendarDays}>
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
        </SectionCard>

        {/* 신청자 정보 */}
        <SectionCard title="신청자 정보" icon={User}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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
          </div>
        </SectionCard>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button type="submit" disabled={isPending || !startAt || !endAt}
          className="w-full h-12 rounded-xl bg-[#ff4f73] hover:bg-[#e03d61] text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {isPending ? '신청 중...' : <>{items.length}종 기자재 일괄 신청 <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>
    </div>
  )
}
