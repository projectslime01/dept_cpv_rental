'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
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


