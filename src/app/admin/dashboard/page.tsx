import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Clock, Package, Building, Ban, ChevronRight, CalendarClock } from 'lucide-react'
import { sortByCategory } from '@/lib/categories'
import { groupRequests, unitFor } from '@/lib/requestGrouping'
import { nowKST } from '@/lib/rentalUtils'

export default async function DashboardPage() {
  const now = nowKST()

  const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const [
    eqPendingCount,
    roomPendingCount,
    eqActiveRentals,
    roomActiveRentals,
    eqDueSoon,
    roomDueSoon,
    eqUpcoming,
    roomUpcoming,
    equipmentStats,
    activeRestrictionCount,
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
      include: {
        equipment: { select: { name: true, category: true } },
        accessories: { include: { accessory: { select: { name: true } } } },
      },
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
    // 대여 예정: 승인됐으나 아직 시작 전이며 3일 이내 시작
    prisma.rentalRequest.findMany({
      where: {
        status: 'approved',
        startAt: { gt: now, lte: soon },
      },
      include: {
        equipment: { select: { name: true, category: true } },
        accessories: { include: { accessory: { select: { name: true } } } },
      },
      orderBy: { startAt: 'asc' },
    }),
    prisma.classroomRentalRequest.findMany({
      where: {
        status: 'approved',
        startAt: { gt: now, lte: soon },
      },
      include: { classroom: { select: { roomNumber: true } } },
      orderBy: { startAt: 'asc' },
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
    prisma.rentalRestriction.count({
      where: { releasedAt: null, startAt: { lte: now }, endAt: { gt: now } },
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
      <h1 className="text-xl font-bold text-base-primary">대시보드</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-base rounded-2xl border border-base p-5">
          <p className="text-xs font-semibold text-base-muted uppercase tracking-wider">기자재 승인 대기</p>
          <p className="text-3xl font-black text-amber-500 dark:text-amber-400 mt-2">{eqPendingCount}</p>
          <p className="text-xs text-base-muted mt-1">건</p>
        </div>
        <div className="bg-surface-base rounded-2xl border border-brand-indigo/30 p-5">
          <p className="text-xs font-semibold text-base-muted uppercase tracking-wider">강의실 승인 대기</p>
          <p className="text-3xl font-black text-brand-indigo mt-2">{roomPendingCount}</p>
          <p className="text-xs text-base-muted mt-1">건</p>
        </div>
        <div className="bg-surface-base rounded-2xl border border-base p-5">
          <p className="text-xs font-semibold text-base-muted uppercase tracking-wider">기자재 대여 중</p>
          <p className="text-3xl font-black text-brand-rose mt-2">{eqActiveRentals}</p>
          <p className="text-xs text-base-muted mt-1">건</p>
        </div>
        <div className="bg-surface-base rounded-2xl border border-brand-indigo/30 p-5">
          <p className="text-xs font-semibold text-base-muted uppercase tracking-wider">강의실 대여 중</p>
          <p className="text-3xl font-black text-brand-indigo mt-2">{roomActiveRentals}</p>
          <p className="text-xs text-base-muted mt-1">건</p>
        </div>
      </div>

      {/* 대여 제한자 알림 */}
      {activeRestrictionCount > 0 && (
        <Link
          href="/admin/restrictions"
          className="flex items-center gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl px-5 py-4 hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
            <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-700 dark:text-red-300">
              현재 대여 제한 중인 학번 {activeRestrictionCount}명
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
              제한 기간 내에는 해당 학번의 대여 신청이 자동 차단됩니다. 클릭하여 관리
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-red-500 shrink-0" />
        </Link>
      )}

      {/* 대여 예정 (곧 시작) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기자재 대여 예정 */}
        <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-base">
            <CalendarClock className="w-4 h-4 text-brand-rose" />
            <h2 className="text-sm font-semibold text-base-primary">기자재 대여 예정 (3일 이내)</h2>
            <span className="ml-auto text-xs text-base-muted">{eqUpcoming.length}건</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[360px]">
              <thead>
                <tr className="bg-surface-raised border-b border-base">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted">대여 품목</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">신청자</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">대여 시작</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">D-Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {eqUpcoming.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-xs text-base-muted">예정된 내역이 없습니다.</td>
                  </tr>
                ) : groupRequests(eqUpcoming).map((group) => {
                  const head = group.rows[0]
                  const sortedRows = sortByCategory(
                    group.rows.map((r) => ({ ...r, name: r.equipment.name, category: r.equipment.category })),
                  )
                  return (
                  <tr key={group.key} className="hover:bg-surface-overlay transition-colors align-top">
                    <td className="px-4 py-3 text-base-primary max-w-[280px]">
                      <div className="space-y-1">
                        {sortedRows.map((r) => (
                          <div key={r.id} className="leading-relaxed break-keep">
                            <span>{r.equipment.name} {r.quantity}{unitFor(r.equipment.category)}</span>
                            {r.accessories.length > 0 && (
                              <span className="block text-xs text-base-muted">
                                └ 부속: {r.accessories.map((a) => `${a.accessory.name} ${a.quantity}개`).join(', ')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-base-secondary whitespace-nowrap">{head.applicantName}</td>
                    <td className="px-4 py-3 text-base-muted text-xs whitespace-nowrap">{fmt(head.startAt)}</td>
                    <td className="px-4 py-3 font-bold text-brand-rose whitespace-nowrap">
                      {diffDays(head.startAt) === 0 ? 'D-Day' : `D-${diffDays(head.startAt)}`}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 강의실 사용 예정 */}
        <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-base">
            <CalendarClock className="w-4 h-4 text-brand-indigo" />
            <h2 className="text-sm font-semibold text-base-primary">강의실 사용 예정 (3일 이내)</h2>
            <span className="ml-auto text-xs text-base-muted">{roomUpcoming.length}건</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[360px]">
              <thead>
                <tr className="bg-surface-raised border-b border-base">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">강의실</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">신청자</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">사용 시작</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">D-Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {roomUpcoming.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-xs text-base-muted">예정된 내역이 없습니다.</td>
                  </tr>
                ) : roomUpcoming.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-overlay transition-colors">
                    <td className="px-4 py-3 text-base-primary font-semibold">{r.classroom.roomNumber}</td>
                    <td className="px-4 py-3 text-base-secondary">{r.applicantName}</td>
                    <td className="px-4 py-3 text-base-muted text-xs">{fmt(r.startAt)}</td>
                    <td className="px-4 py-3 font-bold text-brand-indigo whitespace-nowrap">
                      {diffDays(r.startAt) === 0 ? 'D-Day' : `D-${diffDays(r.startAt)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 반납 / 사용 종료 예정 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기자재 반납 예정 */}
        <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-base">
            <Clock className="w-4 h-4 text-brand-rose" />
            <h2 className="text-sm font-semibold text-base-primary">기자재 반납 예정 (3일 이내)</h2>
            <span className="ml-auto text-xs text-base-muted">{eqDueSoon.length}건</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[360px]">
              <thead>
                <tr className="bg-surface-raised border-b border-base">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted">대여 품목</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">신청자</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">반납 예정</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">D-Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {eqDueSoon.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-xs text-base-muted">예정된 내역이 없습니다.</td>
                  </tr>
                ) : groupRequests(eqDueSoon).map((group) => {
                  const head = group.rows[0]
                  const sortedRows = sortByCategory(
                    group.rows.map((r) => ({ ...r, name: r.equipment.name, category: r.equipment.category })),
                  )
                  return (
                  <tr key={group.key} className="hover:bg-surface-overlay transition-colors align-top">
                    <td className="px-4 py-3 text-base-primary max-w-[280px]">
                      <div className="space-y-1">
                        {sortedRows.map((r) => (
                          <div key={r.id} className="leading-relaxed break-keep">
                            <span>{r.equipment.name} {r.quantity}{unitFor(r.equipment.category)}</span>
                            {r.accessories.length > 0 && (
                              <span className="block text-xs text-base-muted">
                                └ 부속: {r.accessories.map((a) => `${a.accessory.name} ${a.quantity}개`).join(', ')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-base-secondary whitespace-nowrap">{head.applicantName}</td>
                    <td className="px-4 py-3 text-base-muted text-xs whitespace-nowrap">{fmt(head.endAt)}</td>
                    <td className="px-4 py-3 font-bold text-brand-rose whitespace-nowrap">
                      {diffDays(head.endAt) === 0 ? 'D-Day' : `D-${diffDays(head.endAt)}`}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 강의실 사용 종료 예정 */}
        <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-base">
            <Building className="w-4 h-4 text-brand-indigo" />
            <h2 className="text-sm font-semibold text-base-primary">강의실 반납/종료 예정 (3일 이내)</h2>
            <span className="ml-auto text-xs text-base-muted">{roomDueSoon.length}건</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[360px]">
              <thead>
                <tr className="bg-surface-raised border-b border-base">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">강의실</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">신청자</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">사용 종료</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">D-Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {roomDueSoon.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-xs text-base-muted">예정된 내역이 없습니다.</td>
                  </tr>
                ) : roomDueSoon.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-overlay transition-colors">
                    <td className="px-4 py-3 text-base-primary font-semibold">{r.classroom.roomNumber}</td>
                    <td className="px-4 py-3 text-base-secondary">{r.applicantName}</td>
                    <td className="px-4 py-3 text-base-muted text-xs">{fmt(r.endAt)}</td>
                    <td className="px-4 py-3 font-bold text-brand-indigo whitespace-nowrap">
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
      <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-base">
          <Package className="w-4 h-4 text-base-muted" />
          <h2 className="text-sm font-semibold text-base-primary">기자재 수량 현황</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-surface-raised border-b border-base">
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">기자재명</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">카테고리</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">전체</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">대여 중</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">대여 가능</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {stats.map((eq) => (
                <tr key={eq.id} className="hover:bg-surface-overlay transition-colors">
                  <td className="px-4 py-3 font-medium text-base-primary">{eq.name}</td>
                  <td className="px-4 py-3 text-base-secondary text-xs">{eq.category}</td>
                  <td className="px-4 py-3 text-center text-base-secondary">{eq.totalQuantity}</td>
                  <td className="px-4 py-3 text-center text-brand-rose font-medium">{eq.rentedNow}</td>
                  <td className={`px-4 py-3 text-center font-bold ${eq.availableNow > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
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
