'use client'

import { useState, useTransition } from 'react'
import { approveRequestGroup, rejectRequestGroup, markReturnedGroup, approveClassroomRequest, rejectClassroomRequest, markClassroomReturned } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { GroupStockResult, StockLine } from '@/lib/approvalCheck'

interface Props {
  /** 묶음(신청)에 포함된 모든 RentalRequest id */
  ids: number[]
  status: string
  applicantName: string
  /** 품목 요약 텍스트 — "소니 FX3 1대, 소니 24-105 1개 …" */
  equipmentName: string
  /** 승인 대기 건의 재고 확인 결과 (서버에서 계산) */
  stock?: GroupStockResult
}

function BlockNotice({ message }: { message: string }) {
  return (
    <div className="mt-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-xs leading-relaxed text-red-700 dark:text-red-400">
      {message}
    </div>
  )
}

function StockTable({ lines }: { lines: StockLine[] }) {
  return (
    <div className="mt-3 rounded-xl border border-base overflow-hidden">
      <div className="px-3 py-2 bg-surface-raised border-b border-base text-xs font-semibold text-base-secondary">
        재고 확인 (대여 기간 중 승인된 대여 기준)
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-base-muted">
            <th className="text-left font-semibold px-3 py-1.5">품목</th>
            <th className="text-right font-semibold px-2 py-1.5">요청</th>
            <th className="text-right font-semibold px-2 py-1.5">가용/총</th>
            <th className="text-right font-semibold px-3 py-1.5">결과</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base">
          {lines.map((l) => (
            <tr key={l.key + l.label} className={l.shortage > 0 ? 'text-red-600 dark:text-red-400' : 'text-base-primary'}>
              <td className="px-3 py-1.5 break-keep">{l.kind === 'accessory' ? `└ ${l.label}` : l.label}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{l.requested}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{l.available}/{l.total}</td>
              <td className="px-3 py-1.5 text-right font-semibold whitespace-nowrap">
                {l.shortage > 0 ? `${l.shortage}개 부족` : '충분'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ActionButtons({ ids, status, applicantName, equipmentName, stock }: Props) {
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)
  const [note, setNote] = useState('')
  // 서버가 승인을 거절했을 때의 최신 사유·재고 (화면 값보다 우선)
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverLines, setServerLines] = useState<StockLine[] | null>(null)

  const lines = serverLines ?? stock?.lines ?? null
  const blocked = lines ? lines.some((l) => l.shortage > 0) : false

  function closeModal() {
    setModal(null)
    setServerError(null)
    setServerLines(null)
  }

  function handleApprove() {
    startTransition(async () => {
      const res = await approveRequestGroup(ids, note)
      if (res.ok) {
        closeModal()
      } else {
        setServerError(res.error)
        if (res.lines) setServerLines(res.lines)
      }
    })
  }

  function handleReject() {
    startTransition(async () => {
      await rejectRequestGroup(ids, note)
      setModal(null)
    })
  }

  function handleReturn() {
    startTransition(async () => {
      await markReturnedGroup(ids)
    })
  }

  if (status === 'pending') {
    return (
      <>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setModal('approve')} className="bg-brand-rose hover:bg-brand-rose/90 text-white border-none">승인</Button>
          <Button size="sm" variant="destructive" onClick={() => setModal('reject')}>거절</Button>
        </div>

        <Dialog open={modal === 'approve'} onOpenChange={closeModal}>
          <DialogContent className="bg-surface-base border-base text-base-primary rounded-2xl max-w-md">
            <DialogHeader><DialogTitle className="text-base-primary font-bold text-lg">기자재 대여 승인</DialogTitle></DialogHeader>
            <p className="text-sm text-base-secondary">{applicantName} — {equipmentName}</p>
            {lines && lines.length > 0 && <StockTable lines={lines} />}
            {serverError ? (
              <BlockNotice message={serverError} />
            ) : blocked ? (
              <BlockNotice message="재고가 부족한 품목이 있어 승인할 수 없습니다. 거절하거나, 꼭 필요하면 수동 등록으로 처리하세요." />
            ) : null}
            <div className="space-y-1 mt-2">
              <Label className="text-base-secondary text-xs font-semibold">메모 (선택)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="bg-surface-raised border-strong text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose" />
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={closeModal} className="border-strong hover:bg-surface-overlay text-base-secondary hover:text-base-primary">취소</Button>
              <Button onClick={handleApprove} disabled={isPending || blocked} className="bg-brand-rose hover:bg-brand-rose/90 text-white">승인 확정</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={modal === 'reject'} onOpenChange={() => setModal(null)}>
          <DialogContent className="bg-surface-base border-base text-base-primary rounded-2xl max-w-md">
            <DialogHeader><DialogTitle className="text-base-primary font-bold text-lg">기자재 대여 거절</DialogTitle></DialogHeader>
            <p className="text-sm text-base-secondary">{applicantName} — {equipmentName}</p>
            <div className="space-y-1 mt-2">
              <Label className="text-base-secondary text-xs font-semibold">거절 사유 *</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} required className="bg-surface-raised border-strong text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose" />
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setModal(null)} className="border-strong hover:bg-surface-overlay text-base-secondary hover:text-base-primary">취소</Button>
              <Button variant="destructive" onClick={handleReject} disabled={isPending || !note.trim()}>
                거절 확정
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  if (status === 'approved') {
    return (
      <Button size="sm" variant="outline" onClick={handleReturn} disabled={isPending} className="border-strong hover:bg-surface-overlay text-base-secondary hover:text-base-primary">
        반납 완료
      </Button>
    )
  }

  return null
}

interface ClassroomProps {
  id: number
  status: string
  applicantName: string
  classroomNumber: string
  /** 승인 대기 건의 충돌 목록 (서버에서 계산, 비어 있으면 승인 가능) */
  conflicts?: string[]
}

export function ClassroomActionButtons({ id, status, applicantName, classroomNumber, conflicts }: ClassroomProps) {
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)
  const [note, setNote] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverConflicts, setServerConflicts] = useState<string[] | null>(null)

  const shownConflicts = serverConflicts ?? conflicts ?? []
  const blocked = shownConflicts.length > 0

  function closeModal() {
    setModal(null)
    setServerError(null)
    setServerConflicts(null)
  }

  function handleApprove() {
    startTransition(async () => {
      const res = await approveClassroomRequest(id, note)
      if (res.ok) {
        closeModal()
      } else {
        setServerError(res.error)
        if (res.conflicts) setServerConflicts(res.conflicts)
      }
    })
  }

  function handleReject() {
    startTransition(async () => {
      await rejectClassroomRequest(id, note)
      setModal(null)
    })
  }

  function handleReturn() {
    startTransition(async () => {
      await markClassroomReturned(id)
    })
  }

  if (status === 'pending') {
    return (
      <>
        <div className="flex gap-2 justify-center">
          <Button size="sm" onClick={() => setModal('approve')} className="bg-indigo-600 hover:bg-indigo-700 text-white border-none">승인</Button>
          <Button size="sm" variant="destructive" onClick={() => setModal('reject')}>거절</Button>
        </div>

        <Dialog open={modal === 'approve'} onOpenChange={closeModal}>
          <DialogContent className="bg-surface-base border-base text-base-primary rounded-2xl max-w-md">
            <DialogHeader><DialogTitle className="text-base-primary font-bold text-lg">강의실 대여 승인</DialogTitle></DialogHeader>
            <p className="text-sm text-base-secondary">{applicantName} — {classroomNumber}</p>
            {blocked ? (
              <div className="mt-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-xs leading-relaxed text-red-700 dark:text-red-400 space-y-1">
                <p className="font-semibold">
                  {serverError ?? '이미 승인된 예약 또는 정규 수업과 겹쳐 승인할 수 없습니다. 거절하거나, 꼭 필요하면 수동 등록으로 처리하세요.'}
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {shownConflicts.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </div>
            ) : serverError ? (
              <BlockNotice message={serverError} />
            ) : conflicts ? (
              <div className="mt-3 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                같은 시간대 승인 예약·정규 수업과 겹치지 않습니다.
              </div>
            ) : null}
            <div className="space-y-1 mt-2">
              <Label className="text-base-secondary text-xs font-semibold">메모 (선택)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo" />
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={closeModal} className="border-strong hover:bg-surface-overlay text-base-secondary hover:text-base-primary">취소</Button>
              <Button onClick={handleApprove} disabled={isPending || blocked} className="bg-indigo-600 hover:bg-indigo-700 text-white">승인 확정</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={modal === 'reject'} onOpenChange={() => setModal(null)}>
          <DialogContent className="bg-surface-base border-base text-base-primary rounded-2xl max-w-md">
            <DialogHeader><DialogTitle className="text-base-primary font-bold text-lg">강의실 대여 거절</DialogTitle></DialogHeader>
            <p className="text-sm text-base-secondary">{applicantName} — {classroomNumber}</p>
            <div className="space-y-1 mt-2">
              <Label className="text-base-secondary text-xs font-semibold">거절 사유 *</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} required className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo" />
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setModal(null)} className="border-strong hover:bg-surface-overlay text-base-secondary hover:text-base-primary">취소</Button>
              <Button variant="destructive" onClick={handleReject} disabled={isPending || !note.trim()}>
                거절 확정
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  if (status === 'approved') {
    return (
      <Button size="sm" variant="outline" onClick={handleReturn} disabled={isPending} className="border-strong hover:bg-surface-overlay text-base-secondary hover:text-base-primary">
        반납 완료
      </Button>
    )
  }

  return null
}
