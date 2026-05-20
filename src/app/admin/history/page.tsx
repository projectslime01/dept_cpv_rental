import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'

const STATUS_MAP: Record<string, { label: string; variant: any }> = {
  pending: { label: '대기', variant: 'secondary' },
  approved: { label: '승인', variant: 'default' },
  rejected: { label: '거절', variant: 'destructive' },
  returned: { label: '반납', variant: 'outline' },
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { q?: string; equipment?: string; from?: string; to?: string }
}) {
  const equipmentList = await prisma.equipment.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const requests = await prisma.rentalRequest.findMany({
    where: {
      ...(searchParams.q
        ? {
            OR: [
              { applicantName: { contains: searchParams.q } },
              { studentId: { contains: searchParams.q } },
              { requestNumber: { contains: searchParams.q.toUpperCase() } },
            ],
          }
        : {}),
      ...(searchParams.equipment ? { equipmentId: parseInt(searchParams.equipment) } : {}),
      ...(searchParams.from ? { createdAt: { gte: new Date(searchParams.from) } } : {}),
      ...(searchParams.to ? { createdAt: { lte: new Date(searchParams.to + 'T23:59:59') } } : {}),
    },
    include: { equipment: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const fmt = (d: Date) => format(d, 'yy.MM.dd HH:mm', { locale: ko })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">대여 이력</h1>

      {/* 필터 */}
      <form className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="이름/학번/신청번호 검색"
          className="border rounded px-3 py-1.5 text-sm"
        />
        <select name="equipment" defaultValue={searchParams.equipment ?? ''} className="border rounded px-3 py-1.5 text-sm">
          <option value="">전체 기자재</option>
          {equipmentList.map((eq) => (
            <option key={eq.id} value={eq.id}>{eq.name}</option>
          ))}
        </select>
        <input name="from" type="date" defaultValue={searchParams.from} className="border rounded px-3 py-1.5 text-sm" />
        <span className="self-center text-muted-foreground text-sm">~</span>
        <input name="to" type="date" defaultValue={searchParams.to} className="border rounded px-3 py-1.5 text-sm" />
        <button type="submit" className="bg-primary text-primary-foreground px-4 py-1.5 rounded text-sm">
          검색
        </button>
        <a href="/admin/history" className="px-4 py-1.5 border rounded text-sm hover:bg-slate-50">초기화</a>
      </form>

      <p className="text-sm text-muted-foreground">총 {requests.length}건 (최대 200건)</p>

      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">신청번호</th>
              <th className="text-left p-3">신청자</th>
              <th className="text-left p-3">학번</th>
              <th className="text-left p-3">기자재</th>
              <th className="text-center p-3">수량</th>
              <th className="text-left p-3">대여 기간</th>
              <th className="text-center p-3">상태</th>
              <th className="text-left p-3">신청일</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan={8} className="text-center p-6 text-muted-foreground">이력이 없습니다.</td></tr>
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
                <td className="p-3 text-xs">{fmt(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
