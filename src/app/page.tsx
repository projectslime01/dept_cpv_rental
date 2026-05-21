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
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">기자재 대여 목록</h1>
        <p className="text-sm text-muted-foreground mt-1">영상콘텐츠과 보유 기자재를 확인하고 대여를 신청하세요.</p>
      </div>

      {/* 검색 + 필터 */}
      <form className="bg-slate-50 border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              name="search"
              defaultValue={searchParams.search}
              placeholder="기자재 이름 검색..."
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <select
            name="category"
            defaultValue={searchParams.category ?? ''}
            className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">전체 카테고리</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button type="submit" className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
            검색
          </button>
          {(searchParams.search || searchParams.category) && (
            <a href="/" className="px-4 py-2 border rounded-lg text-sm hover:bg-white transition-colors text-muted-foreground">
              초기화
            </a>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {equipments.length}개 항목
          {searchParams.category && <> · <span className="font-medium text-slate-700">{searchParams.category}</span></>}
          {searchParams.search && <> · "<span className="font-medium text-slate-700">{searchParams.search}</span>"</>}
        </p>
      </form>

      {/* 기자재 그리드 */}
      {equipments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>검색 결과가 없습니다.</p>
        </div>
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
