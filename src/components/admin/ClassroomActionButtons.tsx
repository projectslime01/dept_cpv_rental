'use client'

import { useState, useTransition } from 'react'
import { approveClassroomRequest, rejectClassroomRequest } from '@/app/actions/classroom'

interface Props {
  id: number
  status: string
  applicantName: string
}

export function ClassroomActionButtons({ id, status, applicantName }: Props) {
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)
  const [note, setNote] = useState('')

  const inputCls = 'w-full h-10 px-3.5 rounded-xl border border-[#3a3640] text-sm bg-[#1a191b] text-[#e5e2e1] focus:outline-none focus:border-[#7d7173] transition-colors resize-none'

  function handleApprove() {
    startTransition(async () => {
      await approveClassroomRequest(id, note)
      setModal(null)
    })
  }

  function handleReject() {
    startTransition(async () => {
      await rejectClassroomRequest(id, note)
      setModal(null)
    })
  }

  if (status !== 'pending') return null

  return (
    <>
      <div className="flex gap-1.5">
        <button
          onClick={() => { setNote(''); setModal('approve') }}
          className="h-7 px-2.5 rounded-lg bg-emerald-950/50 text-emerald-400 border border-emerald-900/50 text-xs font-semibold hover:bg-emerald-900/50 transition-colors"
        >
          승인
        </button>
        <button
          onClick={() => { setNote(''); setModal('reject') }}
          className="h-7 px-2.5 rounded-lg bg-red-950/50 text-red-400 border border-red-900/50 text-xs font-semibold hover:bg-red-900/50 transition-colors"
        >
          거절
        </button>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => !isPending && setModal(null)} />
          <div className="relative bg-[#201f21] rounded-2xl border border-[#2e2b2f] w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#e5e2e1]">
              {modal === 'approve' ? '승인' : '거절'} — {applicantName}
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9b8f91]">
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
                className="flex-1 h-10 rounded-xl border border-[#3a3640] text-sm font-semibold text-[#9b8f91] hover:bg-[#252228] transition-colors disabled:opacity-40">
                취소
              </button>
              <button
                type="button"
                disabled={isPending || (modal === 'reject' && !note.trim())}
                onClick={modal === 'approve' ? handleApprove : handleReject}
                className={`flex-1 h-10 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-40 ${
                  modal === 'approve'
                    ? 'bg-emerald-700 hover:bg-emerald-600'
                    : 'bg-red-700 hover:bg-red-600'
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
