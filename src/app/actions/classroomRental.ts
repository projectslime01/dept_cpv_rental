// src/app/actions/classroomRental.ts
'use server'

import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import {
  isSubmissionTimeValid,
  isValidStartDate,
  countWeekdaysInRange,
  includesWeekend,
  isValidWeekendRental,
  getEarliestAllowedStartDate,
} from '@/lib/rental'
import { findTimetableConflict, DOW_LABELS } from '@/lib/timetable'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export type CreateClassroomRequestResult =
  | { success: true; requestNumber: string }
  | { success: false; error: string }


function generateClassroomRequestNumber(date: Date, id: number): string {
  const dateStr = format(date, 'yyyyMMdd')
  return `ROOM-${dateStr}-${String(id).padStart(4, '0')}`
}

/**
 * 특정 강의실의 특정 시간대에 승인된 예약이 있는지 확인 (중복/독점 검증)
 */
export async function checkClassroomAvailability(
  classroomId: number,
  startAt: Date,
  endAt: Date
): Promise<boolean> {
  const conflict = await prisma.classroomRentalRequest.findFirst({
    where: {
      classroomId,
      status: 'approved',
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  })
  return !conflict
}

export async function createClassroomRentalRequest(formData: FormData): Promise<CreateClassroomRequestResult> {
  const classroomId = parseInt(formData.get('classroomId') as string)
  const startAt = new Date(formData.get('startAt') as string)
  const endAt = new Date(formData.get('endAt') as string)
  const applicantName = (formData.get('applicantName') as string).trim()
  const studentId = (formData.get('studentId') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const password = (formData.get('password') as string)
  const purpose = (formData.get('purpose') as string | null)?.trim() || null
  const isGroup = formData.get('isGroup') === 'true'
  const groupCount = isGroup ? parseInt(formData.get('groupCount') as string) : null
  const groupMembers = isGroup ? ((formData.get('groupMembers') as string | null)?.trim() || null) : null
  const monitorAssets = (formData.get('monitorAssets') as string | null)?.trim() || null

  if (isNaN(classroomId) || classroomId < 1) {
    return { success: false, error: '강의실 정보가 올바르지 않습니다.' }
  }
  if (!applicantName || !studentId || !phone || !password) {
    return { success: false, error: '필수 항목을 모두 입력해주세요.' }
  }
  if (!purpose) {
    return { success: false, error: '사용 목적을 입력해주세요.' }
  }
  if (password.length < 4 || password.length > 8) {
    return { success: false, error: '비밀번호는 4~8자리여야 합니다.' }
  }
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || startAt >= endAt) {
    return { success: false, error: '대여 기간이 올바르지 않습니다.' }
  }

  // 대여 신청 및 기간 규칙 유효성 검증
  const now = new Date()
  if (!isSubmissionTimeValid(now)) {
    return {
      success: false,
      error: '대여 신청은 평일 09:00 ~ 17:00에만 가능합니다. (주말 및 공휴일 신청 불가)',
    }
  }

  if (!isValidStartDate(startAt, now)) {
    const earliestAllowed = getEarliestAllowedStartDate(now)
    const earliestStr = format(earliestAllowed, 'yyyy년 MM월 dd일', { locale: ko })
    return {
      success: false,
      error: `대여 신청은 평일 기준 최소 2일 전까지 가능합니다. (가장 빠른 대여 시작일: ${earliestStr})`,
    }
  }

  const hasDepartmentApproval =
    formData.get('hasDepartmentApproval') === 'true' ||
    formData.get('hasDepartmentApproval') === 'on'
  const weekdayCount = countWeekdaysInRange(startAt, endAt)
  const exceedsDuration = weekdayCount > 3
  const containsWeekend = includesWeekend(startAt, endAt)
  const violatesWeekendRule = containsWeekend && !isValidWeekendRental(startAt, endAt)

  if (exceedsDuration || violatesWeekendRule) {
    if (!hasDepartmentApproval) {
      if (exceedsDuration) {
        return {
          success: false,
          error: `대여 기간은 최대 평일 기준 3일 이내여야 합니다. (선택: ${weekdayCount}일). 대여 기간을 초과할 경우 학과장님 사전 승인을 득하고 승인 여부를 체크하셔야 대여 신청이 가능합니다.`,
        }
      } else {
        return {
          success: false,
          error: '주말이 포함된 대여는 반드시 "금요일 반출, 월요일 반납" 수칙을 준수해야 합니다. 미준수 시 학과장님 사전 승인을 득하고 승인 여부를 체크하셔야 대여 신청이 가능합니다.',
        }
      }
    }
  }

  try {
    // 수업 시간표 충돌 검사
    const timetables = await prisma.classroomTimetable.findMany({ where: { classroomId } })
    const conflict = findTimetableConflict(timetables, startAt, endAt)
    if (conflict) {
      const { entry, date } = conflict
      const dateStr = format(date, 'M월 d일', { locale: ko })
      const courseInfo = entry.courseName ? ` (${entry.courseName})` : ''
      return {
        success: false,
        error: `${dateStr}(${DOW_LABELS[entry.dayOfWeek]}) ${entry.startTime}~${entry.endTime}에 수업이 있어 대여할 수 없습니다.${courseInfo}`,
      }
    }

    // 독점 가용성 검증
    const isAvailable = await checkClassroomAvailability(classroomId, startAt, endAt)
    if (!isAvailable) {
      return { success: false, error: '선택하신 시간대에 이미 다른 강의실 대여 예약이 완료되었습니다.' }
    }

    const passwordHash = await hashPassword(password)

    const request = await prisma.classroomRentalRequest.create({
      data: {
        requestNumber: `TEMP-ROOM-${Date.now()}`,
        passwordHash,
        applicantName,
        studentId,
        phone,
        classroomId,
        startAt,
        endAt,
        purpose,
        isGroup,
        groupCount: groupCount ?? null,
        groupMembers: groupMembers ?? null,
        monitorAssets: monitorAssets ?? null,
        hasDepartmentApproval,
      },
    })

    const requestNumber = await generateClassroomRequestNumber(new Date(), request.id)
    await prisma.classroomRentalRequest.update({
      where: { id: request.id },
      data: { requestNumber },
    })

    return { success: true, requestNumber }
  } catch (error) {
    console.error('createClassroomRentalRequest error:', error)
    return { success: false, error: '신청 처리 중 오류가 발생했습니다. 다시 시도해주세요.' }
  }
}
