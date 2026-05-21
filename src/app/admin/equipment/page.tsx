import { prisma } from '@/lib/prisma'
import { Package } from 'lucide-react'
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">기자재 관리</h1>
        <CreateEquipmentButton />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-50">
          <Package className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">기자재 목록</h2>
          <span className="ml-auto text-xs text-slate-400">{stats.length}종</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">기자재명</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">카테고리</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">전체</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">대여 중</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">대여 가능</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">상태</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.map((eq) => (
                <tr key={eq.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{eq.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{eq.category}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{eq.totalQuantity}</td>
                  <td className="px-4 py-3 text-center text-sky-600 font-medium">{eq.rentedNow}</td>
                  <td className={`px-4 py-3 text-center font-bold ${eq.availableNow > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {eq.availableNow}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      eq.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {eq.status === 'active' ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <EquipmentActions equipment={eq} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
