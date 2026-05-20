import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AvailabilityChecker } from '@/components/equipment/AvailabilityChecker'

export default async function EquipmentDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const equipment = await prisma.equipment.findUnique({ where: { id, status: 'active' } })
  if (!equipment) notFound()

  return (
    <div className="max-w-2xl">
      <div className="mb-2 text-sm text-muted-foreground">
        <a href="/">목록</a> &rsaquo; {equipment.name}
      </div>
      <h1 className="text-2xl font-bold mb-1">{equipment.name}</h1>
      <p className="text-sm text-muted-foreground mb-4">{equipment.category} · 총 {equipment.totalQuantity}개 보유</p>
      {equipment.description && <p className="mb-6">{equipment.description}</p>}
      <AvailabilityChecker equipmentId={equipment.id} totalQuantity={equipment.totalQuantity} />
    </div>
  )
}
