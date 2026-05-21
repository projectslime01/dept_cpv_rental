import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Clock, Package } from 'lucide-react'

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
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">대시보드</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">승인 대기</p>
          <p className="text-3xl font-black text-amber-500 mt-2">{pendingCount}</p>
          <p className="text-xs text-slate-400 mt-1">건</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">현재 대여 중</p>
          <p className="text-3xl font-black text-sky-500 mt-2">{activeRentals}</p>
          <p className="text-xs text-slate-400 mt-1">건</p>
        </div>
      </div>

      {/* 반납 예정 */}
      {dueSoon.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-50">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">반납 예정 (3일 이내)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">기자재</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">신청자</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">반납 예정</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">D-Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dueSoon.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-800">{r.equipment.name}</td>
                    <td className="px-4 py-3 text-slate-700">{r.applicantName}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{fmt(r.endAt)}</td>
                    <td className="px-4 py-3 font-bold text-red-500 whitespace-nowrap">D-{diffDays(r.endAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 기자재별 수량 현황 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-50">
          <Package className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">기자재 수량 현황</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">기자재명</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">카테고리</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">전체</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">대여 중</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">대여 가능</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.map((eq) => (
                <tr key={eq.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{eq.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{eq.category}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{eq.totalQuantity}</td>
                  <td className="px-4 py-3 text-center text-sky-600 font-medium">{eq.rentedNow}</td>
                  <td className={`px-4 py-3 text-center font-bold ${eq.availableNow > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
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
