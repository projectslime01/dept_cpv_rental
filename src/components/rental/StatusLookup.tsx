'use client'

import { useState, useTransition } from 'react'
import { lookupRequest } from '@/app/actions/rental'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '승인 대기', variant: 'secondary' },
  approved: { label: '승인됨', variant: 'default' },
  rejected: { label: '거절됨', variant: 'destructive' },
  returned: { label: '반납 완료', variant: 'outline' },
}

export function StatusLookup() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    setResult(null)
    startTransition(async () => {
      const res = await lookupRequest(formData)
      if (res.success) {
        setResult(res.data)
      } else {
        setError(res.error + (res.remainingAttempts != null ? ` (남은 시도: ${res.remainingAttempts}회)` : ''))
      }
    })
  }

  const fmt = (d: Date) => format(new Date(d), 'yyyy.MM.dd HH:mm', { locale: ko })

  return (
    <div className="space-y-6">
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="requestNumber">신청 번호</Label>
          <Input id="requestNumber" name="requestNumber" placeholder="REQ-20260520-0001" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">조회용 비밀번호</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? '조회 중...' : '조회하기'}
        </Button>
      </form>

      {result && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-muted-foreground">{result.requestNumber}</span>
            <Badge variant={STATUS_LABELS[result.status]?.variant ?? 'secondary'}>
              {STATUS_LABELS[result.status]?.label ?? result.status}
            </Badge>
          </div>
          <div className="text-sm space-y-1">
            <p><span className="font-medium">기자재:</span> {result.equipmentName} × {result.quantity}개</p>
            <p><span className="font-medium">대여 기간:</span> {fmt(result.startAt)} ~ {fmt(result.endAt)}</p>
            <p><span className="font-medium">신청일:</span> {fmt(result.createdAt)}</p>
            {result.adminNote && (
              <p><span className="font-medium">관리자 메모:</span> {result.adminNote}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
