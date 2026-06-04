'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/password'
import { revalidatePath } from 'next/cache'

type Result = { success: true } | { success: false; error: string }

// ── 계정 생성 ─────────────────────────────────────────────────────────────────

export async function createAdminAccount(formData: FormData): Promise<Result> {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: '인증이 필요합니다.' }

  const username = (formData.get('username') as string ?? '').trim().toLowerCase()
  const password = (formData.get('password') as string ?? '')
  const name = (formData.get('name') as string ?? '').trim()

  if (!username || username.length < 3 || username.length > 20) {
    return { success: false, error: '아이디는 3~20자리여야 합니다.' }
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return { success: false, error: '아이디는 영문 소문자, 숫자, _만 사용 가능합니다.' }
  }
  if (!password || password.length < 6 || password.length > 20) {
    return { success: false, error: '비밀번호는 6~20자리여야 합니다.' }
  }
  if (!name || name.length < 2 || name.length > 20) {
    return { success: false, error: '이름은 2~20자리여야 합니다.' }
  }

  const existing = await prisma.admin.findUnique({ where: { username } })
  if (existing) return { success: false, error: '이미 사용 중인 아이디입니다.' }

  const passwordHash = await hashPassword(password)
  await prisma.admin.create({ data: { username, passwordHash, name } })
  revalidatePath('/admin/accounts')
  return { success: true }
}

// ── 계정 삭제 ─────────────────────────────────────────────────────────────────

export async function deleteAdminAccount(id: number): Promise<Result> {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: '인증이 필요합니다.' }

  if (String(id) === session.user.id) {
    return { success: false, error: '자신의 계정은 삭제할 수 없습니다.' }
  }

  const count = await prisma.admin.count()
  if (count <= 1) {
    return { success: false, error: '마지막 관리자 계정은 삭제할 수 없습니다.' }
  }

  await prisma.admin.delete({ where: { id } })
  revalidatePath('/admin/accounts')
  return { success: true }
}

// ── 비밀번호 변경 (본인만) ────────────────────────────────────────────────────

export async function changeAdminPassword(formData: FormData): Promise<Result> {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: '인증이 필요합니다.' }

  const currentPassword = (formData.get('currentPassword') as string ?? '')
  const newPassword = (formData.get('newPassword') as string ?? '')

  if (!newPassword || newPassword.length < 6 || newPassword.length > 20) {
    return { success: false, error: '새 비밀번호는 6~20자리여야 합니다.' }
  }

  const admin = await prisma.admin.findUnique({ where: { id: parseInt(session.user.id) } })
  if (!admin) return { success: false, error: '계정을 찾을 수 없습니다.' }

  const valid = await verifyPassword(currentPassword, admin.passwordHash)
  if (!valid) return { success: false, error: '현재 비밀번호가 올바르지 않습니다.' }

  const passwordHash = await hashPassword(newPassword)
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } })
  return { success: true }
}
