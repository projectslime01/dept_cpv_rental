'use client'

import { useState, useTransition } from 'react'
import { approveRequest, rejectRequest, markReturned } from '@/app/actions/admin'
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
          <Button size="sm" onClick={() => setModal('approve')}>승인</Button>
          <Button size="sm" variant="destructive" onClick={() => setModal('reject')}>거절</Button>
        </div>

        <Dialog open={modal === 'approve'} onOpenChange={() => setModal(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>승인</DialogTitle></DialogHeader>
            <p className="text-sm">{applicantName} — {equipmentName}</p>
            <div className="space-y-1">
              <Label>메모 (선택)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>취소</Button>
              <Button onClick={handleApprove} disabled={isPending}>승인 확정</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={modal === 'reject'} onOpenChange={() => setModal(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>거절</DialogTitle></DialogHeader>
            <p className="text-sm">{applicantName} — {equipmentName}</p>
            <div className="space-y-1">
              <Label>거절 사유 *</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} required />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>취소</Button>
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
      <Button size="sm" variant="outline" onClick={handleReturn} disabled={isPending}>
        반납 완료
      </Button>
    )
  }

  return null
}
