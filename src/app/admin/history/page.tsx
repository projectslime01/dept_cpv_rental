import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { History, Search } from 'lucide-react'
import { CATEGORY_ORDER } from '@/lib/categories'

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-950/50 text-amber-400 border-amber-900/50',
  approved: 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50',
  rejected: 'bg-red-950/50 text-red-400 border-red-900/50',
  returned: 'bg-[#252228] text-[#9b8f91] border-[#3a3640]',
}
const STATUS_LABELS: Record<string, string> = {
  pending: '대기', approved: '승인', rejected: '거절', returned: '반납',
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { type?: string; q?: string; category?: string; equipment?: string; classroom?: string; from?: string; to?: string }
}) {
  const currentType = searchParams.type === 'classroom' ? 'classroom' : 'equipment'

  const allEquipment = await prisma.equipment.findMany({
    select: { id: true, name: true, category: true },
    orderBy: { name: 'asc' },
  })

  const classrooms = await prisma.classroom.findMany({
    select: { id: true, roomNumber: true },
    orderBy: { roomNumber: 'asc' },
  })

  // Categories sorted by CATEGORY_ORDER
  const existingCategories = Array.from(new Set(allEquipment.map(e => e.category)))
  const categories = CATEGORY_ORDER.filter(c => existingCategories.includes(c))

  // Equipment filtered by selected category
  const categoryFilter = searchParams.category && searchParams.category !== 'all'
    ? searchParams.category : undefined
  const filteredEquipment = categoryFilter
    ? allEquipment.filter(e => e.category === categoryFilter)
    : allEquipment

  const equipmentRequests = currentType === 'equipment'
    ? await prisma.rentalRequest.findMany({
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
          ...(categoryFilter ? { equipment: { category: categoryFilter } } : {}),
          ...(searchParams.from ? { createdAt: { gte: new Date(searchParams.from) } } : {}),
          ...(searchParams.to ? { createdAt: { lte: new Date(searchParams.to + 'T23:59:59') } } : {}),
        },
        include: { equipment: { select: { name: true, category: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
    : []

  const classroomRequests = currentType === 'classroom'
    ? await prisma.classroomRentalRequest.findMany({
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
          ...(searchParams.classroom ? { classroomId: parseInt(searchParams.classroom) } : {}),
          ...(searchParams.from ? { createdAt: { gte: new Date(searchParams.from) } } : {}),
          ...(searchParams.to ? { createdAt: { lte: new Date(searchParams.to + 'T23:59:59') } } : {}),
        },
        include: { classroom: { select: { roomNumber: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
    : []

  const requestsCount = currentType === 'equipment' ? equipmentRequests.length : classroomRequests.length

  const fmt = (d: Date) => format(d, 'yy.MM.dd HH:mm', { locale: ko })
  const inputCls = 'h-9 px-3.5 rounded-xl border border-[#3a3640] text-sm bg-[#1a191b] text-[#e5e2e1] focus:outline-none focus:border-[#7d7173] transition-colors'

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#e5e2e1]">대여 이력</h1>

      {/* 대여 대상 타입 토글 */}
      <div className="flex border-b border-[#2a2830] pb-px gap-2">
        <a
          href="/admin/history?type=equipment"
          className={`px-5 py-2.5 font-bold text-sm border-b-2 transition-all duration-200 ${
            currentType === 'equipment'
              ? 'border-[#ff4f73] text-[#ffb2ba]'
              : 'border-transparent text-[#9b8f91] hover:text-[#e5e2e1]'
          }`}
        >
          기자재 대여 이력
        </a>
        <a
          href="/admin/history?type=classroom"
          className={`px-5 py-2.5 font-bold text-sm border-b-2 transition-all duration-200 ${
            currentType === 'classroom'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-[#9b8f91] hover:text-[#e5e2e1]'
          }`}
        >
          강의실 대여 이력
        </a>
      </div>

      {/* 카테고리 탭 (기자재일 경우에만 표시) */}
      {currentType === 'equipment' && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-[#6b6468] font-semibold mr-1">카테고리</span>
          <a
            href="/admin/history?type=equipment"
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              !categoryFilter
                ? 'bg-[#252228] text-[#e5e2e1] border-[#3a3640]'
                : 'bg-transparent text-[#6b6468] border-[#252228] hover:border-[#3a3640] hover:text-[#9b8f91]'
            }`}
          >
            전체
          </a>
          {categories.map((c) => (
            <a
              key={c}
              href={`/admin/history?type=equipment&category=${encodeURIComponent(c)}`}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                categoryFilter === c
                  ? 'bg-[#252228] text-[#e5e2e1] border-[#3a3640]'
                  : 'bg-transparent text-[#6b6468] border-[#252228] hover:border-[#3a3640] hover:text-[#9b8f91]'
              }`}
            >
              {c}
            </a>
          ))}
        </div>
      )}

      {/* 검색 필터 */}
      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-4">
        <form className="flex flex-wrap gap-2.5 items-center">
          <input type="hidden" name="type" value={currentType} />
          {currentType === 'equipment' && categoryFilter && (
            <input type="hidden" name="category" value={categoryFilter} />
          )}
          
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="이름 / 학번 / 신청번호"
            className={inputCls + ' w-full sm:w-44'}
          />

          {currentType === 'equipment' ? (
            <select
              name="equipment"
              defaultValue={searchParams.equipment ?? ''}
              className={inputCls + ' w-full sm:w-44'}
            >
              <option value="">
                {categoryFilter ? `${categoryFilter} 전체` : '전체 기자재'}
              </option>
              {filteredEquipment.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.name}</option>
              ))}
            </select>
          ) : (
            <select
              name="classroom"
              defaultValue={searchParams.classroom ?? ''}
              className={inputCls + ' w-full sm:w-44'}
            >
              <option value="">전체 강의실</option>
              {classrooms.map((room) => (
                <option key={room.id} value={room.id}>{room.roomNumber}</option>
              ))}
            </select>
          )}

          <input name="from" type="date" defaultValue={searchParams.from} className={inputCls} />
          <span className="text-[#6b6468] text-sm">~</span>
          <input name="to" type="date" defaultValue={searchParams.to} className={inputCls} />
          
          <button
            type="submit"
            className={`h-9 px-4 rounded-xl text-white text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              currentType === 'classroom'
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-[#ff4f73] hover:bg-[#e03d61]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            검색
          </button>
          
          <a
            href={
              currentType === 'classroom'
                ? '/admin/history?type=classroom'
                : categoryFilter
                  ? `/admin/history?type=equipment&category=${encodeURIComponent(categoryFilter)}`
                  : '/admin/history?type=equipment'
            }
            className="h-9 px-4 rounded-xl border border-[#3a3640] text-sm text-[#9b8f91] font-medium hover:bg-[#252228] hover:text-[#e5e2e1] transition-colors flex items-center"
          >
            초기화
          </a>
        </form>
      </div>

      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#252228]">
          <History className="w-4 h-4 text-[#6b6468]" />
          <h2 className="text-sm font-semibold text-[#c8c4c3]">이력 목록</h2>
          <span className="ml-auto text-xs text-[#6b6468]">{requestsCount}건 (최대 200건)</span>
        </div>
        <div className="overflow-x-auto">
          {currentType === 'equipment' ? (
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-[#252228] border-b border-[#2e2b2f]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">신청번호</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">신청자</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">학번</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">기자재</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">카테고리</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">수량</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">대여 기간</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">상태</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">신청일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252228]">
                {equipmentRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-sm text-[#6b6468]">이력이 없습니다.</td>
                  </tr>
                ) : equipmentRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-[#252228] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#9b8f91]">{r.requestNumber}</td>
                    <td className="px-4 py-3 text-[#e5e2e1]">{r.applicantName}</td>
                    <td className="px-4 py-3 text-[#9b8f91]">{r.studentId}</td>
                    <td className="px-4 py-3 text-[#e5e2e1]">{r.equipment.name}</td>
                    <td className="px-4 py-3 text-[#9b8f91] text-xs">{r.equipment.category}</td>
                    <td className="px-4 py-3 text-center text-[#9b8f91]">{r.quantity}</td>
                    <td className="px-4 py-3 text-xs text-[#9b8f91] whitespace-nowrap">{fmt(r.startAt)}<br />~ {fmt(r.endAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status] ?? STATUS_STYLES.pending}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#9b8f91] whitespace-nowrap">{fmt(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-[#252228] border-b border-[#2e2b2f]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">신청번호</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">신청자</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">학번</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">강의실</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">대여 목적</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">학과장 승인</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">대여 기간</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">상태</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">신청일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252228]">
                {classroomRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-sm text-[#6b6468]">이력이 없습니다.</td>
                  </tr>
                ) : classroomRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-[#252228] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#9b8f91]">{r.requestNumber}</td>
                    <td className="px-4 py-3 text-[#e5e2e1]">{r.applicantName}</td>
                    <td className="px-4 py-3 text-[#9b8f91]">{r.studentId}</td>
                    <td className="px-4 py-3 text-[#e5e2e1] font-semibold">{r.classroom.roomNumber}</td>
                    <td className="px-4 py-3 text-[#9b8f91] max-w-[180px] truncate" title={r.purpose || ''}>
                      {r.purpose || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.hasDepartmentApproval ? (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-900/50">
                          승인 득함
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1a191b] text-[#6b6468] border border-[#2e2b2f]">
                          미대상/없음
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#9b8f91] whitespace-nowrap">{fmt(r.startAt)}<br />~ {fmt(r.endAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status] ?? STATUS_STYLES.pending}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#9b8f91] whitespace-nowrap">{fmt(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
