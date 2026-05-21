import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AvailabilityChecker } from '@/components/equipment/AvailabilityChecker'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, Package } from 'lucide-react'

export default async function EquipmentDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const equipment = await prisma.equipment.findUnique({ where: { id, status: 'active' } })
  if (!equipment) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground transition-colors">기자재 목록</a>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{equipment.name}</span>
      </nav>

      {/* 기자재 정보 */}
      <div className="space-y-3">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-slate-100 shrink-0">
            <Package className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{equipment.name}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="secondary">{equipment.category}</Badge>
              <span className="text-sm text-muted-foreground">총 {equipment.totalQuantity}개 보유</span>
            </div>
          </div>
        </div>
        {equipment.description && (
          <p className="text-sm text-muted-foreground bg-slate-50 rounded-lg px-4 py-3 border">
            {equipment.description}
          </p>
        )}
      </div>

      <AvailabilityChecker equipmentId={equipment.id} totalQuantity={equipment.totalQuantity} />
    </div>
  )
}
