'use client'

import { useState, useTransition } from 'react'
import { approveRequest, rejectRequest, markReturned, approveClassroomRequest, rejectClassroomRequest, markClassroomReturned } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Props {
  id: number
  status: string
  applicantName: string
  equipmentName: string
}

export function ActionButtons({ id, status, applicantName, equipmentName }: Props) {
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)
  const [note, setNote] = useState('')

  function handleApprove() {
    startTransition(async () => {
      await approveRequest(id, note)
      setModal(null)
    })
  }

  function handleReject() {
    startTransition(async () => {
      await rejectRequest(id, note)
      setModal(null)
    })
  }

  function handleReturn() {
    startTransition(async () => {
      await markReturned(id)
    })
  }

  if (status === 'pending') {
    return (
      <>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setModal('approve')} className="bg-brand-rose hover:bg-brand-rose/90 text-white border-none">승인</Button>
          <Button size="sm" variant="destructive" onClick={() => setModal('reject')}>거절</Button>
        </div>

        <Dialog open={modal === 'approve'} onOpenChange={() => setModal(null)}>
          <DialogContent className="bg-surface-base border-base text-base-primary rounded-2xl max-w-md">
            <DialogHeader><DialogTitle className="text-base-primary font-bold text-lg">기자재 대여 승인</DialogTitle></DialogHeader>
            <p className="text-sm text-base-secondary">{applicantName} — {equipmentName}</p>
            <div className="space-y-1 mt-2">
              <Label className="text-base-secondary text-xs font-semibold">메모 (선택)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="bg-surface-raised border-strong text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose" />
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setModal(null)} className="border-strong hover:bg-surface-overlay text-base-secondary hover:text-base-primary">취소</Button>
              <Button onClick={handleApprove} disabled={isPending} className="bg-brand-rose hover:bg-brand-rose/90 text-white">승인 확정</Button>
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
}

export function ClassroomActionButtons({ id, status, applicantName, classroomNumber }: ClassroomProps) {
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)
  const [note, setNote] = useState('')

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

        <Dialog open={modal === 'approve'} onOpenChange={() => setModal(null)}>
          <DialogContent className="bg-surface-base border-base text-base-primary rounded-2xl max-w-md">
            <DialogHeader><DialogTitle className="text-base-primary font-bold text-lg">강의실 대여 승인</DialogTitle></DialogHeader>
            <p className="text-sm text-base-secondary">{applicantName} — {classroomNumber}</p>
            <div className="space-y-1 mt-2">
              <Label className="text-base-secondary text-xs font-semibold">메모 (선택)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo" />
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setModal(null)} className="border-strong hover:bg-surface-overlay text-base-secondary hover:text-base-primary">취소</Button>
              <Button onClick={handleApprove} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">승인 확정</Button>
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
