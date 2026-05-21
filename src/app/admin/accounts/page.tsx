import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AccountManagement } from '@/components/admin/AccountModals'

export default async function AccountsPage() {
  const session = await getServerSession(authOptions)
  const admins = await prisma.admin.findMany({
    select: { id: true, username: true, createdAt: true },
    orderBy: { id: 'asc' },
  })

  const currentAdminId = parseInt(session!.user.id)

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-[#e5e2e1]">계정 관리</h1>
      <AccountManagement admins={admins} currentAdminId={currentAdminId} />
    </div>
  )
}
