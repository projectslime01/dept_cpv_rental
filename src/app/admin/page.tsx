import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdminLoginForm } from '@/components/admin/AdminLoginForm'

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  // 이미 로그인된 관리자가 /admin에 접근하면 대시보드로 이동
  const session = await getServerSession(authOptions)
  if (session) redirect('/admin/dashboard')

  return <AdminLoginForm />
}
