// src/app/admin/classrooms/[id]/timetable/page.tsx
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CalendarDays, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ClassroomTimetableManager, type TimetableEntryRow } from '@/components/admin/ClassroomTimetableManager'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

export default async function ClassroomTimetablePage({ params }: Props) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const classroom = await prisma.classroom.findUnique({
    where: { id },
    include: {
      timetables: {
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      },
    },
  })
  if (!classroom) notFound()

  const entries: TimetableEntryRow[] = classroom.timetables.map((t) => ({
    id: t.id,
    classroomId: t.classroomId,
    dayOfWeek: t.dayOfWeek,
    startTime: t.startTime,
    endTime: t.endTime,
    courseName: t.courseName,
    semesterStart: t.semesterStart.toISOString(),
    semesterEnd: t.semesterEnd.toISOString(),
  }))

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/classrooms"
          className="inline-flex items-center gap-1.5 text-xs text-base-muted hover:text-base-secondary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          강의실 목록
        </Link>
        <span className="text-base-faint text-xs">/</span>
        <span className="text-xs text-base-muted">{classroom.roomNumber}</span>
      </div>

      <div className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-rose-500" />
        <h1 className="text-xl font-bold text-base-primary">
          {classroom.roomNumber} 수업 시간표 관리
        </h1>
      </div>

      <p className="text-sm text-base-muted leading-relaxed">
        수업이 있는 시간대에는 강의실 대여 신청이 자동으로 차단됩니다.
        학기 단위로 수업 일정을 등록해주세요.
      </p>

      <ClassroomTimetableManager
        classroomId={id}
        roomNumber={classroom.roomNumber}
        initialEntries={entries}
      />
    </div>
  )
}
