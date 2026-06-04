'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveClassroomRequest, rejectClassroomRequest } from '@/app/actions/admin'

interface Props {
  id: number
  status: string
  applicantName: string
}

const inputCls = 'w-full h-10 px-3.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary focus:outline-none focus:border-brand-rose transition-colors resize-none'

export function ClassroomRentalActionButtons({ id, status, applicantName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)
  const [note, setNote] = useState('')

  function handleApprove() {
    startTransition(async () => {
      await approveClassroomRequest(id, note)
      setModal(null)
      router.refresh()
    })
  }

  function handleReject() {
    startTransition(async () => {
      await rejectClassroomRequest(id, note)
      setModal(null)
      router.refresh()
    })
  }

  if (status !== 'pending') return null

  return (
    <>
      <div className="flex gap-1.5">
        <button
          onClick={() => { setNote(''); setModal('approve') }}
          className="h-7 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
        >
          승인
        </button>
        <button
          onClick={() => { setNote(''); setModal('reject') }}
          className="h-7 px-2.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/30 text-xs font-semibold hover:bg-red-500/20 transition-colors"
        >
          거절
        </button>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => !isPending && setModal(null)} />
          <div className="relative bg-surface-base rounded-2xl border border-base w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-base-primary">
              {modal === 'approve' ? '승인' : '거절'} — {applicantName}
            </h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-base-secondary">
                메모 {modal === 'reject' && '*'}
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder={modal === 'reject' ? '거절 사유를 입력하세요.' : '(선택)'}
                className={inputCls}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setModal(null)} disabled={isPending}
                className="flex-1 h-10 rounded-xl border border-base text-sm font-semibold text-base-secondary hover:bg-surface-raised transition-colors disabled:opacity-40">
                취소
              </button>
              <button
                type="button"
                disabled={isPending || (modal === 'reject' && !note.trim())}
                onClick={modal === 'approve' ? handleApprove : handleReject}
                className={`flex-1 h-10 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-40 ${
                  modal === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {isPending ? '처리 중...' : modal === 'approve' ? '승인 확정' : '거절 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
