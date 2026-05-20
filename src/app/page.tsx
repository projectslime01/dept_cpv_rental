import { prisma } from '@/lib/prisma'
import { EquipmentCard } from '@/components/equipment/EquipmentCard'

async function getEquipmentList(category?: string, search?: string) {
  const now = new Date()
  const equipments = await prisma.equipment.findMany({
    where: {
      status: 'active',
      ...(category ? { category } : {}),
      ...(search ? { name: { contains: search } } : {}),
    },
    include: {
      requests: {
        where: {
          status: 'approved',
          startAt: { lte: now },
          endAt: { gte: now },
        },
        select: { quantity: true },
      },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  return equipments.map((eq) => ({
    ...eq,
    availableNow: Math.max(0, eq.totalQuantity - eq.requests.reduce((s, r) => s + r.quantity, 0)),
  }))
}

async function getCategories() {
  const result = await prisma.equipment.findMany({
    where: { status: 'active' },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  })
  return result.map((r) => r.category)
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { category?: string; search?: string }
}) {
  const [equipments, categories] = await Promise.all([
    getEquipmentList(searchParams.category, searchParams.search),
    getCategories(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">기자재 대여 목록</h1>

      {/* 검색 + 필터 */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input
          name="search"
          defaultValue={searchParams.search}
          placeholder="기자재 검색..."
          className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />
        <select
          name="category"
          defaultValue={searchParams.category ?? ''}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">전체 카테고리</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="submit" className="bg-primary text-primary-foreground px-4 py-1.5 rounded text-sm">
          검색
        </button>
      </form>

      {/* 기자재 그리드 */}
      {equipments.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">기자재가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipments.map((eq) => (
            <EquipmentCard key={eq.id} {...eq} />
          ))}
        </div>
      )}
    </div>
  )
}
