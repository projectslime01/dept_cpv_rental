import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ClipboardList } from 'lucide-react'
import { ActionButtons, ClassroomActionButtons } from '@/components/admin/ActionModal'
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

const TABS = ['all', 'pending', 'approved', 'rejected', 'returned']
const TAB_LABELS: Record<string, string> = {
  all: '전체', pending: '대기', approved: '승인', rejected: '거절', returned: '반납완료',
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: { type?: string; status?: string; category?: string }
}) {
  const currentType = searchParams.type === 'classroom' ? 'classroom' : 'equipment'
  const statusFilter = searchParams.status && searchParams.status !== 'all'
    ? searchParams.status : undefined
  const categoryFilter = searchParams.category && searchParams.category !== 'all'
    ? searchParams.category : undefined

  // Equipment requests
  const equipmentRequests = currentType === 'equipment'
    ? await prisma.rentalRequest.findMany({
        where: {
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(categoryFilter ? { equipment: { category: categoryFilter } } : {}),
        },
        include: { equipment: { select: { name: true, category: true } } },
        orderBy: { createdAt: 'desc' },
      })
    : []

  // Classroom requests
  const classroomRequests = currentType === 'classroom'
    ? await prisma.classroomRentalRequest.findMany({
        where: {
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        include: { classroom: { select: { roomNumber: true } } },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const requestsCount = currentType === 'equipment' ? equipmentRequests.length : classroomRequests.length

  // Get existing categories in CATEGORY_ORDER for equipment
  const allEquipment = await prisma.equipment.findMany({ select: { category: true }, distinct: ['category'] })
  const existingCategories = allEquipment.map(e => e.category)
  const categories = CATEGORY_ORDER.filter(c => existingCategories.includes(c))

  const fmt = (d: Date) => format(d, 'yy.MM.dd HH:mm', { locale: ko })
  const currentStatus = searchParams.status ?? 'all'
  const currentCategory = searchParams.category ?? 'all'

  function tabHref(status: string) {
    const params = new URLSearchParams()
    params.set('type', currentType)
    params.set('status', status)
    if (currentType === 'equipment' && currentCategory !== 'all') {
      params.set('category', currentCategory)
    }
    return `/admin/requests?${params}`
  }

  function categoryHref(category: string) {
    const params = new URLSearchParams()
    params.set('type', currentType)
    if (currentStatus !== 'all') params.set('status', currentStatus)
    params.set('category', category)
    return `/admin/requests?${params}`
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#e5e2e1]">신청 관리</h1>

      {/* 대여 대상 타입 토글 */}
      <div className="flex border-b border-[#2a2830] pb-px gap-2">
        <a
          href="/admin/requests?type=equipment"
          className={`px-5 py-2.5 font-bold text-sm border-b-2 transition-all duration-200 ${
            currentType === 'equipment'
              ? 'border-[#ff4f73] text-[#ffb2ba]'
              : 'border-transparent text-[#9b8f91] hover:text-[#e5e2e1]'
          }`}
        >
          기자재 대여 신청
        </a>
        <a
          href="/admin/requests?type=classroom"
          className={`px-5 py-2.5 font-bold text-sm border-b-2 transition-all duration-200 ${
            currentType === 'classroom'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-[#9b8f91] hover:text-[#e5e2e1]'
          }`}
        >
          강의실 대여 신청
        </a>
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => (
          <a
            key={t}
            href={tabHref(t)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              currentStatus === t
                ? currentType === 'classroom'
                  ? 'bg-indigo-950/50 text-indigo-400 border-indigo-900/40'
                  : 'bg-[#ffb2ba]/15 text-[#ffb2ba] border-[#ffb2ba]/30'
                : 'bg-[#201f21] text-[#9b8f91] border-[#2e2b2f] hover:bg-[#252228] hover:text-[#e5e2e1]'
            }`}
          >
            {TAB_LABELS[t]}
          </a>
        ))}
      </div>

      {/* 카테고리 필터 (기자재인 경우에만 표시) */}
      {currentType === 'equipment' && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-[#6b6468] font-semibold mr-1">카테고리</span>
          <a
            href={categoryHref('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              currentCategory === 'all'
                ? 'bg-[#252228] text-[#e5e2e1] border-[#3a3640]'
                : 'bg-transparent text-[#6b6468] border-[#252228] hover:border-[#3a3640] hover:text-[#9b8f91]'
            }`}
          >
            전체
          </a>
          {categories.map((c) => (
            <a
              key={c}
              href={categoryHref(c)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                currentCategory === c
                  ? 'bg-[#252228] text-[#e5e2e1] border-[#3a3640]'
                  : 'bg-transparent text-[#6b6468] border-[#252228] hover:border-[#3a3640] hover:text-[#9b8f91]'
              }`}
            >
              {c}
            </a>
          ))}
        </div>
      )}

      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#252228]">
          <ClipboardList className="w-4 h-4 text-[#6b6468]" />
          <h2 className="text-sm font-semibold text-[#c8c4c3]">
            {currentType === 'equipment' ? '기자재 신청 목록' : '강의실 신청 목록'}
          </h2>
          <span className="ml-auto text-xs text-[#6b6468]">{requestsCount}건</span>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">기간</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">상태</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252228]">
                {equipmentRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-sm text-[#6b6468]">신청 내역이 없습니다.</td>
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
                    <td className="px-4 py-3 text-center">
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
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252228]">
                {classroomRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-sm text-[#6b6468]">신청 내역이 없습니다.</td>
                  </tr>
                ) : classroomRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-[#252228] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#9b8f91]">{r.requestNumber}</td>
                    <td className="px-4 py-3 text-[#e5e2e1]">{r.applicantName}</td>
                    <td className="px-4 py-3 text-[#9b8f91]">{r.studentId}</td>
                    <td className="px-4 py-3 text-[#e5e2e1] font-semibold">{r.classroom.roomNumber}</td>
                    <td className="px-4 py-3 text-[#9b8f91] max-w-[150px] truncate" title={r.purpose || ''}>
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
                    <td className="px-4 py-3 text-center">
                      <ClassroomActionButtons
                        id={r.id}
                        status={r.status}
                        applicantName={r.applicantName}
                        classroomNumber={r.classroom.roomNumber}
                      />
                    </td>
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
