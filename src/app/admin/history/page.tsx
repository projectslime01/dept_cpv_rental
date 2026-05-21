import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { History, Search } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  returned: 'bg-slate-100 text-slate-600 border-slate-200',
}
const STATUS_LABELS: Record<string, string> = {
  pending: '대기', approved: '승인', rejected: '거절', returned: '반납',
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { q?: string; equipment?: string; from?: string; to?: string }
}) {
  const equipmentList = await prisma.equipment.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const requests = await prisma.rentalRequest.findMany({
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
      ...(searchParams.from ? { createdAt: { gte: new Date(searchParams.from) } } : {}),
      ...(searchParams.to ? { createdAt: { lte: new Date(searchParams.to + 'T23:59:59') } } : {}),
    },
    include: { equipment: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const fmt = (d: Date) => format(d, 'yy.MM.dd HH:mm', { locale: ko })

  const inputCls = 'h-9 px-3.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-slate-400 transition-colors'

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900">대여 이력</h1>

      {/* 필터 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <form className="flex flex-wrap gap-2.5 items-center">
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="이름 / 학번 / 신청번호"
            className={inputCls + ' w-44'}
          />
          <select
            name="equipment"
            defaultValue={searchParams.equipment ?? ''}
            className={inputCls + ' w-40 bg-white'}
          >
            <option value="">전체 기자재</option>
            {equipmentList.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.name}</option>
            ))}
          </select>
          <input name="from" type="date" defaultValue={searchParams.from} className={inputCls} />
          <span className="text-slate-400 text-sm">~</span>
          <input name="to" type="date" defaultValue={searchParams.to} className={inputCls} />
          <button
            type="submit"
            className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            검색
          </button>
          <a
            href="/admin/history"
            className="h-9 px-4 rounded-xl border border-slate-200 text-sm text-slate-600 font-medium hover:bg-slate-50 transition-colors flex items-center"
          >
            초기화
          </a>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-50">
          <History className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">이력 목록</h2>
          <span className="ml-auto text-xs text-slate-400">{requests.length}건 (최대 200건)</span>
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">대여 기간</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">상태</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">신청일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm text-slate-400">이력이 없습니다.</td>
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
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmt(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
