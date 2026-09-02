import { prisma } from '@/lib/prisma'
import { ClipboardPlus, AlertTriangle } from 'lucide-react'
import { ManualRequestForm } from '@/components/admin/ManualRequestForm'

export const dynamic = 'force-dynamic'

export default async function ManualRequestPage() {
  const [equipments, classrooms] = await Promise.all([
    prisma.equipment.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
        category: true,
        totalQuantity: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.classroom.findMany({
      where: { status: 'active' },
      select: { id: true, roomNumber: true },
      orderBy: { roomNumber: 'asc' },
    }),
  ])

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-2.5">
        <ClipboardPlus className="w-5 h-5 text-brand-rose" />
        <h1 className="text-xl font-bold text-base-primary">수동 등록 (규정 미적용)</h1>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold">모든 대여 규정을 무시하고 즉시 &lsquo;승인&rsquo; 상태로 기록됩니다.</p>
          <p>
            최대 대여 수량·재고 여유·학년 제한·주말/공휴일·2일 전 신청·신청 시간(강의실은 시간표 충돌
            포함)을 검증하지 않습니다. 수업용 대량 대여 등 관리자가 직접 확인해 접수한 건을 기입하는
            용도이며, <span className="font-semibold">실제 재고를 차감</span>하고 전체 대여 현황에 그대로 반영됩니다.
          </p>
        </div>
      </div>

      <div className="bg-surface-base rounded-2xl border border-base p-5">
        {equipments.length === 0 && classrooms.length === 0 ? (
          <p className="text-sm text-base-muted text-center py-8">
            등록된 기자재 또는 강의실이 없습니다.
          </p>
        ) : (
          <ManualRequestForm equipments={equipments} classrooms={classrooms} />
        )}
      </div>
    </div>
  )
}
