import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { ActionButtons } from '@/components/admin/ActionModal'

const STATUS_MAP: Record<string, { label: string; variant: any }> = {
  pending: { label: '대기', variant: 'secondary' },
  approved: { label: '승인', variant: 'default' },
  rejected: { label: '거절', variant: 'destructive' },
  returned: { label: '반납', variant: 'outline' },
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const statusFilter = searchParams.status && searchParams.status !== 'all'
    ? searchParams.status : undefined

  const requests = await prisma.rentalRequest.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    include: { equipment: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const fmt = (d: Date) => format(d, 'yy.MM.dd HH:mm', { locale: ko })
  const tabs = ['all', 'pending', 'approved', 'rejected', 'returned']
  const tabLabels: Record<string, string> = {
    all: '전체', pending: '대기', approved: '승인', rejected: '거절', returned: '반납완료'
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">신청 관리</h1>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <a
            key={t}
            href={`/admin/requests?status=${t}`}
            className={`px-3 py-1 rounded text-sm border ${
              (searchParams.status ?? 'all') === t ? 'bg-primary text-primary-foreground' : 'hover:bg-slate-50'
            }`}
          >
            {tabLabels[t]}
          </a>
        ))}
      </div>

      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">신청번호</th>
              <th className="text-left p-3">신청자</th>
              <th className="text-left p-3">학번</th>
              <th className="text-left p-3">기자재</th>
              <th className="text-center p-3">수량</th>
              <th className="text-left p-3">기간</th>
              <th className="text-center p-3">상태</th>
              <th className="text-center p-3">처리</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan={8} className="text-center p-6 text-muted-foreground">신청 내역이 없습니다.</td></tr>
            ) : requests.map((r) => (
              <tr key={r.id} className="border-t hover:bg-slate-50">
                <td className="p-3 font-mono text-xs">{r.requestNumber}</td>
                <td className="p-3">{r.applicantName}</td>
                <td className="p-3">{r.studentId}</td>
                <td className="p-3">{r.equipment.name}</td>
                <td className="p-3 text-center">{r.quantity}</td>
                <td className="p-3 text-xs">{fmt(r.startAt)} ~<br />{fmt(r.endAt)}</td>
                <td className="p-3 text-center">
                  <Badge variant={STATUS_MAP[r.status]?.variant}>{STATUS_MAP[r.status]?.label}</Badge>
                </td>
                <td className="p-3 text-center">
                  <ActionButtons
                    id={r.id}
                    status={r.status}
                    applicantName={r.applicantName}
                    equipmentName={r.equipment.name}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
