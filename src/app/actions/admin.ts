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
  await prisma.rentalRequest.update({
    where: { id, status: 'pending' },
    data: { status: 'approved', adminNote: note || null },
  })
  revalidatePath('/admin/requests')
}

export async function rejectRequest(id: number, note: string) {
  await requireAdmin()
  await prisma.rentalRequest.update({
    where: { id, status: 'pending' },
    data: { status: 'rejected', adminNote: note },
  })
  revalidatePath('/admin/requests')
}

export async function markReturned(id: number) {
  await requireAdmin()
  await prisma.rentalRequest.update({
    where: { id, status: 'approved' },
    data: { status: 'returned', returnedAt: new Date() },
  })
  revalidatePath('/admin/requests')
  revalidatePath('/admin/dashboard')
}

export async function createEquipment(formData: FormData) {
  await requireAdmin()
  await prisma.equipment.create({
    data: {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      description: (formData.get('description') as string) || null,
      totalQuantity: parseInt(formData.get('totalQuantity') as string),
    },
  })
  revalidatePath('/admin/equipment')
}

export async function updateEquipment(id: number, formData: FormData) {
  await requireAdmin()
  await prisma.equipment.update({
    where: { id },
    data: {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      description: (formData.get('description') as string) || null,
      totalQuantity: parseInt(formData.get('totalQuantity') as string),
    },
  })
  revalidatePath('/admin/equipment')
}

export async function deactivateEquipment(id: number) {
  await requireAdmin()
  await prisma.equipment.update({
    where: { id },
    data: { status: 'inactive' },
  })
  revalidatePath('/admin/equipment')
}

export async function activateEquipment(id: number) {
  await requireAdmin()
  await prisma.equipment.update({
    where: { id },
    data: { status: 'active' },
  })
  revalidatePath('/admin/equipment')
}

export async function approveClassroomRequest(id: number, note?: string) {
  await requireAdmin()
  await prisma.classroomRentalRequest.update({
    where: { id, status: 'pending' },
    data: { status: 'approved', adminNote: note || null },
  })
  revalidatePath('/admin/requests')
  revalidatePath('/admin/dashboard')
}

export async function rejectClassroomRequest(id: number, note: string) {
  await requireAdmin()
  await prisma.classroomRentalRequest.update({
    where: { id, status: 'pending' },
    data: { status: 'rejected', adminNote: note },
  })
  revalidatePath('/admin/requests')
  revalidatePath('/admin/dashboard')
}

export async function markClassroomReturned(id: number) {
  await requireAdmin()
  await prisma.classroomRentalRequest.update({
    where: { id, status: 'approved' },
    data: { status: 'returned', returnedAt: new Date() },
  })
  revalidatePath('/admin/requests')
  revalidatePath('/admin/dashboard')
}

