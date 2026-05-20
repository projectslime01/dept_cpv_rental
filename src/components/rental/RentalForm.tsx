'use client'

import { useTransition, useState } from 'react'
import { createRentalRequest } from '@/app/actions/rental'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  equipmentId: number
  equipmentName: string
  defaultStartAt?: string
  defaultEndAt?: string
  maxQuantity: number
}

export function RentalForm({ equipmentId, equipmentName, defaultStartAt, defaultEndAt, maxQuantity }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    formData.set('equipmentId', String(equipmentId))
    setError(null)
    startTransition(async () => {
      const result = await createRentalRequest(formData)
      if (result.success) {
        setRequestNumber(result.requestNumber)
      } else {
        setError(result.error)
      }
    })
  }

  if (requestNumber) {
    return (
      <div className="border rounded-lg p-6 bg-green-50 text-center space-y-3">
        <div className="text-green-600 text-4xl">✓</div>
        <h2 className="text-xl font-bold">신청이 완료되었습니다</h2>
        <div className="bg-white border rounded p-3">
          <p className="text-sm text-muted-foreground">신청 번호</p>
          <p className="text-2xl font-mono font-bold text-primary">{requestNumber}</p>
        </div>
        <p className="text-sm text-red-600 font-medium">⚠️ 이 번호를 반드시 메모하세요. 조회 시 필요합니다.</p>
        <div className="flex gap-2 justify-center mt-4">
          <Button variant="outline" asChild><a href="/">목록으로</a></Button>
          <Button asChild><a href="/status">신청 조회</a></Button>
        </div>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="bg-slate-50 rounded p-3 text-sm">
        <span className="font-medium">신청 기자재:</span> {equipmentName}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="applicantName">이름 *</Label>
          <Input id="applicantName" name="applicantName" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="studentId">학번 *</Label>
          <Input id="studentId" name="studentId" required />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="phone">연락처 *</Label>
        <Input id="phone" name="phone" type="tel" placeholder="010-0000-0000" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="startAt">대여 시작 *</Label>
          <Input id="startAt" name="startAt" type="datetime-local" defaultValue={defaultStartAt} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="endAt">반납 예정 *</Label>
          <Input id="endAt" name="endAt" type="datetime-local" defaultValue={defaultEndAt} required />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="quantity">수량 * (최대 {maxQuantity}개)</Label>
        <Input id="quantity" name="quantity" type="number" min={1} max={maxQuantity} defaultValue={1} required />
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">조회용 비밀번호 * (4~8자리)</Label>
        <Input id="password" name="password" type="password" minLength={4} maxLength={8} required />
        <p className="text-xs text-muted-foreground">신청 후 조회 시 사용합니다. 잊어버리면 복구 불가.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="purpose">사용 목적 (선택)</Label>
        <Textarea id="purpose" name="purpose" rows={2} />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? '신청 중...' : '대여 신청하기'}
      </Button>
    </form>
  )
}
