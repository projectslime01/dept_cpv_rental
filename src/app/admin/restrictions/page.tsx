import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { RestrictionManager, type RestrictionRow } from '@/components/admin/RestrictionManager'

export const dynamic = 'force-dynamic'

export default async function RestrictionsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/admin')
  }

  const rows = await prisma.rentalRestriction.findMany({
    orderBy: [{ releasedAt: 'asc' }, { endAt: 'desc' }],
  })

  const restrictions: RestrictionRow[] = rows.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    studentName: r.studentName,
    reason: r.reason,
    detail: r.detail,
    startAt: r.startAt.toISOString(),
    endAt: r.endAt.toISOString(),
    releasedAt: r.releasedAt ? r.releasedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-base-primary">대여 제한자 관리</h1>
        <p className="text-sm text-base-muted mt-1">
          노쇼·손망실·연체 등으로 대여를 제한할 학번을 등록합니다. 제한 기간 내에는 해당 학번의 기자재·강의실 대여 신청이 자동으로 차단됩니다. <span className="text-base-faint">(규정 제3조 6항)</span>
        </p>
      </div>
      <RestrictionManager restrictions={restrictions} />
    </div>
  )
}
