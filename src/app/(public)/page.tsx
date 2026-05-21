import { prisma } from '@/lib/prisma'
import { EquipmentCard } from '@/components/equipment/EquipmentCard'
import { CATEGORY_ORDER, sortByCategory } from '@/lib/categories'
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
  })
  return sortByCategory(
    equipments.map((eq) => ({
      ...eq,
      availableNow: Math.max(0, eq.totalQuantity - eq.requests.reduce((s, r) => s + r.quantity, 0)),
    }))
  )
}

async function getCategories() {
  const result = await prisma.equipment.findMany({
    where: { status: 'active' },
    select: { category: true },
    distinct: ['category'],
  })
  const found = result.map((r) => r.category)
  return CATEGORY_ORDER.filter((c) => found.includes(c))
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
      <div>
        <h1 className="text-2xl font-bold text-[#e5e2e1] tracking-tight">기자재 대여 목록</h1>
        <p className="text-sm text-[#9b8f91] mt-1">
          전체 <span className="font-semibold text-[#c8c4c3]">{equipments.length}</span>종 ·
          대여 가능 <span className="font-semibold text-emerald-400">{availableCount}</span>종
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <a
          href={searchParams.search ? `/?search=${searchParams.search}` : '/'}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
            !searchParams.category
              ? 'bg-[#ffb2ba]/15 text-[#ffb2ba] border-[#ffb2ba]/30'
              : 'bg-[#201f21] text-[#9b8f91] border-[#2e2b2f] hover:bg-[#252228] hover:text-[#e5e2e1]'
          }`}
        >
          전체
        </a>
        {categories.map((c) => {
          const active = searchParams.category === c
          const href = searchParams.search
            ? `/?category=${encodeURIComponent(c)}&search=${searchParams.search}`
            : `/?category=${encodeURIComponent(c)}`
          return (
            <a
              key={c}
              href={href}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                active
                  ? 'bg-[#ffb2ba]/15 text-[#ffb2ba] border-[#ffb2ba]/30'
                  : 'bg-[#201f21] text-[#9b8f91] border-[#2e2b2f] hover:bg-[#252228] hover:text-[#e5e2e1]'
              }`}
            >
              {c}
            </a>
          )
        })}
      </div>

      {/* Search & filter */}
      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-4">
        <form className="flex flex-wrap gap-2.5">
          {searchParams.category && (
            <input type="hidden" name="category" value={searchParams.category} />
          )}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6468] pointer-events-none" />
            <input
              name="search"
              defaultValue={searchParams.search}
              placeholder="기자재 이름 검색..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#3a3640] text-sm bg-[#1a191b] text-[#e5e2e1] placeholder:text-[#6b6468] focus:outline-none focus:border-[#7d7173] transition-colors"
            />
          </div>
          <button
            type="submit"
            className="h-10 px-5 rounded-xl bg-[#ff4f73] hover:bg-[#e03d61] text-white text-sm font-semibold transition-colors"
          >
            검색
          </button>
          {isFiltered && (
            <a
              href="/"
              className="h-10 px-4 rounded-xl border border-[#3a3640] text-sm text-[#9b8f91] hover:bg-[#252228] hover:text-[#e5e2e1] transition-colors flex items-center"
            >
              초기화
            </a>
          )}
        </form>
        {isFiltered && (
          <p className="text-xs text-[#6b6468] mt-2.5 flex items-center gap-1.5">
            <span className="font-semibold text-[#c8c4c3]">{equipments.length}개</span> 결과
            {searchParams.category && <><span>·</span><span className="font-medium text-[#c8c4c3]">{searchParams.category}</span></>}
            {searchParams.search && <><span>·</span><span className="font-medium text-[#c8c4c3]">&quot;{searchParams.search}&quot;</span></>}
          </p>
        )}
      </div>

      {/* Grid */}
      {equipments.length === 0 ? (
        <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] py-20 text-center">
          <Search className="w-10 h-10 mx-auto text-[#3a3640] mb-3" />
          <p className="text-sm font-medium text-[#6b6468]">검색 결과가 없습니다.</p>
          <a href="/" className="mt-3 inline-block text-xs text-[#ffb2ba] hover:underline">초기화</a>
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
