'use client'

import { useState, useTransition } from 'react'
import { lookupRequest, LookupResult } from '@/app/actions/rental'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Loader2, CalendarDays, Clock, ClipboardList, Package } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:  { label: '승인 대기', color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30' },
  approved: { label: '승인됨',   color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30' },
  rejected: { label: '거절됨',   color: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30' },
  returned: { label: '반납 완료', color: 'bg-surface-raised border-base text-base-secondary' },
}

// 서버가 시간대 표기 없는 벽시계 문자열을 보내므로 로컬로 파싱하면 숫자가 그대로 보존된다
const fmt = (d: string) => format(new Date(d), 'yyyy.MM.dd HH:mm', { locale: ko })

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-surface-raised text-base-secondary border-base' }
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
          <label htmlFor="requestNumber" className="block text-xs font-semibold text-base-secondary uppercase tracking-wider">
            신청 번호
          </label>
          <input
            id="requestNumber"
            name="requestNumber"
            placeholder="REQ-20260520-0001"
            required
            className="w-full h-11 px-3.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary placeholder:text-base-faint focus:outline-none focus:border-brand-rose transition-colors font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-xs font-semibold text-base-secondary uppercase tracking-wider">
            조회용 비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full h-11 px-3.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary focus:outline-none focus:border-brand-rose transition-colors"
          />
        </div>

        {error && (
          <div className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 rounded-xl bg-rose-600 dark:bg-brand-rose hover:bg-rose-700 dark:hover:bg-rose-400 text-white dark:text-zinc-950 text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />조회 중...</> : '조회하기'}
        </button>
      </form>

      {result && (
        <div className="space-y-3 pt-1">
          {/* 공통 정보 */}
          <div className="bg-surface-raised rounded-xl border border-base px-4 py-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-base-muted font-semibold uppercase tracking-wider">
              <CalendarDays className="w-3.5 h-3.5" />
              대여 기간
            </div>
            <p className="text-sm font-medium text-base-primary">
              {fmt(result.data.startAt)} <span className="text-base-faint mx-1">→</span> {fmt(result.data.endAt)}
            </p>
            <p className="text-xs text-base-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              신청일: {fmt(result.data.createdAt)}
            </p>
          </div>

          {/* 묶음 */}
          {result.groupItems && result.groupItems.length > 1 ? (
            <div className="rounded-xl border border-base overflow-hidden">
              <div className="bg-surface-overlay px-4 py-2.5 border-b border-base flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-base-muted" />
                <p className="text-xs font-semibold text-base-secondary">일괄 신청 {result.groupItems.length}종</p>
              </div>
              <div className="divide-y divide-base">
                {result.groupItems.map(item => (
                  <div key={item.requestNumber} className="flex items-center justify-between px-4 py-3.5">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-base-primary">{item.equipmentName} <span className="font-normal text-base-muted">× {item.quantity}개</span></p>
                      {item.adminNote && <p className="text-xs text-base-secondary mt-1">메모: {item.adminNote}</p>}
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 단건 */
            <div className="rounded-xl border border-base px-4 py-3.5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-base-primary">{result.data.equipmentName} <span className="font-normal text-base-muted">× {result.data.quantity}개</span></p>
                  <p className="text-[11px] text-base-muted font-mono">{result.data.requestNumber}</p>
                  {result.data.adminNote && <p className="text-xs text-base-secondary mt-1">메모: {result.data.adminNote}</p>}
                </div>
                <StatusBadge status={result.data.status} />
              </div>
              {result.data.accessories && result.data.accessories.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-base-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    부속 기자재
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.data.accessories.map((acc, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs bg-surface-raised border border-base rounded-lg px-2.5 py-1.5 text-base-primary"
                      >
                        {acc.name} × {acc.quantity}개
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
