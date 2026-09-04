import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { History, Search } from 'lucide-react'
import { CATEGORY_ORDER, sortByCategory } from '@/lib/categories'
import { groupRequests, unitFor } from '@/lib/requestGrouping'

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30',
  approved: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30',
  rejected: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30',
  returned: 'bg-surface-raised text-base-secondary border-base',
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
        include: {
          equipment: { select: { name: true, category: true } },
          accessories: { include: { accessory: { select: { name: true } } } },
        },
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
  const inputCls = 'h-9 px-3.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary focus:outline-none focus:border-strong transition-colors'

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-base-primary">대여 이력</h1>

      {/* 대여 대상 타입 토글 */}
      <div className="flex border-b border-base pb-px gap-2">
        <a
          href="/admin/history?type=equipment"
          className={`px-5 py-2.5 font-bold text-sm border-b-2 transition-all duration-200 ${
            currentType === 'equipment'
              ? 'border-brand-rose text-brand-rose'
              : 'border-transparent text-base-secondary hover:text-base-primary'
          }`}
        >
          기자재 대여 이력
        </a>
        <a
          href="/admin/history?type=classroom"
          className={`px-5 py-2.5 font-bold text-sm border-b-2 transition-all duration-200 ${
            currentType === 'classroom'
              ? 'border-brand-indigo text-brand-indigo'
              : 'border-transparent text-base-secondary hover:text-base-primary'
          }`}
        >
          강의실 대여 이력
        </a>
      </div>

      {/* 카테고리 탭 (기자재일 경우에만 표시) */}
      {currentType === 'equipment' && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-base-muted font-semibold mr-1">카테고리</span>
          <a
            href="/admin/history?type=equipment"
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              !categoryFilter
                ? 'bg-surface-raised text-base-primary border-strong'
                : 'bg-transparent text-base-muted border-base hover:border-strong hover:text-base-secondary'
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
                  ? 'bg-surface-raised text-base-primary border-strong'
                  : 'bg-transparent text-base-muted border-base hover:border-strong hover:text-base-secondary'
              }`}
            >
              {c}
            </a>
          ))}
        </div>
      )}

      {/* 검색 필터 */}
      <div className="bg-surface-base rounded-2xl border border-base p-4">
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
          <span className="text-base-muted text-sm">~</span>
          <input name="to" type="date" defaultValue={searchParams.to} className={inputCls} />
          
          <button
            type="submit"
            className={`h-9 px-4 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              currentType === 'classroom'
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white dark:bg-brand-rose dark:hover:bg-rose-400 dark:text-zinc-950'
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
            className="h-9 px-4 rounded-xl border border-strong text-sm text-base-secondary font-medium hover:bg-surface-raised hover:text-base-primary transition-colors flex items-center"
          >
            초기화
          </a>
        </form>
      </div>

      <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-base">
          <History className="w-4 h-4 text-base-muted" />
          <h2 className="text-sm font-semibold text-base-primary">이력 목록</h2>
          <span className="ml-auto text-xs text-base-muted">{requestsCount}건 (최대 200건)</span>
        </div>
        <div className="overflow-x-auto">
          {currentType === 'equipment' ? (
            <table className="w-full text-sm min-w-[920px]">
              <thead>
                <tr className="bg-surface-raised border-b border-base">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">신청번호</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">신청자</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">학번</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted">대여 품목</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted">대여 목적</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">대여 기간</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">상태</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">신청일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {equipmentRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-sm text-base-muted">이력이 없습니다.</td>
                  </tr>
                ) : groupRequests(equipmentRequests).map((group) => {
                  const head = group.rows[0]
                  const sortedRows = sortByCategory(
                    group.rows.map((r) => ({ ...r, name: r.equipment.name, category: r.equipment.category })),
                  )
                  return (
                  <tr key={group.key} className="hover:bg-surface-overlay transition-colors align-top">
                    <td className="px-4 py-3 font-mono text-xs text-base-secondary">
                      {group.groupNumber ?? head.requestNumber}
                      {group.rows.length > 1 && <div className="text-[11px] text-base-muted mt-0.5">{group.rows.length}개 품목</div>}
                    </td>
                    <td className="px-4 py-3 text-base-primary">
                      <div>{head.applicantName}</div>
                      {head.groupMembers && (
                        <div className="text-[11px] text-base-muted mt-0.5 break-keep">조원: {head.groupMembers}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-base-secondary">{head.studentId}</td>
                    <td className="px-4 py-3 text-base-primary max-w-[360px]">
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
                    <td className="px-4 py-3 text-xs text-base-secondary max-w-[220px] break-keep">
                      {head.purpose ? head.purpose : <span className="text-base-faint">-</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-base-secondary whitespace-nowrap">{fmt(head.startAt)}<br />~ {fmt(head.endAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[head.status] ?? STATUS_STYLES.pending}`}>
                        {STATUS_LABELS[head.status] ?? head.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-base-secondary whitespace-nowrap">{fmt(head.createdAt)}</td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-surface-raised border-b border-base">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">신청번호</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">신청자</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">학번</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">강의실</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">대여 목적</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">학과장 승인</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">대여 기간</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">상태</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">신청일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {classroomRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-sm text-base-muted">이력이 없습니다.</td>
                  </tr>
                ) : classroomRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-overlay transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-base-secondary">{r.requestNumber}</td>
                    <td className="px-4 py-3 text-base-primary">{r.applicantName}</td>
                    <td className="px-4 py-3 text-base-secondary">{r.studentId}</td>
                    <td className="px-4 py-3 text-base-primary font-semibold">{r.classroom.roomNumber}</td>
                    <td className="px-4 py-3 text-base-secondary max-w-[180px] truncate" title={r.purpose || ''}>
                      {r.purpose || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.hasDepartmentApproval ? (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
                          승인 득함
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-raised text-base-muted border border-base">
                          미대상/없음
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-base-secondary whitespace-nowrap">{fmt(r.startAt)}<br />~ {fmt(r.endAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status] ?? STATUS_STYLES.pending}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-base-secondary whitespace-nowrap">{fmt(r.createdAt)}</td>
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
