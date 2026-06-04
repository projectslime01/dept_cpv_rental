import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AccountManagement } from '@/components/admin/AccountModals'
import { redirect } from 'next/navigation'

export default async function AccountsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/admin')
  }

  const admins = await prisma.admin.findMany({
    select: { id: true, username: true, name: true, createdAt: true },
    orderBy: { id: 'asc' },
  })

  const currentAdminId = parseInt(session.user.id)

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-base-primary">계정 관리</h1>
      <AccountManagement admins={admins} currentAdminId={currentAdminId} />
    </div>
  )
}
