import { prisma } from '@/lib/prisma'
import { TestTube2 } from 'lucide-react'
import { TestRequestForm } from '@/components/admin/TestRequestForm'

export const dynamic = 'force-dynamic'

export default async function TestRequestPage() {
  const [equipments, classrooms] = await Promise.all([
    prisma.equipment.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
        category: true,
        totalQuantity: true,
        minRentalQuantity: true,
        maxRentalQuantity: true,
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
        <TestTube2 className="w-5 h-5 text-brand-rose" />
        <h1 className="text-xl font-bold text-base-primary">테스트 신청 생성</h1>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
        평일 업무시간(09:00~17:00) 및 2일 전 신청 제한이 적용되지 않습니다. 테스트 목적으로만 사용하세요.
      </div>

      <div className="bg-surface-base rounded-2xl border border-base p-5">
        {equipments.length === 0 && classrooms.length === 0 ? (
          <p className="text-sm text-base-muted text-center py-8">
            등록된 기자재 또는 강의실이 없습니다.
          </p>
        ) : (
          <TestRequestForm equipments={equipments} classrooms={classrooms} />
        )}
      </div>
    </div>
  )
}
