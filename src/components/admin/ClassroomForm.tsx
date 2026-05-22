'use client'

import { useState, useTransition } from 'react'
import { createClassroom, updateClassroom, deactivateClassroom, activateClassroom } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Classroom {
  id: number
  roomNumber: string
  capacity: number
  description: string | null
  equipment: string | null
  status: string
}

export function CreateClassroomButton() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createClassroom(formData)
      setOpen(false)
    })
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl h-10 px-4 transition-colors"
      >
        + 강의실 추가
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-surface-base border-base text-base-primary max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base-primary font-bold text-lg">강의실 추가</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">강의실 번호 *</Label>
              <Input
                name="roomNumber"
                placeholder="예: C-501, 본관 302호"
                required
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">수용 인원 *</Label>
              <Input
                name="capacity"
                type="number"
                min={1}
                defaultValue={30}
                required
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">기본 제공 시설 및 기자재</Label>
              <Input
                name="equipment"
                placeholder="예: 빔프로젝터, 화이트보드, 전자교탁 (쉼표로 구분)"
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">설명</Label>
              <Textarea
                name="description"
                placeholder="강의실 위치나 상세 정보를 입력해주세요."
                rows={2}
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl resize-none"
              />
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
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
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

export function ClassroomActions({ classroom }: { classroom: Classroom }) {
  const [editOpen, setEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      await updateClassroom(classroom.id, formData)
      setEditOpen(false)
    })
  }

  function handleToggle() {
    startTransition(async () => {
      if (classroom.status === 'active') {
        await deactivateClassroom(classroom.id)
      } else {
        await activateClassroom(classroom.id)
      }
    })
  }

  return (
    <>
      <div className="flex gap-2 justify-center">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditOpen(true)}
          className="border-strong text-base-secondary hover:bg-surface-overlay hover:text-base-primary rounded-lg h-8 text-xs font-semibold"
        >
          수정
        </Button>
        <Button
          size="sm"
          variant={classroom.status === 'active' ? 'secondary' : 'default'}
          onClick={handleToggle}
          disabled={isPending}
          className={`rounded-lg h-8 text-xs font-semibold ${
            classroom.status === 'active'
              ? 'bg-surface-raised border border-strong hover:bg-surface-overlay text-base-secondary'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {classroom.status === 'active' ? '비활성화' : '활성화'}
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-surface-base border-base text-base-primary max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base-primary font-bold text-lg font-mono">강의실 수정 ({classroom.roomNumber})</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">강의실 번호 *</Label>
              <Input
                name="roomNumber"
                defaultValue={classroom.roomNumber}
                required
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">수용 인원 *</Label>
              <Input
                name="capacity"
                type="number"
                min={1}
                defaultValue={classroom.capacity}
                required
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">기본 제공 시설 및 기자재</Label>
              <Input
                name="equipment"
                defaultValue={classroom.equipment ?? ''}
                placeholder="예: 빔프로젝터, 화이트보드, 전자교탁 (쉼표로 구분)"
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">설명</Label>
              <Textarea
                name="description"
                defaultValue={classroom.description ?? ''}
                placeholder="강의실 위치나 상세 정보를 입력해주세요."
                rows={2}
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl resize-none"
              />
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
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
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
