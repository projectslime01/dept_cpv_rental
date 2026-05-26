import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { DoorOpen } from 'lucide-react'
import { ClassroomActionButtons } from '@/components/admin/ClassroomActionButtons'

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-950/50 text-amber-400 border-amber-900/50',
  approved: 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50',
  rejected: 'bg-red-950/50 text-red-400 border-red-900/50',
}
const STATUS_LABELS: Record<string, string> = {
  pending: '대기', approved: '승인', rejected: '거절',
}

const TABS = ['all', 'pending', 'approved', 'rejected']
const TAB_LABELS: Record<string, string> = {
  all: '전체', pending: '대기', approved: '승인', rejected: '거절',
}

export default async function ClassroomAdminPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const statusFilter = searchParams.status && searchParams.status !== 'all'
    ? searchParams.status : undefined

  const requests = await prisma.classroomRequest.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    orderBy: { createdAt: 'desc' },
  })

  const fmt = (d: Date) => format(d, 'yy.MM.dd HH:mm', { locale: ko })
  const currentStatus = searchParams.status ?? 'all'

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#e5e2e1]">강의실 대여 신청 관리</h1>

      {/* 상태 탭 */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(t => (
          <a
            key={t}
            href={`/admin/classroom?status=${t}`}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              currentStatus === t
                ? 'bg-[#ffb2ba]/15 text-[#ffb2ba] border-[#ffb2ba]/30'
                : 'bg-[#201f21] text-[#9b8f91] border-[#2e2b2f] hover:bg-[#252228] hover:text-[#e5e2e1]'
            }`}
          >
            {TAB_LABELS[t]}
          </a>
        ))}
      </div>

      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#252228]">
          <DoorOpen className="w-4 h-4 text-[#6b6468]" />
          <h2 className="text-sm font-semibold text-[#c8c4c3]">신청 목록</h2>
          <span className="ml-auto text-xs text-[#6b6468]">{requests.length}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-[#252228] border-b border-[#2e2b2f]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">신청번호</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">신청자</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">학번</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">대여 기간</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">사용 유형</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">목적</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">모니터 자산번호</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">상태</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252228]">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sm text-[#6b6468]">신청 내역이 없습니다.</td>
                </tr>
              ) : requests.map(r => (
                <tr key={r.id} className="hover:bg-[#252228] transition-colors align-top">
                  <td className="px-4 py-3 font-mono text-xs text-[#9b8f91] whitespace-nowrap">{r.requestNumber}</td>
                  <td className="px-4 py-3">
                    <p className="text-[#e5e2e1] font-medium">{r.applicantName}</p>
                    <p className="text-xs text-[#6b6468]">{r.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-[#9b8f91] text-xs">{r.studentId}</td>
                  <td className="px-4 py-3 text-xs text-[#9b8f91] whitespace-nowrap">
                    {fmt(r.startAt)}<br />~ {fmt(r.endAt)}
                  </td>
                  <td className="px-4 py-3">
                    {r.isGroup ? (
                      <div>
                        <span className="text-xs font-semibold text-sky-400 bg-sky-950/50 border border-sky-900/50 px-1.5 py-0.5 rounded-full">
                          조별 {r.groupCount}명
                        </span>
                        {r.groupMembers && (
                          <p className="text-xs text-[#6b6468] mt-1 max-w-[120px] break-words">{r.groupMembers}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-[#9b8f91] bg-[#252228] border border-[#3a3640] px-1.5 py-0.5 rounded-full">
                        개인
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9b8f91] max-w-[140px]">
                    <p className="line-clamp-2">{r.purpose}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-[#9b8f91] max-w-[130px]">
                    <p className={`break-words ${r.monitorAssets === '미사용' ? 'text-[#4a4448] italic' : ''}`}>
                      {r.monitorAssets}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status] ?? STATUS_STYLES.pending}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                      {r.adminNote && (
                        <p className="text-[10px] text-[#6b6468] max-w-[80px] mx-auto break-words">{r.adminNote}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ClassroomActionButtons id={r.id} status={r.status} applicantName={r.applicantName} />
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
