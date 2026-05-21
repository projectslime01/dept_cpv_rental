import { prisma } from '@/lib/prisma'
import { EquipmentCard } from '@/components/equipment/EquipmentCard'
import { Search, SlidersHorizontal } from 'lucide-react'

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
        where: { status: 'approved', startAt: { lte: now }, endAt: { gte: now } },
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

export default async function HomePage({ searchParams }: { searchParams: { category?: string; search?: string } }) {
  const [equipments, categories] = await Promise.all([
    getEquipmentList(searchParams.category, searchParams.search),
    getCategories(),
  ])

  const availableCount = equipments.filter(e => e.availableNow > 0).length
  const isFiltered = !!(searchParams.search || searchParams.category)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">기자재 대여 목록</h1>
          <p className="text-sm text-slate-500 mt-1">
            전체 <span className="font-semibold text-slate-700">{equipments.length}</span>종 ·
            대여 가능 <span className="font-semibold text-emerald-600">{availableCount}</span>종
          </p>
        </div>
      </div>

      {/* Search & filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <form className="flex flex-wrap gap-2.5">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              name="search"
              defaultValue={searchParams.search}
              placeholder="기자재 이름 검색..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
            />
          </div>
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              name="category"
              defaultValue={searchParams.category ?? ''}
              className="h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-700 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors appearance-none cursor-pointer min-w-[140px]"
            >
              <option value="">전체 카테고리</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-10 px-5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            검색
          </button>
          {isFiltered && (
            <a
              href="/"
              className="h-10 px-4 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors flex items-center"
            >
              초기화
            </a>
          )}
        </form>
        {isFiltered && (
          <p className="text-xs text-slate-400 mt-2.5 flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">{equipments.length}개</span> 결과
            {searchParams.category && <><span>·</span><span className="font-medium text-slate-600">{searchParams.category}</span></>}
            {searchParams.search && <><span>·</span><span className="font-medium text-slate-600">&quot;{searchParams.search}&quot;</span></>}
          </p>
        )}
      </div>

      {/* Grid */}
      {equipments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-20 text-center">
          <Search className="w-10 h-10 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-medium text-slate-400">검색 결과가 없습니다.</p>
          <a href="/" className="mt-3 inline-block text-xs text-sky-500 hover:underline">초기화</a>
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
