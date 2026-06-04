// src/app/(public)/classrooms/[id]/apply/page.tsx
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ClassroomRentalForm } from '@/components/classroom/ClassroomRentalForm'
import { ChevronRight } from 'lucide-react'

export default async function ClassroomApplyPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { startAt?: string; endAt?: string }
}) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const classroom = await prisma.classroom.findUnique({
    where: { id, status: 'active' },
  })

  if (!classroom) notFound()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-base-muted">
        <a href="/classrooms" className="hover:text-base-secondary transition-colors">강의실 목록</a>
        <ChevronRight className="w-3 h-3" />
        <a href={`/classrooms/${classroom.id}`} className="hover:text-base-secondary transition-colors">
          {classroom.roomNumber}
        </a>
        <ChevronRight className="w-3 h-3" />
        <span className="text-base-secondary font-medium">대여 신청서</span>
      </nav>

      <ClassroomRentalForm
        classroomId={classroom.id}
        classroomName={classroom.roomNumber}
        defaultStartAt={searchParams.startAt}
        defaultEndAt={searchParams.endAt}
      />
    </div>
  )
}
