'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  createRestriction,
  releaseRestriction,
  deleteRestriction,
} from '@/app/actions/restrictions'
import { RESTRICTION_REASONS, defaultRestrictionDays } from '@/lib/restriction'
import { Ban, Plus, Trash2, Unlock, X, CheckCircle2, ShieldAlert, History } from 'lucide-react'

export type RestrictionRow = {
  id: number
  studentId: string
  studentName: string | null
  reason: string
  detail: string | null
  startAt: string
  endAt: string
  releasedAt: string | null
  createdAt: string
}

interface Props {
  restrictions: RestrictionRow[]
}

const inputCls =
  'w-full h-10 px-3.5 rounded-xl border border-strong text-sm bg-surface-raised text-base-primary placeholder:text-base-faint focus:outline-none focus:border-brand-rose transition-colors'

function isActive(r: RestrictionRow, now: number): boolean {
  return r.releasedAt === null && new Date(r.endAt).getTime() > now
}

function reasonBadgeCls(reason: string): string {
  switch (reason) {
    case '노쇼':
      return 'text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50'
    case '손망실':
      return 'text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/50'
    case '연체':
      return 'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50'
    default:
      return 'text-base-secondary bg-surface-overlay border-base'
  }
}

export function RestrictionManager({ restrictions }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'create' | 'release' | 'delete' | null>(null)
  const [target, setTarget] = useState<RestrictionRow | null>(null)
  const [reason, setReason] = useState<string>(RESTRICTION_REASONS[0].value)
  const [days, setDays] = useState<number>(RESTRICTION_REASONS[0].defaultDays)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const now = Date.now()
  const active = restrictions.filter((r) => isActive(r, now))
  const inactive = restrictions.filter((r) => !isActive(r, now))

  function closeModal() {
    if (isPending) return
    setModal(null)
    setTarget(null)
    setError(null)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function openCreate() {
    setReason(RESTRICTION_REASONS[0].value)
    setDays(RESTRICTION_REASONS[0].defaultDays)
    setError(null)
    setModal('create')
  }

  function onReasonChange(value: string) {
    setReason(value)
    setDays(defaultRestrictionDays(value))
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('reason', reason)
    fd.set('days', String(days))
    startTransition(async () => {
      const res = await createRestriction(fd)
      if (res.success) {
        closeModal()
        showToast('대여 제한자가 등록됐습니다.')
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  function handleRelease() {
    if (!target) return
    startTransition(async () => {
      const res = await releaseRestriction(target.id)
      if (res.success) {
        closeModal()
        showToast('제한이 해제됐습니다.')
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  function handleDelete() {
    if (!target) return
    startTransition(async () => {
      const res = await deleteRestriction(target.id)
      if (res.success) {
        closeModal()
        showToast('기록이 삭제됐습니다.')
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  const fmt = (d: string) => format(new Date(d), 'yyyy.MM.dd', { locale: ko })

  return (
    <>
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold px-4 py-3 rounded-xl shadow-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {toast}
        </div>
      )}

      {/* 활성 제한 목록 */}
      <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-base">
          <ShieldAlert className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-semibold text-base-primary">현재 대여 제한 중</h2>
          <span className="ml-auto text-xs text-base-muted">{active.length}명</span>
          <button
            onClick={openCreate}
            className="ml-3 flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-brand-rose hover:bg-brand-rose/90 text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            제한 등록
          </button>
        </div>

        {active.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-base-muted">현재 대여가 제한된 학번이 없습니다.</p>
        ) : (
          <div className="divide-y divide-base">
            {active.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-red-50 dark:bg-red-950/40">
                  <Ban className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-base-primary">{r.studentId}</span>
                    {r.studentName && <span className="text-xs text-base-muted">{r.studentName}</span>}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${reasonBadgeCls(r.reason)}`}>
                      {r.reason}
                    </span>
                  </div>
                  <p className="text-xs text-base-muted mt-0.5">
                    {fmt(r.startAt)} ~ {fmt(r.endAt)} 까지 제한
                    {r.detail && <span className="text-base-faint"> · {r.detail}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setTarget(r); setError(null); setModal('release') }}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-strong text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    해제
                  </button>
                  <button
                    onClick={() => { setTarget(r); setError(null); setModal('delete') }}
                    className="flex items-center justify-center h-8 w-8 rounded-xl border border-strong text-base-muted hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    aria-label="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 만료/해제 이력 */}
      {inactive.length > 0 && (
        <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-base">
            <History className="w-4 h-4 text-base-muted" />
            <h2 className="text-sm font-semibold text-base-primary">해제·만료 이력</h2>
            <span className="ml-auto text-xs text-base-muted">{inactive.length}건</span>
          </div>
          <div className="divide-y divide-base">
            {inactive.map((r) => {
              const released = r.releasedAt !== null
              return (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3 opacity-70">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-base-primary">{r.studentId}</span>
                      {r.studentName && <span className="text-xs text-base-muted">{r.studentName}</span>}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${reasonBadgeCls(r.reason)}`}>
                        {r.reason}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-base text-base-muted bg-surface-overlay">
                        {released ? '수동 해제' : '기간 만료'}
                      </span>
                    </div>
                    <p className="text-xs text-base-muted mt-0.5">
                      {fmt(r.startAt)} ~ {fmt(r.endAt)}
                      {released && r.releasedAt && ` · ${fmt(r.releasedAt)} 해제`}
                    </p>
                  </div>
                  <button
                    onClick={() => { setTarget(r); setError(null); setModal('delete') }}
                    className="flex items-center justify-center h-8 w-8 rounded-xl border border-strong text-base-muted hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0"
                    aria-label="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 모달 ──────────────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeModal} />

          {modal === 'create' && (
            <div className="relative bg-surface-base rounded-2xl border border-base w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-base">
                <h3 className="text-base font-bold text-base-primary">대여 제한자 등록</h3>
                <button onClick={closeModal} className="text-base-muted hover:text-base-primary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-base-secondary">학번 *</label>
                  <input name="studentId" required autoComplete="off" placeholder="예: 20231234" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-base-secondary">이름 <span className="text-base-faint">(선택)</span></label>
                  <input name="studentName" autoComplete="off" placeholder="식별용 이름" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-base-secondary">제한 사유 *</label>
                    <select
                      value={reason}
                      onChange={(e) => onReasonChange(e.target.value)}
                      className={inputCls}
                    >
                      {RESTRICTION_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-base-secondary">제한 기간(일) *</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={days}
                      onChange={(e) => setDays(parseInt(e.target.value) || 0)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-base-secondary">상세 메모 <span className="text-base-faint">(선택)</span></label>
                  <textarea
                    name="detail"
                    rows={2}
                    placeholder="예: 6/3 FX3 노쇼"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-strong text-sm bg-surface-raised text-base-primary placeholder:text-base-faint focus:outline-none focus:border-brand-rose transition-colors resize-none"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-2.5">{error}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={closeModal} disabled={isPending}
                    className="flex-1 h-10 rounded-xl border border-strong text-sm font-semibold text-base-secondary hover:bg-surface-overlay hover:text-base-primary transition-colors disabled:opacity-40">
                    취소
                  </button>
                  <button type="submit" disabled={isPending}
                    className="flex-1 h-10 rounded-xl bg-brand-rose hover:bg-brand-rose/90 text-white text-sm font-bold transition-colors disabled:opacity-40">
                    {isPending ? '등록 중...' : '제한 등록'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {modal === 'release' && target && (
            <div className="relative bg-surface-base rounded-2xl border border-base w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-base">
                <h3 className="text-base font-bold text-base-primary">제한 해제</h3>
                <button onClick={closeModal} className="text-base-muted hover:text-base-primary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-base-secondary">
                  <span className="font-bold text-base-primary">{target.studentId}</span>
                  {target.studentName && ` (${target.studentName})`} 학번의 대여 제한을 즉시 해제합니다.
                  <br />해제 후 바로 대여 신청이 가능해집니다.
                </p>
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-2.5">{error}</p>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={closeModal} disabled={isPending}
                    className="flex-1 h-10 rounded-xl border border-strong text-sm font-semibold text-base-secondary hover:bg-surface-overlay hover:text-base-primary transition-colors disabled:opacity-40">
                    취소
                  </button>
                  <button type="button" onClick={handleRelease} disabled={isPending}
                    className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-40">
                    {isPending ? '해제 중...' : '해제 확인'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {modal === 'delete' && target && (
            <div className="relative bg-surface-base rounded-2xl border border-base w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-base">
                <h3 className="text-base font-bold text-base-primary">기록 삭제</h3>
                <button onClick={closeModal} className="text-base-muted hover:text-base-primary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-base-secondary">
                  <span className="font-bold text-base-primary">{target.studentId}</span> 제한 기록을 영구 삭제합니다.
                  <br />이 작업은 되돌릴 수 없습니다.
                </p>
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-2.5">{error}</p>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={closeModal} disabled={isPending}
                    className="flex-1 h-10 rounded-xl border border-strong text-sm font-semibold text-base-secondary hover:bg-surface-overlay hover:text-base-primary transition-colors disabled:opacity-40">
                    취소
                  </button>
                  <button type="button" onClick={handleDelete} disabled={isPending}
                    className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-40">
                    {isPending ? '삭제 중...' : '삭제 확인'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
