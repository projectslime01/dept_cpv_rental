'use client'

import { useState, useTransition } from 'react'
import { createEquipment, updateEquipment, deactivateEquipment, activateEquipment } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Equipment {
  id: number
  name: string
  category: string
  description: string | null
  totalQuantity: number
  status: string
  rentedNow: number
  availableNow: number
}

export function CreateEquipmentButton() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createEquipment(formData)
      setOpen(false)
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ 기자재 추가</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>기자재 추가</DialogTitle></DialogHeader>
          <form action={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>기자재명 *</Label>
              <Input name="name" required />
            </div>
            <div className="space-y-1">
              <Label>카테고리 *</Label>
              <Input name="category" placeholder="카메라, 조명, 음향, 기타" required />
            </div>
            <div className="space-y-1">
              <Label>설명</Label>
              <Textarea name="description" rows={2} />
            </div>
            <div className="space-y-1">
              <Label>총 수량 *</Label>
              <Input name="totalQuantity" type="number" min={1} defaultValue={1} required />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>취소</Button>
              <Button type="submit" disabled={isPending}>추가</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function EquipmentActions({ equipment }: { equipment: Equipment }) {
  const [editOpen, setEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      await updateEquipment(equipment.id, formData)
      setEditOpen(false)
    })
  }

  function handleToggle() {
    startTransition(async () => {
      if (equipment.status === 'active') {
        await deactivateEquipment(equipment.id)
      } else {
        await activateEquipment(equipment.id)
      }
    })
  }

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>수정</Button>
        <Button size="sm" variant={equipment.status === 'active' ? 'secondary' : 'default'} onClick={handleToggle} disabled={isPending}>
          {equipment.status === 'active' ? '비활성화' : '활성화'}
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>기자재 수정</DialogTitle></DialogHeader>
          <form action={handleUpdate} className="space-y-3">
            <div className="space-y-1">
              <Label>기자재명 *</Label>
              <Input name="name" defaultValue={equipment.name} required />
            </div>
            <div className="space-y-1">
              <Label>카테고리 *</Label>
              <Input name="category" defaultValue={equipment.category} required />
            </div>
            <div className="space-y-1">
              <Label>설명</Label>
              <Textarea name="description" defaultValue={equipment.description ?? ''} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>총 수량 *</Label>
              <Input name="totalQuantity" type="number" min={1} defaultValue={equipment.totalQuantity} required />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>취소</Button>
              <Button type="submit" disabled={isPending}>저장</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
