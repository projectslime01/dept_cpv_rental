import { prisma } from '@/lib/prisma'
import { EquipmentCard } from '@/components/equipment/EquipmentCard'
import { CATEGORY_ORDER, sortByCategory } from '@/lib/categories'
import { Search } from 'lucide-react'

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
        <h1 className="text-2xl font-bold text-base-primary tracking-tight">기자재 대여 목록</h1>
        <p className="text-sm text-base-muted mt-1">
          전체 <span className="font-semibold text-base-secondary">{equipments.length}</span>종 ·
          대여 가능 <span className="font-semibold text-emerald-500">{availableCount}</span>종
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <a
          href={searchParams.search ? `/?search=${searchParams.search}` : '/'}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
            !searchParams.category
              ? 'bg-brand-rose-muted text-brand-rose border-brand-rose'
              : 'bg-surface-raised text-base-muted border-base hover:bg-surface-overlay hover:text-base-primary'
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
                  ? 'bg-brand-rose-muted text-brand-rose border-brand-rose'
                  : 'bg-surface-raised text-base-muted border-base hover:bg-surface-overlay hover:text-base-primary'
              }`}
            >
              {c}
            </a>
          )
        })}
      </div>

      {/* Search & filter */}
      <div className="bg-surface-base rounded-2xl border border-base p-4">
        <form className="flex flex-wrap gap-2.5">
          {searchParams.category && (
            <input type="hidden" name="category" value={searchParams.category} />
          )}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-faint pointer-events-none" />
            <input
              name="search"
              defaultValue={searchParams.search}
              placeholder="기자재 이름 검색..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-base text-sm bg-surface-raised text-base-primary placeholder:text-base-faint focus:outline-none focus:border-strong transition-colors"
            />
          </div>
          <button
            type="submit"
            className="h-10 px-5 rounded-xl bg-[hsl(var(--accent-rose))] hover:opacity-90 text-white text-sm font-semibold transition-opacity"
          >
            검색
          </button>
          {isFiltered && (
            <a
              href="/"
              className="h-10 px-4 rounded-xl border border-base text-sm text-base-secondary hover:bg-surface-raised hover:text-base-primary transition-colors flex items-center"
            >
              초기화
            </a>
          )}
        </form>
        {isFiltered && (
          <p className="text-xs text-base-faint mt-2.5 flex items-center gap-1.5">
            <span className="font-semibold text-base-secondary">{equipments.length}개</span> 결과
            {searchParams.category && <><span>·</span><span className="font-medium text-base-secondary">{searchParams.category}</span></>}
            {searchParams.search && <><span>·</span><span className="font-medium text-base-secondary">&quot;{searchParams.search}&quot;</span></>}
          </p>
        )}
      </div>

      {/* Grid */}
      {equipments.length === 0 ? (
        <div className="bg-surface-base rounded-2xl border border-base py-20 text-center">
          <Search className="w-10 h-10 mx-auto text-base-faint mb-3" />
          <p className="text-sm font-medium text-base-muted">검색 결과가 없습니다.</p>
          <a href="/" className="mt-3 inline-block text-xs text-brand-rose hover:underline">초기화</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
          {equipments.map((eq) => (
            <EquipmentCard key={eq.id} {...eq} />
          ))}
        </div>
      )}
    </div>
  )
}
