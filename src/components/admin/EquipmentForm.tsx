'use client'

import { useState, useTransition } from 'react'
import { createEquipment, updateEquipment, deactivateEquipment, activateEquipment, deleteEquipment } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Trash2 } from 'lucide-react'

interface Equipment {
  id: number
  name: string
  category: string
  description: string | null
  totalQuantity: number
  minRentalQuantity: number
  maxRentalQuantity: number | null
  minGrade: number
  status: string
  rentedNow: number
  availableNow: number
}

const GRADE_SELECT_CLS =
  'w-full h-10 px-3.5 rounded-xl border border-strong bg-surface-raised text-sm text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose focus:outline-none'

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
      <Button
        onClick={() => setOpen(true)}
        className="bg-rose-600 hover:bg-rose-500 dark:bg-brand-rose dark:hover:bg-rose-400 text-white font-semibold rounded-xl h-10 px-4 transition-colors"
      >
        + 기자재 추가
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-surface-base border-base text-base-primary max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base-primary font-bold text-lg">기자재 추가</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">기자재명 *</Label>
              <Input
                name="name"
                required
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">카테고리 *</Label>
              <Input
                name="category"
                placeholder="예: 카메라, 조명, 음향, 기타"
                required
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">설명</Label>
              <Textarea
                name="description"
                placeholder="기자재 스펙이나 관리 유의사항을 입력해주세요."
                rows={2}
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose rounded-xl resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">총 수량 *</Label>
              <Input
                name="totalQuantity"
                type="number"
                min={1}
                defaultValue={1}
                required
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-base-secondary text-xs font-semibold">최소 대여 수량</Label>
                <Input
                  name="minRentalQuantity"
                  type="number"
                  min={1}
                  defaultValue={1}
                  className="bg-surface-raised border-strong text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-base-secondary text-xs font-semibold">최대 대여 수량</Label>
                <Input
                  name="maxRentalQuantity"
                  type="number"
                  min={1}
                  placeholder="제한 없음"
                  className="bg-surface-raised border-strong text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose rounded-xl"
                />
              </div>
            </div>
            <p className="text-[11px] text-base-muted -mt-2">최대 대여 수량을 비워두면 재고 내에서 자유롭게 신청 가능합니다.</p>
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">대여 가능 학년 *</Label>
              <select name="minGrade" defaultValue={1} className={GRADE_SELECT_CLS}>
                <option value={1}>1학년 이상 (전체)</option>
                <option value={2}>2학년 이상</option>
                <option value={3}>3학년 이상</option>
              </select>
              <p className="text-[11px] text-base-muted">선택한 학년 이상만 이 기자재를 대여할 수 있습니다.</p>
            </div>
            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpen(false)}
                className="border-strong text-base-secondary hover:bg-surface-overlay hover:text-base-primary rounded-xl"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-rose-600 hover:bg-rose-500 dark:bg-brand-rose dark:hover:bg-rose-400 text-white rounded-xl"
              >
                {isPending ? '추가 중...' : '추가'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function EquipmentActions({ equipment }: { equipment: Equipment }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
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

  function handleDelete() {
    startTransition(async () => {
      await deleteEquipment(equipment.id)
      setDeleteOpen(false)
    })
  }

  return (
    <>
      <div className="flex gap-1.5 justify-center">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditOpen(true)}
          className="border-strong text-base-secondary hover:bg-surface-overlay hover:text-base-primary rounded-lg h-8 text-xs font-semibold px-2.5"
        >
          수정
        </Button>
        <Button
          size="sm"
          variant={equipment.status === 'active' ? 'secondary' : 'default'}
          onClick={handleToggle}
          disabled={isPending}
          className={`rounded-lg h-8 text-xs font-semibold px-2.5 ${
            equipment.status === 'active'
              ? 'bg-surface-raised border border-strong hover:bg-surface-overlay text-base-secondary'
              : 'bg-rose-600 hover:bg-rose-500 dark:bg-brand-rose dark:hover:bg-rose-400 text-white'
          }`}
        >
          {equipment.status === 'active' ? '비활성화' : '활성화'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDeleteOpen(true)}
          disabled={isPending}
          className="border-strong text-red-600 hover:bg-red-500/10 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 rounded-lg h-8 text-xs font-semibold px-2.5"
        >
          삭제
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-surface-base border-base text-base-primary max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base-primary font-bold text-lg flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              기자재 삭제
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-base-secondary leading-relaxed">
            정말로 <span className="font-bold text-base-primary">{equipment.name} 기자재</span>를 삭제하시겠습니까?
            <br />
            <span className="text-xs text-red-500 font-semibold mt-2 block">
              ⚠️ 해당 기자재의 대여 신청 내역도 함께 완전히 삭제되며 이 작업은 되돌릴 수 없습니다.
            </span>
          </div>
          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              variant="outline"
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="border-strong text-base-secondary hover:bg-surface-overlay hover:text-base-primary rounded-xl"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-500 text-white rounded-xl"
            >
              {isPending ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-surface-base border-base text-base-primary max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base-primary font-bold text-lg font-mono">기자재 수정 ({equipment.name})</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">기자재명 *</Label>
              <Input
                name="name"
                defaultValue={equipment.name}
                required
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">카테고리 *</Label>
              <Input
                name="category"
                defaultValue={equipment.category}
                required
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">설명</Label>
              <Textarea
                name="description"
                defaultValue={equipment.description ?? ''}
                placeholder="기자재 스펙이나 관리 유의사항을 입력해주세요."
                rows={2}
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose rounded-xl resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">총 수량 *</Label>
              <Input
                name="totalQuantity"
                type="number"
                min={1}
                defaultValue={equipment.totalQuantity}
                required
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-base-secondary text-xs font-semibold">최소 대여 수량</Label>
                <Input
                  name="minRentalQuantity"
                  type="number"
                  min={1}
                  defaultValue={equipment.minRentalQuantity}
                  className="bg-surface-raised border-strong text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-base-secondary text-xs font-semibold">최대 대여 수량</Label>
                <Input
                  name="maxRentalQuantity"
                  type="number"
                  min={1}
                  defaultValue={equipment.maxRentalQuantity ?? ''}
                  placeholder="제한 없음"
                  className="bg-surface-raised border-strong text-base-primary focus:border-brand-rose focus:ring-1 focus:ring-brand-rose rounded-xl"
                />
              </div>
            </div>
            <p className="text-[11px] text-base-muted -mt-2">최대 대여 수량을 비워두면 재고 내에서 자유롭게 신청 가능합니다.</p>
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">대여 가능 학년 *</Label>
              <select name="minGrade" defaultValue={equipment.minGrade} className={GRADE_SELECT_CLS}>
                <option value={1}>1학년 이상 (전체)</option>
                <option value={2}>2학년 이상</option>
                <option value={3}>3학년 이상</option>
              </select>
              <p className="text-[11px] text-base-muted">선택한 학년 이상만 이 기자재를 대여할 수 있습니다.</p>
            </div>
            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditOpen(false)}
                className="border-strong text-base-secondary hover:bg-surface-overlay hover:text-base-primary rounded-xl"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-rose-600 hover:bg-rose-500 dark:bg-brand-rose dark:hover:bg-rose-400 text-white rounded-xl"
              >
                {isPending ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
