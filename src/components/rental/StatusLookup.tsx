'use client'

import { useState, useTransition } from 'react'
import { lookupRequest, LookupResult } from '@/app/actions/rental'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:  { label: '승인 대기', variant: 'secondary' },
  approved: { label: '승인됨',   variant: 'default' },
  rejected: { label: '거절됨',   variant: 'destructive' },
  returned: { label: '반납 완료', variant: 'outline' },
}

const fmt = (d: Date) => format(new Date(d), 'yyyy.MM.dd HH:mm', { locale: ko })

export function StatusLookup() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Extract<LookupResult, { success: true }> | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    setResult(null)
    startTransition(async () => {
      const res = await lookupRequest(formData)
      if (res.success) {
        setResult(res)
      } else {
        setError(res.error + (res.remainingAttempts != null ? ` (남은 시도: ${res.remainingAttempts}회)` : ''))
      }
    })
  }

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
        <div className="space-y-3">
          {/* 대여 기간 + 신청일 (공통) */}
          <div className="border rounded-xl p-4 space-y-2 bg-slate-50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">신청 정보</p>
            <p className="text-sm"><span className="font-medium">대여 기간:</span> {fmt(result.data.startAt)} ~ {fmt(result.data.endAt)}</p>
            <p className="text-sm"><span className="font-medium">신청일:</span> {fmt(result.data.createdAt)}</p>
          </div>

          {/* 묶음 신청인 경우 */}
          {result.groupItems && result.groupItems.length > 1 ? (
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b">
                <p className="text-xs font-semibold text-muted-foreground">일괄 신청 기자재 ({result.groupItems.length}종)</p>
              </div>
              <div className="divide-y">
                {result.groupItems.map(item => (
                  <div key={item.requestNumber} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium">{item.equipmentName} × {item.quantity}개</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.requestNumber}</p>
                      {item.adminNote && (
                        <p className="text-xs text-slate-500 mt-0.5">메모: {item.adminNote}</p>
                      )}
                    </div>
                    <Badge variant={STATUS_LABELS[item.status]?.variant ?? 'secondary'}>
                      {STATUS_LABELS[item.status]?.label ?? item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 단건 신청 */
            <div className="border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-muted-foreground">{result.data.requestNumber}</span>
                <Badge variant={STATUS_LABELS[result.data.status]?.variant ?? 'secondary'}>
                  {STATUS_LABELS[result.data.status]?.label ?? result.data.status}
                </Badge>
              </div>
              <p className="text-sm"><span className="font-medium">기자재:</span> {result.data.equipmentName} × {result.data.quantity}개</p>
              {result.data.adminNote && (
                <p className="text-sm"><span className="font-medium">관리자 메모:</span> {result.data.adminNote}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
