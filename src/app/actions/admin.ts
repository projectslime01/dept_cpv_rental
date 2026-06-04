'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import {
  checkAvailability,
  generateRequestNumber,
} from '@/lib/rental'
import { checkClassroomAvailability } from '@/app/actions/classroomRental'
import { findTimetableConflict } from '@/lib/timetable'
import { hashPassword } from '@/lib/password'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
}

async function requireAdminSession() {
  // CredentialsProvider only returns users from the Admin table,
  // so a valid session is sufficient to confirm admin identity.
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error('Unauthorized')
  return {
    adminId: parseInt(session.user.id),
  }
}

function generateClassroomRN(date: Date, id: number): string {
  return `ROOM-${format(date, 'yyyyMMdd')}-${String(id).padStart(4, '0')}`
}

export async function approveRequest(id: number, note?: string) {
  await requireAdmin()
  const request = await prisma.rentalRequest.update({
    where: { id, status: 'pending' },
    data: { status: 'approved', adminNote: note || null },
    select: { equipmentId: true },
  })
  revalidatePath('/admin/requests')
  revalidatePath('/admin/dashboard')
  revalidatePath('/')
  revalidatePath(`/equipment/${request.equipmentId}`)
}

export async function rejectRequest(id: number, note: string) {
  await requireAdmin()
  const request = await prisma.rentalRequest.update({
    where: { id, status: 'pending' },
    data: { status: 'rejected', adminNote: note },
    select: { equipmentId: true },
  })
  revalidatePath('/admin/requests')
  revalidatePath('/')
  revalidatePath(`/equipment/${request.equipmentId}`)
}

export async function markReturned(id: number) {
  await requireAdmin()
  const request = await prisma.rentalRequest.update({
    where: { id, status: 'approved' },
    data: { status: 'returned', returnedAt: new Date() },
    select: { equipmentId: true },
  })
  revalidatePath('/admin/requests')
  revalidatePath('/admin/dashboard')
  revalidatePath('/')
  revalidatePath(`/equipment/${request.equipmentId}`)
}

// ── 묶음(신청 통째) 일괄 처리 ──────────────────────────────
export async function approveRequestGroup(ids: number[], note?: string) {
  await requireAdmin()
  if (!ids?.length) return
  const affected = await prisma.rentalRequest.findMany({
    where: { id: { in: ids }, status: 'pending' },
    select: { equipmentId: true },
  })
  await prisma.rentalRequest.updateMany({
    where: { id: { in: ids }, status: 'pending' },
    data: { status: 'approved', adminNote: note || null },
  })
  revalidatePath('/admin/requests')
  revalidatePath('/admin/dashboard')
  revalidatePath('/')
  for (const eqId of Array.from(new Set(affected.map((a) => a.equipmentId)))) {
    revalidatePath(`/equipment/${eqId}`)
  }
}

export async function rejectRequestGroup(ids: number[], note: string) {
  await requireAdmin()
  if (!ids?.length) return
  const affected = await prisma.rentalRequest.findMany({
    where: { id: { in: ids }, status: 'pending' },
    select: { equipmentId: true },
  })
  await prisma.rentalRequest.updateMany({
    where: { id: { in: ids }, status: 'pending' },
    data: { status: 'rejected', adminNote: note },
  })
  revalidatePath('/admin/requests')
  revalidatePath('/')
  for (const eqId of Array.from(new Set(affected.map((a) => a.equipmentId)))) {
    revalidatePath(`/equipment/${eqId}`)
  }
}

export async function markReturnedGroup(ids: number[]) {
  await requireAdmin()
  if (!ids?.length) return
  const affected = await prisma.rentalRequest.findMany({
    where: { id: { in: ids }, status: 'approved' },
    select: { equipmentId: true },
  })
  await prisma.rentalRequest.updateMany({
    where: { id: { in: ids }, status: 'approved' },
    data: { status: 'returned', returnedAt: new Date() },
  })
  revalidatePath('/admin/requests')
  revalidatePath('/admin/dashboard')
  revalidatePath('/')
  for (const eqId of Array.from(new Set(affected.map((a) => a.equipmentId)))) {
    revalidatePath(`/equipment/${eqId}`)
  }
}

export async function createEquipment(formData: FormData) {
  await requireAdmin()
  const totalQuantity = parseInt(formData.get('totalQuantity') as string)
  const minRentalQuantity = parseInt(formData.get('minRentalQuantity') as string) || 1
  const maxRaw = parseInt(formData.get('maxRentalQuantity') as string)
  const maxRentalQuantity = isNaN(maxRaw) || maxRaw < 1 ? null : Math.min(maxRaw, totalQuantity)
  await prisma.equipment.create({
    data: {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      description: (formData.get('description') as string) || null,
      totalQuantity,
      minRentalQuantity: Math.max(1, Math.min(minRentalQuantity, totalQuantity)),
      maxRentalQuantity,
    },
  })
  revalidatePath('/admin/equipment')
  revalidatePath('/')
}

export async function updateEquipment(id: number, formData: FormData) {
  await requireAdmin()
  const totalQuantity = parseInt(formData.get('totalQuantity') as string)
  const minRentalQuantity = parseInt(formData.get('minRentalQuantity') as string) || 1
  const maxRaw = parseInt(formData.get('maxRentalQuantity') as string)
  const maxRentalQuantity = isNaN(maxRaw) || maxRaw < 1 ? null : Math.min(maxRaw, totalQuantity)
  await prisma.equipment.update({
    where: { id },
    data: {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      description: (formData.get('description') as string) || null,
      totalQuantity,
      minRentalQuantity: Math.max(1, Math.min(minRentalQuantity, totalQuantity)),
      maxRentalQuantity,
    },
  })
  revalidatePath('/admin/equipment')
  revalidatePath('/')
  revalidatePath(`/equipment/${id}`)
}

export async function deactivateEquipment(id: number) {
  await requireAdmin()
  await prisma.equipment.update({
    where: { id },
    data: { status: 'inactive' },
  })
  revalidatePath('/admin/equipment')
  revalidatePath('/')
  revalidatePath(`/equipment/${id}`)
}

export async function activateEquipment(id: number) {
  await requireAdmin()
  await prisma.equipment.update({
    where: { id },
    data: { status: 'active' },
  })
  revalidatePath('/admin/equipment')
  revalidatePath('/')
  revalidatePath(`/equipment/${id}`)
}

export async function approveClassroomRequest(id: number, note?: string) {
  await requireAdmin()
  const request = await prisma.classroomRentalRequest.update({
    where: { id, status: 'pending' },
    data: { status: 'approved', adminNote: note || null },
    select: { classroomId: true },
  })
  revalidatePath('/admin/classroom')
  revalidatePath('/admin/dashboard')
  revalidatePath('/classrooms')
  revalidatePath(`/classrooms/${request.classroomId}`)
}

export async function rejectClassroomRequest(id: number, note: string) {
  await requireAdmin()
  const request = await prisma.classroomRentalRequest.update({
    where: { id, status: 'pending' },
    data: { status: 'rejected', adminNote: note },
    select: { classroomId: true },
  })
  revalidatePath('/admin/classroom')
  revalidatePath('/admin/dashboard')
  revalidatePath('/classrooms')
  revalidatePath(`/classrooms/${request.classroomId}`)
}

export async function markClassroomReturned(id: number) {
  await requireAdmin()
  const request = await prisma.classroomRentalRequest.update({
    where: { id, status: 'approved' },
    data: { status: 'returned', returnedAt: new Date() },
    select: { classroomId: true },
  })
  revalidatePath('/admin/classroom')  // 버그 수정: 이전엔 '/admin/requests' 였음
  revalidatePath('/admin/dashboard')
  revalidatePath('/classrooms')
  revalidatePath(`/classrooms/${request.classroomId}`)
}

export async function createClassroom(formData: FormData) {
  await requireAdmin()
  await prisma.classroom.create({
    data: {
      roomNumber: formData.get('roomNumber') as string,
      capacity: parseInt(formData.get('capacity') as string),
      description: (formData.get('description') as string) || null,
      equipment: (formData.get('equipment') as string) || null,
    },
  })
  revalidatePath('/admin/classrooms')
  revalidatePath('/classrooms')
}

export async function updateClassroom(id: number, formData: FormData) {
  await requireAdmin()
  await prisma.classroom.update({
    where: { id },
    data: {
      roomNumber: formData.get('roomNumber') as string,
      capacity: parseInt(formData.get('capacity') as string),
      description: (formData.get('description') as string) || null,
      equipment: (formData.get('equipment') as string) || null,
    },
  })
  revalidatePath('/admin/classrooms')
  revalidatePath('/classrooms')
  revalidatePath(`/classrooms/${id}`)
}

export async function deactivateClassroom(id: number) {
  await requireAdmin()
  await prisma.classroom.update({
    where: { id },
    data: { status: 'inactive' },
  })
  revalidatePath('/admin/classrooms')
  revalidatePath('/classrooms')
  revalidatePath(`/classrooms/${id}`)
}

export async function activateClassroom(id: number) {
  await requireAdmin()
  await prisma.classroom.update({
    where: { id },
    data: { status: 'active' },
  })
  revalidatePath('/admin/classrooms')
  revalidatePath('/classrooms')
  revalidatePath(`/classrooms/${id}`)
}

export async function deleteClassroom(id: number) {
  await requireAdmin()
  await prisma.$transaction([
    prisma.classroomRentalRequest.deleteMany({ where: { classroomId: id } }),
    prisma.classroom.delete({ where: { id } }),
  ])
  revalidatePath('/admin/classrooms')
  revalidatePath('/classrooms')
}

export async function deleteEquipment(id: number) {
  await requireAdmin()
  await prisma.$transaction([
    prisma.rentalRequest.deleteMany({ where: { equipmentId: id } }),
    prisma.equipment.delete({ where: { id } }),
  ])
  revalidatePath('/admin/equipment')
  revalidatePath('/')
}

// ─── 부속 기자재 관리 ────────────────────────────────────────────────────────

export interface CreatedAccessoryEntry {
  id: number
  equipmentId: number
  name: string
  description: string | null
  totalQuantity: number
  status: string
  createdAt: string // ISO string
}

export type AccessoryResult =
  | { success: true; entry: CreatedAccessoryEntry }
  | { success: false; error: string }

export async function createEquipmentAccessory(
  formData: FormData,
): Promise<AccessoryResult> {
  await requireAdmin()

  const equipmentId = parseInt(formData.get('equipmentId') as string)
  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const totalQuantity = parseInt(formData.get('totalQuantity') as string)

  if (isNaN(equipmentId) || equipmentId < 1) {
    return { success: false, error: '기자재 정보가 올바르지 않습니다.' }
  }
  if (!name) {
    return { success: false, error: '부속 기자재 이름을 입력해주세요.' }
  }
  if (isNaN(totalQuantity) || totalQuantity < 1) {
    return { success: false, error: '총 수량은 1 이상이어야 합니다.' }
  }

  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { id: true },
  })
  if (!equipment) {
    return { success: false, error: '해당 기자재를 찾을 수 없습니다.' }
  }

  const entry = await prisma.equipmentAccessory.create({
    data: { equipmentId, name, description, totalQuantity },
  })

  revalidatePath(`/admin/equipment/${equipmentId}/accessories`)

  return {
    success: true,
    entry: {
      id: entry.id,
      equipmentId: entry.equipmentId,
      name: entry.name,
      description: entry.description,
      totalQuantity: entry.totalQuantity,
      status: entry.status,
      createdAt: entry.createdAt.toISOString(),
    },
  }
}

export async function deleteEquipmentAccessory(id: number): Promise<void> {
  await requireAdmin()
  const entry = await prisma.equipmentAccessory.findUnique({
    where: { id },
    select: { equipmentId: true },
  })
  if (!entry) return
  // onDelete: Restrict — 대여 기록 있으면 DB 에러 발생 (호출자가 catch 해야 함)
  await prisma.equipmentAccessory.delete({ where: { id } })
  revalidatePath(`/admin/equipment/${entry.equipmentId}/accessories`)
}

export type TestRentalResult =
  | { success: true; requestNumber: string }
  | { success: false; error: string }

export async function createTestRentalRequest(formData: FormData): Promise<TestRentalResult> {
  const { adminId } = await requireAdminSession()

  const equipmentId = parseInt(formData.get('equipmentId') as string)
  const quantity = parseInt(formData.get('quantity') as string)
  const startAt = new Date(formData.get('startAt') as string)
  const endAt = new Date(formData.get('endAt') as string)
  const applicantName = (formData.get('applicantName') as string).trim()
  const studentId = (formData.get('studentId') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const password = formData.get('password') as string
  const purpose = (formData.get('purpose') as string | null)?.trim() || null

  if (isNaN(equipmentId) || equipmentId < 1) return { success: false, error: '기자재 정보가 올바르지 않습니다.' }
  if (isNaN(quantity) || quantity < 1) return { success: false, error: '수량이 올바르지 않습니다.' }
  if (!applicantName || !studentId || !phone || !password) return { success: false, error: '필수 항목을 모두 입력해주세요.' }
  if (password.length < 4 || password.length > 8) return { success: false, error: '비밀번호는 4~8자리여야 합니다.' }
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || startAt >= endAt) return { success: false, error: '대여 기간이 올바르지 않습니다.' }

  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { minRentalQuantity: true, maxRentalQuantity: true, totalQuantity: true, status: true },
  })
  if (!equipment || equipment.status !== 'active') return { success: false, error: '해당 기자재를 찾을 수 없습니다.' }
  if (quantity < equipment.minRentalQuantity) {
    return { success: false, error: `이 기자재는 최소 ${equipment.minRentalQuantity}개 이상 신청해야 합니다.` }
  }
  const effectiveMax = equipment.maxRentalQuantity !== null
    ? Math.min(equipment.maxRentalQuantity, equipment.totalQuantity)
    : equipment.totalQuantity
  if (quantity > effectiveMax) {
    return { success: false, error: `이 기자재는 최대 ${effectiveMax}개까지 신청 가능합니다.` }
  }

  // isSubmissionTimeValid, isValidStartDate 건너뜀 (테스트 전용)
  const available = await checkAvailability(equipmentId, quantity, startAt, endAt)
  if (!available) return { success: false, error: '선택한 기간에 해당 수량을 대여할 수 없습니다.' }

  try {
    const requestNumber = await prisma.$transaction(async (tx) => {
      const passwordHash = await hashPassword(password)
      const req = await tx.rentalRequest.create({
        data: {
          requestNumber: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          passwordHash,
          applicantName,
          studentId,
          phone,
          equipmentId,
          quantity,
          startAt,
          endAt,
          purpose,
          isTest: true,
          testAdminId: adminId,
        },
      })
      const rn = generateRequestNumber(new Date(), req.id)
      await tx.rentalRequest.update({ where: { id: req.id }, data: { requestNumber: rn } })
      return rn
    })
    revalidatePath('/admin/requests')
    return { success: true, requestNumber }
  } catch (error) {
    console.error('createTestRentalRequest error:', error)
    return { success: false, error: '신청 처리 중 오류가 발생했습니다.' }
  }
}

export async function createTestClassroomRentalRequest(formData: FormData): Promise<TestRentalResult> {
  const { adminId } = await requireAdminSession()

  const classroomId = parseInt(formData.get('classroomId') as string)
  const startAt = new Date(formData.get('startAt') as string)
  const endAt = new Date(formData.get('endAt') as string)
  const applicantName = (formData.get('applicantName') as string).trim()
  const studentId = (formData.get('studentId') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const password = formData.get('password') as string
  const purpose = (formData.get('purpose') as string | null)?.trim() || null
  const isGroup = formData.get('isGroup') === 'true'
  const groupCount = isGroup ? parseInt(formData.get('groupCount') as string) || null : null
  const groupMembers = isGroup ? ((formData.get('groupMembers') as string | null)?.trim() || null) : null
  const monitorAssets = (formData.get('monitorAssets') as string | null)?.trim() || null

  if (isNaN(classroomId) || classroomId < 1) return { success: false, error: '강의실 정보가 올바르지 않습니다.' }
  if (!applicantName || !studentId || !phone || !password) return { success: false, error: '필수 항목을 모두 입력해주세요.' }
  if (password.length < 4 || password.length > 8) return { success: false, error: '비밀번호는 4~8자리여야 합니다.' }
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || startAt >= endAt) return { success: false, error: '대여 기간이 올바르지 않습니다.' }

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: { status: true },
  })
  if (!classroom || classroom.status !== 'active') return { success: false, error: '해당 강의실을 찾을 수 없습니다.' }

  // isSubmissionTimeValid, isValidStartDate 건너뜀 (테스트 전용)

  // 시간표 충돌 검증
  const timetables = await prisma.classroomTimetable.findMany({ where: { classroomId } })
  const conflict = findTimetableConflict(timetables, startAt, endAt)
  if (conflict) {
    return { success: false, error: `정규 수업 시간과 겹칩니다.` }
  }

  // 승인된 예약 중복 검증
  const isAvailable = await checkClassroomAvailability(classroomId, startAt, endAt)
  if (!isAvailable) return { success: false, error: '해당 강의실은 선택한 기간에 이미 예약되어 있습니다.' }

  try {
    const requestNumber = await prisma.$transaction(async (tx) => {
      const passwordHash = await hashPassword(password)
      const req = await tx.classroomRentalRequest.create({
        data: {
          requestNumber: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          passwordHash,
          applicantName,
          studentId,
          phone,
          classroomId,
          startAt,
          endAt,
          purpose,
          isGroup,
          groupCount,
          groupMembers,
          monitorAssets,
          isTest: true,
          testAdminId: adminId,
        },
      })
      const rn = generateClassroomRN(new Date(), req.id)
      await tx.classroomRentalRequest.update({ where: { id: req.id }, data: { requestNumber: rn } })
      return rn
    })
    revalidatePath('/admin/classroom')
    revalidatePath('/admin/requests')
    return { success: true, requestNumber }
  } catch (error) {
    console.error('createTestClassroomRentalRequest error:', error)
    return { success: false, error: '신청 처리 중 오류가 발생했습니다.' }
  }
}
