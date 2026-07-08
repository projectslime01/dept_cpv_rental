import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AvailabilityChecker } from '@/components/equipment/AvailabilityChecker'
import { AddToCartButton } from '@/components/cart/AddToCartButton'
import {
  Camera, Aperture, Video, Sun, HardDrive,
  Layers, Battery, Mic, Package, Grip, ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  '카메라 바디': Camera, '렌즈': Aperture, '영상 장비': Video,
  '조명': Sun, '저장 매체': HardDrive, '삼각대/지지대': Grip,
  '필터': Layers, '배터리': Battery, '음향': Mic,
}
const CATEGORY_STYLES: Record<string, string> = {
  '카메라 바디': 'text-sky-750 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950/60 dark:border-sky-900/60',
  '렌즈':        'text-violet-750 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-950/60 dark:border-violet-900/60',
  '영상 장비':   'text-blue-750 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/60 dark:border-blue-900/60',
  '조명':        'text-amber-750 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-900/60',
  '저장 매체':   'text-emerald-750 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-900/60',
  '삼각대/지지대':'text-slate-750 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-800/60 dark:border-slate-700/60',
  '필터':        'text-indigo-750 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/60 dark:border-indigo-900/60',
  '배터리':      'text-orange-750 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-950/60 dark:border-orange-900/60',
  '음향':        'text-pink-750 bg-pink-50 border-pink-200 dark:text-pink-300 dark:bg-pink-950/60 dark:border-pink-900/60',
  '기타':        'text-base-secondary bg-surface-raised border-base',
}

export default async function EquipmentDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const equipment = await prisma.equipment.findUnique({ where: { id, status: 'active' } })
  if (!equipment) notFound()

  const Icon = CATEGORY_ICONS[equipment.category] ?? Package
  const catStyle = CATEGORY_STYLES[equipment.category] ?? CATEGORY_STYLES['기타']

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-base-muted">
        <a href="/" className="hover:text-base-secondary transition-colors">기자재 목록</a>
        <ChevronRight className="w-3 h-3" />
        <span className="text-base-secondary font-medium">{equipment.name}</span>
      </nav>

      {/* Equipment info card */}
      <div className="bg-surface-base rounded-2xl border border-base p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl border ${catStyle} shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-base-primary tracking-tight">{equipment.name}</h1>
            <div className="flex flex-wrap items-center gap-2.5 mt-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${catStyle}`}>
                {equipment.category}
              </span>
              <span className="text-sm text-base-muted whitespace-nowrap">총 {equipment.totalQuantity}개 보유</span>
            </div>
          </div>
          <AddToCartButton
            item={{ equipmentId: equipment.id, name: equipment.name, category: equipment.category, totalQuantity: equipment.totalQuantity, minRentalQuantity: equipment.minRentalQuantity, maxRentalQuantity: equipment.maxRentalQuantity }}
          />
        </div>
        {equipment.description && (
          <p className="mt-4 text-sm text-base-secondary bg-surface-raised rounded-xl px-4 py-3 border border-base leading-relaxed">
            {equipment.description}
          </p>
        )}
      </div>

      <AvailabilityChecker equipmentId={equipment.id} totalQuantity={equipment.totalQuantity} />
    </div>
  )
}
