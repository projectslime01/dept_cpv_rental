import { prisma } from '@/lib/prisma'
import { Building2 } from 'lucide-react'
import { CreateClassroomButton, ClassroomActions } from '@/components/admin/ClassroomForm'

export const dynamic = 'force-dynamic'

export default async function AdminClassroomsPage() {
  const now = new Date()
  const classrooms = await prisma.classroom.findMany({
    orderBy: { roomNumber: 'asc' },
  })

  // Calculate live reservation/rental status for each classroom
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
        <h1 className="text-xl font-bold text-[#e5e2e1]">강의실 관리</h1>
        <CreateClassroomButton />
      </div>

      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#252228]">
          <Building2 className="w-4 h-4 text-[#a78bfa]" />
          <h2 className="text-sm font-semibold text-[#c8c4c3]">등록된 강의실 목록</h2>
          <span className="ml-auto text-xs text-[#9b8f91]">{stats.length}개 공간</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-[#252228] border-b border-[#2e2b2f]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">강의실 번호</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">수용 인원</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">제공 시설 및 기자재</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">설명</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">현재 사용 여부</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">상태</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252228]">
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-[#6b6468]">등록된 강의실이 없습니다.</td>
                </tr>
              ) : stats.map((room) => {
                const equipmentList = room.equipment ? room.equipment.split(',').map(e => e.trim()) : []
                return (
                  <tr key={room.id} className="hover:bg-[#252228] transition-colors">
                    <td className="px-4 py-3 font-bold text-[#e5e2e1]">{room.roomNumber}</td>
                    <td className="px-4 py-3 text-center text-[#9b8f91] font-semibold">{room.capacity}명</td>
                    <td className="px-4 py-3">
                      {equipmentList.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {equipmentList.map((eq, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-lg bg-[#1a191b] border border-[#2e2b2f] text-[10px] font-semibold text-[#a78bfa] border-indigo-900/40 bg-indigo-950/20"
                            >
                              {eq}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-[#6b6468]">제공 시설 없음</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#9b8f91] max-w-xs truncate" title={room.description ?? ''}>
                      {room.description ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        room.isRentedNow
                          ? 'bg-red-950/50 text-red-400 border border-red-900/50'
                          : 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50'
                      }`}>
                        {room.isRentedNow ? '사용 중' : '미사용'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        room.status === 'active'
                          ? 'bg-indigo-950/50 text-[#a78bfa] border-indigo-900/50'
                          : 'bg-[#252228] text-[#6b6468] border-[#3a3640]'
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
