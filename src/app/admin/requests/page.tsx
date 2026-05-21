import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ClipboardList } from 'lucide-react'
import { ActionButtons } from '@/components/admin/ActionModal'

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  returned: 'bg-slate-100 text-slate-600 border-slate-200',
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
  searchParams: { status?: string }
}) {
  const statusFilter = searchParams.status && searchParams.status !== 'all'
    ? searchParams.status : undefined

  const requests = await prisma.rentalRequest.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    include: { equipment: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const fmt = (d: Date) => format(d, 'yy.MM.dd HH:mm', { locale: ko })
  const current = searchParams.status ?? 'all'

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900">신청 관리</h1>

      {/* 상태 탭 */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/requests?status=${t}`}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              current === t
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {TAB_LABELS[t]}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-50">
          <ClipboardList className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">신청 목록</h2>
          <span className="ml-auto text-xs text-slate-400">{requests.length}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">신청번호</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">신청자</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">학번</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">기자재</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">수량</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">기간</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">상태</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm text-slate-400">신청 내역이 없습니다.</td>
                </tr>
              ) : requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.requestNumber}</td>
                  <td className="px-4 py-3 text-slate-800">{r.applicantName}</td>
                  <td className="px-4 py-3 text-slate-600">{r.studentId}</td>
                  <td className="px-4 py-3 text-slate-800">{r.equipment.name}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{r.quantity}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{fmt(r.startAt)}<br />~ {fmt(r.endAt)}</td>
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
        </div>
      </div>
    </div>
  )
}
