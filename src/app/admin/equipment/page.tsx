import { prisma } from '@/lib/prisma'
import { Package } from 'lucide-react'
import { CreateEquipmentButton, EquipmentActions } from '@/components/admin/EquipmentForm'
import { CATEGORY_ORDER, sortByCategory } from '@/lib/categories'

export default async function AdminEquipmentPage({
  searchParams,
}: {
  searchParams: { category?: string }
}) {
  const now = new Date()
  const categoryFilter = searchParams.category && searchParams.category !== 'all'
    ? searchParams.category : undefined

  const equipments = await prisma.equipment.findMany({
    where: categoryFilter ? { category: categoryFilter } : {},
    include: {
      requests: {
        where: { status: 'approved', startAt: { lte: now }, endAt: { gte: now } },
        select: { quantity: true },
      },
    },
  })

  const stats = sortByCategory(
    equipments.map((eq) => ({
      ...eq,
      rentedNow: eq.requests.reduce((s, r) => s + r.quantity, 0),
      availableNow: Math.max(0, eq.totalQuantity - eq.requests.reduce((s, r) => s + r.quantity, 0)),
    }))
  )

  // Get only categories that exist in DB, in CATEGORY_ORDER
  const allEquipment = await prisma.equipment.findMany({ select: { category: true }, distinct: ['category'] })
  const existingCategories = allEquipment.map(e => e.category)
  const categories = CATEGORY_ORDER.filter(c => existingCategories.includes(c))

  const current = searchParams.category ?? 'all'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#e5e2e1]">기자재 관리</h1>
        <CreateEquipmentButton />
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-1.5 flex-wrap">
        <a
          href="/admin/equipment"
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
            current === 'all'
              ? 'bg-[#ffb2ba]/15 text-[#ffb2ba] border-[#ffb2ba]/30'
              : 'bg-[#201f21] text-[#9b8f91] border-[#2e2b2f] hover:bg-[#252228] hover:text-[#e5e2e1]'
          }`}
        >
          전체
        </a>
        {categories.map((c) => (
          <a
            key={c}
            href={`/admin/equipment?category=${encodeURIComponent(c)}`}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              current === c
                ? 'bg-[#ffb2ba]/15 text-[#ffb2ba] border-[#ffb2ba]/30'
                : 'bg-[#201f21] text-[#9b8f91] border-[#2e2b2f] hover:bg-[#252228] hover:text-[#e5e2e1]'
            }`}
          >
            {c}
          </a>
        ))}
      </div>

      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#252228]">
          <Package className="w-4 h-4 text-[#6b6468]" />
          <h2 className="text-sm font-semibold text-[#c8c4c3]">
            {categoryFilter ? categoryFilter : '전체'} 기자재
          </h2>
          <span className="ml-auto text-xs text-[#6b6468]">{stats.length}종</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-[#252228] border-b border-[#2e2b2f]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">기자재명</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">카테고리</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">전체</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">대여 중</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">대여 가능</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">상태</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6468] whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252228]">
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-[#6b6468]">기자재가 없습니다.</td>
                </tr>
              ) : stats.map((eq) => (
                <tr key={eq.id} className="hover:bg-[#252228] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#e5e2e1]">{eq.name}</td>
                  <td className="px-4 py-3 text-[#9b8f91] text-xs">{eq.category}</td>
                  <td className="px-4 py-3 text-center text-[#9b8f91]">{eq.totalQuantity}</td>
                  <td className="px-4 py-3 text-center text-[#ffb2ba] font-medium">{eq.rentedNow}</td>
                  <td className={`px-4 py-3 text-center font-bold ${eq.availableNow > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {eq.availableNow}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      eq.status === 'active'
                        ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50'
                        : 'bg-[#252228] text-[#6b6468] border-[#3a3640]'
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
