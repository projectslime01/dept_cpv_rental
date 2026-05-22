import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Clock, Package, Building } from 'lucide-react'
import { sortByCategory } from '@/lib/categories'

export default async function DashboardPage() {
  const now = new Date()

  const [
    eqPendingCount,
    roomPendingCount,
    eqActiveRentals,
    roomActiveRentals,
    eqDueSoon,
    roomDueSoon,
    equipmentStats,
  ] = await Promise.all([
    prisma.rentalRequest.count({ where: { status: 'pending' } }),
    prisma.classroomRentalRequest.count({ where: { status: 'pending' } }),
    prisma.rentalRequest.count({
      where: { status: 'approved', startAt: { lte: now }, endAt: { gte: now } },
    }),
    prisma.classroomRentalRequest.count({
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
    prisma.classroomRentalRequest.findMany({
      where: {
        status: 'approved',
        endAt: { gte: now, lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
      },
      include: { classroom: { select: { roomNumber: true } } },
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
    }),
  ])

  const stats = sortByCategory(
    equipmentStats.map((eq) => ({
      ...eq,
      rentedNow: eq.requests.reduce((s, r) => s + r.quantity, 0),
      availableNow: Math.max(0, eq.totalQuantity - eq.requests.reduce((s, r) => s + r.quantity, 0)),
    }))
  )

  const fmt = (d: Date) => format(d, 'MM/dd HH:mm', { locale: ko })
  const diffDays = (d: Date) => Math.max(0, Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#e5e2e1]">대시보드</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-5">
          <p className="text-xs font-semibold text-[#6b6468] uppercase tracking-wider">기자재 승인 대기</p>
          <p className="text-3xl font-black text-amber-400 mt-2">{eqPendingCount}</p>
          <p className="text-xs text-[#6b6468] mt-1">건</p>
        </div>
        <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-5 border-indigo-900/30">
          <p className="text-xs font-semibold text-[#6b6468] uppercase tracking-wider">강의실 승인 대기</p>
          <p className="text-3xl font-black text-indigo-400 mt-2">{roomPendingCount}</p>
          <p className="text-xs text-[#6b6468] mt-1">건</p>
        </div>
        <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-5">
          <p className="text-xs font-semibold text-[#6b6468] uppercase tracking-wider">기자재 대여 중</p>
          <p className="text-3xl font-black text-[#ffb2ba] mt-2">{eqActiveRentals}</p>
          <p className="text-xs text-[#6b6468] mt-1">건</p>
        </div>
        <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-5 border-indigo-900/30">
          <p className="text-xs font-semibold text-[#6b6468] uppercase tracking-wider">강의실 대여 중</p>
          <p className="text-3xl font-black text-indigo-300 mt-2">{roomActiveRentals}</p>
          <p className="text-xs text-[#6b6468] mt-1">건</p>
        </div>
      </div>

      {/* 반납 / 사용 종료 예정 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기자재 반납 예정 */}
        <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#252228]">
            <Clock className="w-4 h-4 text-[#ffb2ba]" />
            <h2 className="text-sm font-semibold text-[#c8c4c3]">기자재 반납 예정 (3일 이내)</h2>
            <span className="ml-auto text-xs text-[#6b6468]">{eqDueSoon.length}건</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[360px]">
              <thead>
                <tr className="bg-[#252228] border-b border-[#2e2b2f]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">기자재</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">신청자</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">반납 예정</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">D-Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252228]">
                {eqDueSoon.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-xs text-[#6b6468]">예정된 내역이 없습니다.</td>
                  </tr>
                ) : eqDueSoon.map((r) => (
                  <tr key={r.id} className="hover:bg-[#252228] transition-colors">
                    <td className="px-4 py-3 text-[#e5e2e1]">{r.equipment.name}</td>
                    <td className="px-4 py-3 text-[#c8c4c3]">{r.applicantName}</td>
                    <td className="px-4 py-3 text-[#9b8f91] text-xs">{fmt(r.endAt)}</td>
                    <td className="px-4 py-3 font-bold text-[#ffb2ba] whitespace-nowrap">
                      {diffDays(r.endAt) === 0 ? 'D-Day' : `D-${diffDays(r.endAt)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 강의실 사용 종료 예정 */}
        <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#252228]">
            <Building className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-[#c8c4c3]">강의실 반납/종료 예정 (3일 이내)</h2>
            <span className="ml-auto text-xs text-[#6b6468]">{roomDueSoon.length}건</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[360px]">
              <thead>
                <tr className="bg-[#252228] border-b border-[#2e2b2f]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">강의실</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">신청자</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">사용 종료</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">D-Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252228]">
                {roomDueSoon.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-xs text-[#6b6468]">예정된 내역이 없습니다.</td>
                  </tr>
                ) : roomDueSoon.map((r) => (
                  <tr key={r.id} className="hover:bg-[#252228] transition-colors">
                    <td className="px-4 py-3 text-[#e5e2e1] font-semibold">{r.classroom.roomNumber}</td>
                    <td className="px-4 py-3 text-[#c8c4c3]">{r.applicantName}</td>
                    <td className="px-4 py-3 text-[#9b8f91] text-xs">{fmt(r.endAt)}</td>
                    <td className="px-4 py-3 font-bold text-indigo-400 whitespace-nowrap">
                      {diffDays(r.endAt) === 0 ? 'D-Day' : `D-${diffDays(r.endAt)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 기자재별 수량 현황 */}
      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#252228]">
          <Package className="w-4 h-4 text-[#6b6468]" />
          <h2 className="text-sm font-semibold text-[#c8c4c3]">기자재 수량 현황</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-[#252228] border-b border-[#2e2b2f]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">기자재명</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">카테고리</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">전체</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">대여 중</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">대여 가능</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252228]">
              {stats.map((eq) => (
                <tr key={eq.id} className="hover:bg-[#252228] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#e5e2e1]">{eq.name}</td>
                  <td className="px-4 py-3 text-[#9b8f91] text-xs">{eq.category}</td>
                  <td className="px-4 py-3 text-center text-[#9b8f91]">{eq.totalQuantity}</td>
                  <td className="px-4 py-3 text-center text-[#ffb2ba] font-medium">{eq.rentedNow}</td>
                  <td className={`px-4 py-3 text-center font-bold ${eq.availableNow > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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

