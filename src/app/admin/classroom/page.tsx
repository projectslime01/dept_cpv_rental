import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { DoorOpen } from 'lucide-react'
import { ClassroomRentalActionButtons } from '@/components/admin/ClassroomRentalActionButtons'

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-500/10 text-amber-500 border-amber-500/30',
  approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/30',
  returned: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
}
const STATUS_LABELS: Record<string, string> = {
  pending: '대기', approved: '승인', rejected: '거절', returned: '반납',
}

const TABS = ['all', 'pending', 'approved', 'rejected', 'returned']
const TAB_LABELS: Record<string, string> = {
  all: '전체', pending: '대기', approved: '승인', rejected: '거절', returned: '반납',
}

export const dynamic = 'force-dynamic'

export default async function ClassroomAdminPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const statusFilter = searchParams.status && searchParams.status !== 'all'
    ? searchParams.status : undefined

  const requests = await prisma.classroomRentalRequest.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    include: {
      classroom: { select: { roomNumber: true } },
      testAdmin: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const fmt = (d: Date) => format(d, 'yy.MM.dd HH:mm', { locale: ko })
  const currentStatus = searchParams.status ?? 'all'

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-base-primary">강의실 대여 신청 관리</h1>

      {/* 상태 탭 */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(t => (
          <a
            key={t}
            href={`/admin/classroom?status=${t}`}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              currentStatus === t
                ? 'bg-brand-rose/10 text-brand-rose border-brand-rose/30'
                : 'bg-surface-base text-base-secondary border-base hover:bg-surface-raised hover:text-base-primary'
            }`}
          >
            {TAB_LABELS[t]}
          </a>
        ))}
      </div>

      <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-subtle">
          <DoorOpen className="w-4 h-4 text-base-muted" />
          <h2 className="text-sm font-semibold text-base-secondary">신청 목록</h2>
          <span className="ml-auto text-xs text-base-muted">{requests.length}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className="bg-surface-raised border-b border-base">
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">신청번호</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">강의실</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">신청자</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">학번</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">대여 기간</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">사용 유형</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">목적</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">모니터</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">상태</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border-subtle))]">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-sm text-base-muted">신청 내역이 없습니다.</td>
                </tr>
              ) : requests.map(r => (
                <tr key={r.id} className="hover:bg-surface-raised transition-colors align-top">
                  <td className="px-4 py-3 font-mono text-xs text-base-secondary">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="whitespace-nowrap">{r.requestNumber}</span>
                      {r.isTest && (
                        <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50">
                          테스트
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-base-primary whitespace-nowrap">{r.classroom.roomNumber}</td>
                  <td className="px-4 py-3">
                    <p className="text-base-primary font-medium">{r.applicantName}</p>
                    <p className="text-xs text-base-muted">{r.phone}</p>
                    {r.isTest && (
                      <div className="text-[11px] text-base-muted">
                        생성: {r.testAdmin?.name ?? '삭제된 관리자'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-base-secondary text-xs">{r.studentId}</td>
                  <td className="px-4 py-3 text-xs text-base-secondary whitespace-nowrap">
                    {fmt(r.startAt)}<br />~ {fmt(r.endAt)}
                  </td>
                  <td className="px-4 py-3">
                    {r.isGroup ? (
                      <div>
                        <span className="text-xs font-semibold text-sky-500 bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.5 rounded-full">
                          조별 {r.groupCount}명
                        </span>
                        {r.groupMembers && (
                          <p className="text-xs text-base-muted mt-1 max-w-[120px] break-words">{r.groupMembers}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-base-secondary bg-surface-raised border border-base px-1.5 py-0.5 rounded-full">
                        개인
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-base-secondary max-w-[140px]">
                    <p className="line-clamp-2">{r.purpose ?? '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-base-secondary max-w-[120px]">
                    <p className={`break-words ${!r.monitorAssets || r.monitorAssets === '미사용' ? 'text-base-muted italic' : ''}`}>
                      {r.monitorAssets ?? '미사용'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status] ?? STATUS_STYLES.pending}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                      {r.hasDepartmentApproval && (
                        <p className="text-[10px] text-amber-500">학과장 승인</p>
                      )}
                      {r.adminNote && (
                        <p className="text-[10px] text-base-muted max-w-[80px] mx-auto break-words">{r.adminNote}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ClassroomRentalActionButtons id={r.id} status={r.status} applicantName={r.applicantName} />
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
