'use client'

import { useState, useTransition } from 'react'
import { lookupRequest, LookupResult } from '@/app/actions/rental'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Loader2, CalendarDays, Clock, ClipboardList } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:  { label: '승인 대기', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: '승인됨',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: '거절됨',   color: 'bg-red-50 text-red-600 border-red-200' },
  returned: { label: '반납 완료', color: 'bg-slate-50 text-slate-600 border-slate-200' },
}

const fmt = (d: Date) => format(new Date(d), 'yyyy.MM.dd HH:mm', { locale: ko })

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-slate-50 text-slate-600 border-slate-200' }
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

export function StatusLookup() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Extract<LookupResult, { success: true }> | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    setResult(null)
    startTransition(async () => {
      const res = await lookupRequest(formData)
      if (res.success) setResult(res)
      else setError(res.error + (res.remainingAttempts != null ? ` (남은 시도: ${res.remainingAttempts}회)` : ''))
    })
  }

  return (
    <div className="space-y-5">
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="requestNumber" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            신청 번호
          </label>
          <input
            id="requestNumber"
            name="requestNumber"
            placeholder="REQ-20260520-0001"
            required
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm bg-slate-50 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            조회용 비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm bg-slate-50 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
          />
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />조회 중...</> : '조회하기'}
        </button>
      </form>

      {result && (
        <div className="space-y-3 pt-1">
          {/* 공통 정보 */}
          <div className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <CalendarDays className="w-3.5 h-3.5" />
              대여 기간
            </div>
            <p className="text-sm font-medium text-slate-700">
              {fmt(result.data.startAt)} <span className="text-slate-400 mx-1">→</span> {fmt(result.data.endAt)}
            </p>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              신청일: {fmt(result.data.createdAt)}
            </p>
          </div>

          {/* 묶음 */}
          {result.groupItems && result.groupItems.length > 1 ? (
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs font-semibold text-slate-500">일괄 신청 {result.groupItems.length}종</p>
              </div>
              <div className="divide-y divide-slate-50">
                {result.groupItems.map(item => (
                  <div key={item.requestNumber} className="flex items-center justify-between px-4 py-3.5">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-slate-800">{item.equipmentName} <span className="font-normal text-slate-400">× {item.quantity}개</span></p>
                      <p className="text-[11px] text-slate-400 font-mono">{item.requestNumber}</p>
                      {item.adminNote && <p className="text-xs text-slate-500 mt-1">메모: {item.adminNote}</p>}
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 단건 */
            <div className="rounded-xl border border-slate-100 px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-800">{result.data.equipmentName} <span className="font-normal text-slate-400">× {result.data.quantity}개</span></p>
                <p className="text-[11px] text-slate-400 font-mono">{result.data.requestNumber}</p>
                {result.data.adminNote && <p className="text-xs text-slate-500 mt-1">메모: {result.data.adminNote}</p>}
              </div>
              <StatusBadge status={result.data.status} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
