import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default async function DashboardPage() {
  const now = new Date()

  const [pendingCount, activeRentals, dueSoon, equipmentStats] = await Promise.all([
    prisma.rentalRequest.count({ where: { status: 'pending' } }),
    prisma.rentalRequest.count({
      where: { status: 'approved', startAt: { lte: now }, endAt: { gte: now } },
    }),
    prisma.rentalRequest.findMany({
      where: {
        status: 'approved',
        endAt: { gte: now, lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
      },
      include: { equipment: { select: { name: true } } },
      orderBy: { endAt: 'asc' },
    }),
    prisma.equipment.findMany({
      where: { status: 'active' },
      include: {
        requests: {
          where: { status: 'approved', startAt: { lte: now }, endAt: { gte: now } },
          select: { quantity: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  const stats = equipmentStats.map((eq) => ({
    ...eq,
    rentedNow: eq.requests.reduce((s, r) => s + r.quantity, 0),
    availableNow: Math.max(0, eq.totalQuantity - eq.requests.reduce((s, r) => s + r.quantity, 0)),
  }))

  const fmt = (d: Date) => format(d, 'MM/dd HH:mm', { locale: ko })
  const diffDays = (d: Date) => Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">대시보드</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">승인 대기</p>
          <p className="text-3xl font-bold text-orange-500">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">건</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">현재 대여 중</p>
          <p className="text-3xl font-bold text-blue-600">{activeRentals}</p>
          <p className="text-xs text-muted-foreground">건</p>
        </div>
      </div>

      {/* 반납 예정 */}
      {dueSoon.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">반납 예정 (3일 이내)</h2>
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3">기자재</th>
                  <th className="text-left p-3">신청자</th>
                  <th className="text-left p-3">반납 예정</th>
                  <th className="text-left p-3">D-Day</th>
                </tr>
              </thead>
              <tbody>
                {dueSoon.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">{r.equipment.name}</td>
                    <td className="p-3">{r.applicantName}</td>
                    <td className="p-3">{fmt(r.endAt)}</td>
                    <td className="p-3 font-medium text-red-500">D-{diffDays(r.endAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 기자재별 수량 현황 */}
      <div>
        <h2 className="font-semibold mb-3">기자재 수량 현황</h2>
        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">기자재명</th>
                <th className="text-left p-3">카테고리</th>
                <th className="text-center p-3">전체</th>
                <th className="text-center p-3">대여 중</th>
                <th className="text-center p-3">대여 가능</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((eq) => (
                <tr key={eq.id} className="border-t">
                  <td className="p-3">{eq.name}</td>
                  <td className="p-3 text-muted-foreground">{eq.category}</td>
                  <td className="p-3 text-center">{eq.totalQuantity}</td>
                  <td className="p-3 text-center text-blue-600">{eq.rentedNow}</td>
                  <td className={`p-3 text-center font-medium ${eq.availableNow > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {eq.availableNow}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
