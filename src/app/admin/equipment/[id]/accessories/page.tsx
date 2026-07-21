import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { EquipmentAccessoryManager } from '@/components/admin/EquipmentAccessoryManager'
import { ChevronLeft, Package } from 'lucide-react'

export default async function EquipmentAccessoriesPage({
  params,
}: {
  params: { id: string }
}) {
  const equipmentId = parseInt(params.id)
  if (isNaN(equipmentId)) notFound()

  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { id: true, name: true, category: true },
  })
  if (!equipment) notFound()

  const accessories = await prisma.equipmentAccessory.findMany({
    where: { equipmentId },
    orderBy: { id: 'asc' },
  })

  const initialEntries = accessories.map((a) => ({
    id: a.id,
    equipmentId: a.equipmentId,
    name: a.name,
    description: a.description,
    totalQuantity: a.totalQuantity,
    sharedStockKey: a.sharedStockKey,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-5 max-w-3xl">
      {/* 브레드크럼 */}
      <div className="flex items-center gap-2 text-sm text-base-secondary">
        <Link
          href="/admin/equipment"
          className="inline-flex items-center gap-1 hover:text-base-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          기자재 관리
        </Link>
        <span>/</span>
        <span className="text-base-primary font-medium">{equipment.name}</span>
        <span>/</span>
        <span className="text-base-primary font-medium">부속 관리</span>
      </div>

      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-rose-muted flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-brand-rose" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-base-primary">{equipment.name}</h1>
          <p className="text-sm text-base-secondary">부속 기자재 관리</p>
        </div>
      </div>

      <EquipmentAccessoryManager
        equipmentId={equipmentId}
        initialEntries={initialEntries}
      />
    </div>
  )
}
