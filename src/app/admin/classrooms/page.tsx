import { prisma } from '@/lib/prisma'
import { Building2 } from 'lucide-react'
import { CreateClassroomButton, ClassroomActions } from '@/components/admin/ClassroomForm'

export const dynamic = 'force-dynamic'

export default async function AdminClassroomsPage() {
  const now = new Date()
  const classrooms = await prisma.classroom.findMany({
    orderBy: { roomNumber: 'asc' },
  })

  const stats = await Promise.all(
    classrooms.map(async (room) => {
      const activeRentalsCount = await prisma.classroomRentalRequest.count({
        where: {
          classroomId: room.id,
          status: 'approved',
          startAt: { lte: now },
          endAt: { gte: now },
        },
      })
      return {
        ...room,
        isRentedNow: activeRentalsCount > 0,
      }
    })
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-base-primary">강의실 관리</h1>
        <CreateClassroomButton />
      </div>

      <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-subtle">
          <Building2 className="w-4 h-4 text-brand-indigo" />
          <h2 className="text-sm font-semibold text-base-secondary">등록된 강의실 목록</h2>
          <span className="ml-auto text-xs text-base-muted">{stats.length}개 공간</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-surface-raised border-b border-base">
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">강의실 번호</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">수용 인원</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">제공 시설 및 기자재</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">설명</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">현재 사용 여부</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">상태</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border-subtle))]">
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-base-muted">등록된 강의실이 없습니다.</td>
                </tr>
              ) : stats.map((room) => {
                const equipmentList = room.equipment ? room.equipment.split(',').map(e => e.trim()) : []
                return (
                  <tr key={room.id} className="hover:bg-surface-raised transition-colors">
                    <td className="px-4 py-3 font-bold text-base-primary">{room.roomNumber}</td>
                    <td className="px-4 py-3 text-center text-base-secondary font-semibold">{room.capacity}명</td>
                    <td className="px-4 py-3">
                      {equipmentList.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {equipmentList.map((eq, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-lg bg-brand-indigo-muted border border-brand-indigo text-[10px] font-semibold text-brand-indigo"
                            >
                              {eq}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-base-faint">제공 시설 없음</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-base-muted max-w-xs truncate" title={room.description ?? ''}>
                      {room.description ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        room.isRentedNow
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {room.isRentedNow ? '사용 중' : '미사용'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        room.status === 'active'
                          ? 'bg-brand-indigo-muted text-brand-indigo border-brand-indigo'
                          : 'bg-surface-raised text-base-muted border-base'
                      }`}>
                        {room.status === 'active' ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ClassroomActions classroom={room} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
