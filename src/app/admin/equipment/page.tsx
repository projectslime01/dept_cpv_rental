import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { CreateEquipmentButton, EquipmentActions } from '@/components/admin/EquipmentForm'

export default async function AdminEquipmentPage() {
  const now = new Date()
  const equipments = await prisma.equipment.findMany({
    include: {
      requests: {
        where: { status: 'approved', startAt: { lte: now }, endAt: { gte: now } },
        select: { quantity: true },
      },
    },
    orderBy: [{ status: 'asc' }, { category: 'asc' }, { name: 'asc' }],
  })

  const stats = equipments.map((eq) => ({
    ...eq,
    rentedNow: eq.requests.reduce((s, r) => s + r.quantity, 0),
    availableNow: Math.max(0, eq.totalQuantity - eq.requests.reduce((s, r) => s + r.quantity, 0)),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">기자재 관리</h1>
        <CreateEquipmentButton />
      </div>

      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">기자재명</th>
              <th className="text-left p-3">카테고리</th>
              <th className="text-center p-3">전체</th>
              <th className="text-center p-3">대여 중</th>
              <th className="text-center p-3">대여 가능</th>
              <th className="text-center p-3">상태</th>
              <th className="text-center p-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((eq) => (
              <tr key={eq.id} className="border-t hover:bg-slate-50">
                <td className="p-3">{eq.name}</td>
                <td className="p-3 text-muted-foreground">{eq.category}</td>
                <td className="p-3 text-center">{eq.totalQuantity}</td>
                <td className="p-3 text-center text-blue-600">{eq.rentedNow}</td>
                <td className={`p-3 text-center font-medium ${eq.availableNow > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {eq.availableNow}
                </td>
                <td className="p-3 text-center">
                  <Badge variant={eq.status === 'active' ? 'default' : 'secondary'}>
                    {eq.status === 'active' ? '활성' : '비활성'}
                  </Badge>
                </td>
                <td className="p-3 text-center">
                  <EquipmentActions equipment={eq} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
