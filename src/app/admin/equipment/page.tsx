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

  // 이미 로드된 데이터에서 카테고리 추출 — 별도 DB 쿼리 불필요
  // (필터링된 경우엔 전체 카테고리 목록을 가져와야 하므로 별도 쿼리 필요)
  const allCategories = categoryFilter
    ? await prisma.equipment.findMany({ select: { category: true }, distinct: ['category'] }).then(r => r.map(e => e.category))
    : Array.from(new Set(equipments.map(e => e.category)))
  const categories = CATEGORY_ORDER.filter(c => allCategories.includes(c))

  const current = searchParams.category ?? 'all'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-base-primary">기자재 관리</h1>
        <CreateEquipmentButton />
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-1.5 flex-wrap">
        <a
          href="/admin/equipment"
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
            current === 'all'
              ? 'bg-brand-rose-muted text-brand-rose border-brand-rose'
              : 'bg-surface-raised text-base-muted border-base hover:bg-surface-overlay hover:text-base-primary'
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
                ? 'bg-brand-rose-muted text-brand-rose border-brand-rose'
                : 'bg-surface-raised text-base-muted border-base hover:bg-surface-overlay hover:text-base-primary'
            }`}
          >
            {c}
          </a>
        ))}
      </div>

      <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-subtle">
          <Package className="w-4 h-4 text-base-muted" />
          <h2 className="text-sm font-semibold text-base-secondary">
            {categoryFilter ? categoryFilter : '전체'} 기자재
          </h2>
          <span className="ml-auto text-xs text-base-muted">{stats.length}종</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-surface-raised border-b border-base">
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">기자재명</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">카테고리</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">전체</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">대여 중</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">대여 가능</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">상태</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border-subtle))]">
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-base-muted">기자재가 없습니다.</td>
                </tr>
              ) : stats.map((eq) => (
                <tr key={eq.id} className="hover:bg-surface-raised transition-colors">
                  <td className="px-4 py-3 font-medium text-base-primary">{eq.name}</td>
                  <td className="px-4 py-3 text-base-muted text-xs">{eq.category}</td>
                  <td className="px-4 py-3 text-center text-base-secondary">{eq.totalQuantity}</td>
                  <td className="px-4 py-3 text-center text-brand-rose font-medium">{eq.rentedNow}</td>
                  <td className={`px-4 py-3 text-center font-bold ${eq.availableNow > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {eq.availableNow}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      eq.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-surface-raised text-base-muted border-base'
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
