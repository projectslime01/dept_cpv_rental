'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
}

export async function getTimetablesForClassroom(classroomId: number) {
  return prisma.classroomTimetable.findMany({
    where: { classroomId },
    orderBy: [{ semesterStart: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })
}

export interface CreatedTimetableEntry {
  id: number
  classroomId: number
  dayOfWeek: number
  startTime: string
  endTime: string
  courseName: string | null
  semesterStart: string // ISO string
  semesterEnd: string   // ISO string
}

export type TimetableResult =
  | { success: true; entry: CreatedTimetableEntry }
  | { success: false; error: string }

export async function createTimetableEntry(formData: FormData): Promise<TimetableResult> {
  await requireAdmin()

  const classroomId    = parseInt(formData.get('classroomId') as string)
  const dayOfWeek      = parseInt(formData.get('dayOfWeek') as string)
  const startTime      = (formData.get('startTime') as string).trim()
  const endTime        = (formData.get('endTime') as string).trim()
  const courseName     = (formData.get('courseName') as string)?.trim() || null
  const semesterStart  = new Date(formData.get('semesterStart') as string)
  const semesterEnd    = new Date(formData.get('semesterEnd') as string)

  if (isNaN(classroomId) || isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return { success: false, error: '입력값이 올바르지 않습니다.' }
  }
  if (!startTime || !endTime) {
    return { success: false, error: '시작 시간과 종료 시간을 입력해주세요.' }
  }
  if (startTime >= endTime) {
    return { success: false, error: '종료 시간은 시작 시간보다 이후여야 합니다.' }
  }
  if (isNaN(semesterStart.getTime()) || isNaN(semesterEnd.getTime())) {
    return { success: false, error: '학기 기간을 올바르게 입력해주세요.' }
  }
  if (semesterStart > semesterEnd) {
    return { success: false, error: '학기 종료일은 시작일보다 이후여야 합니다.' }
  }

  try {
    const created = await prisma.classroomTimetable.create({
      data: { classroomId, dayOfWeek, startTime, endTime, courseName, semesterStart, semesterEnd },
    })
    revalidatePath(`/admin/classrooms/${classroomId}/timetable`)
    return {
      success: true,
      entry: {
        id: created.id,
        classroomId: created.classroomId,
        dayOfWeek: created.dayOfWeek,
        startTime: created.startTime,
        endTime: created.endTime,
        courseName: created.courseName,
        semesterStart: created.semesterStart.toISOString(),
        semesterEnd: created.semesterEnd.toISOString(),
      },
    }
  } catch (e) {
    console.error('createTimetableEntry error:', e)
    return { success: false, error: '저장 중 오류가 발생했습니다.' }
  }
}

export async function deleteTimetableEntry(id: number): Promise<void> {
  await requireAdmin()
  const entry = await prisma.classroomTimetable.delete({ where: { id }, select: { classroomId: true } })
  revalidatePath(`/admin/classrooms/${entry.classroomId}/timetable`)
  revalidatePath(`/api/classrooms/${entry.classroomId}/availability`)
}
