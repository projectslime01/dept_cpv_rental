import { prisma } from '@/lib/prisma'
import { GraduationCap } from 'lucide-react'
import { StudentRosterManager } from '@/components/admin/StudentRosterManager'

export const dynamic = 'force-dynamic'

export default async function AdminStudentsPage() {
  const [students, lastUpload, activeCount, byMajor] = await Promise.all([
    prisma.student.findMany({ orderBy: [{ grade: 'asc' }, { name: 'asc' }] }),
    prisma.studentRosterUpload.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.student.count({ where: { status: 'active' } }),
    prisma.student.groupBy({ by: ['major'], where: { status: 'active' }, _count: { _all: true } }),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-rose-muted flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-brand-rose" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-base-primary">학생 명단</h1>
          <p className="text-sm text-base-secondary">
            명단에 등록된 학생만 대여를 신청할 수 있습니다. 현재 활성 {activeCount}명
            {byMajor.filter((m) => m.major).length > 0 &&
              ` (${byMajor.filter((m) => m.major).map((m) => `${m.major} ${m._count._all}명`).join(' · ')})`}
            {lastUpload && ` · 최근 업로드 ${lastUpload.fileName}`}
          </p>
        </div>
      </div>

      <StudentRosterManager
        initialStudents={students.map((s) => ({
          studentId: s.studentId,
          name: s.name,
          grade: s.grade,
          className: s.className,
          major: s.major,
          status: s.status,
          source: s.source,
        }))}
      />
    </div>
  )
}
