import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { RentalForm } from '@/components/rental/RentalForm'

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: { equipmentId?: string; startAt?: string; endAt?: string }
}) {
  const id = parseInt(searchParams.equipmentId ?? '')
  if (isNaN(id)) notFound()

  const equipment = await prisma.equipment.findUnique({ where: { id, status: 'active' } })
  if (!equipment) notFound()

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-base-primary mb-6">대여 신청</h1>
      <RentalForm
        equipmentId={equipment.id}
        equipmentName={equipment.name}
        defaultStartAt={searchParams.startAt}
        defaultEndAt={searchParams.endAt}
        maxQuantity={equipment.totalQuantity}
        minRentalQuantity={equipment.minRentalQuantity}
      />
    </div>
  )
}
