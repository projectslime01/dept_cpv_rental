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
  '카메라 바디': 'text-sky-300 bg-sky-950/60 border-sky-900/60',
  '렌즈': 'text-violet-300 bg-violet-950/60 border-violet-900/60',
  '영상 장비': 'text-blue-300 bg-blue-950/60 border-blue-900/60',
  '조명': 'text-amber-300 bg-amber-950/60 border-amber-900/60',
  '저장 매체': 'text-emerald-300 bg-emerald-950/60 border-emerald-900/60',
  '삼각대/지지대': 'text-slate-300 bg-slate-800/60 border-slate-700/60',
  '필터': 'text-indigo-300 bg-indigo-950/60 border-indigo-900/60',
  '배터리': 'text-orange-300 bg-orange-950/60 border-orange-900/60',
  '음향': 'text-pink-300 bg-pink-950/60 border-pink-900/60',
  '기타': 'text-[#9b8f91] bg-[#252228] border-[#3a3640]',
}

export default async function EquipmentDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const equipment = await prisma.equipment.findUnique({ where: { id, status: 'active' } })
  if (!equipment) notFound()

  const Icon = CATEGORY_ICONS[equipment.category] ?? Package
  const catStyle = CATEGORY_STYLES[equipment.category] ?? CATEGORY_STYLES['기타']

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[#6b6468]">
        <a href="/" className="hover:text-[#9b8f91] transition-colors">기자재 목록</a>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#9b8f91] font-medium">{equipment.name}</span>
      </nav>

      {/* Equipment info card */}
      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl border ${catStyle} shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#e5e2e1] tracking-tight">{equipment.name}</h1>
            <div className="flex items-center gap-2.5 mt-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${catStyle}`}>
                {equipment.category}
              </span>
              <span className="text-sm text-[#6b6468]">총 {equipment.totalQuantity}개 보유</span>
            </div>
          </div>
          <AddToCartButton
            item={{ equipmentId: equipment.id, name: equipment.name, category: equipment.category, totalQuantity: equipment.totalQuantity }}
          />
        </div>
        {equipment.description && (
          <p className="mt-4 text-sm text-[#9b8f91] bg-[#1a191b] rounded-xl px-4 py-3 border border-[#2e2b2f] leading-relaxed">
            {equipment.description}
          </p>
        )}
      </div>

      <AvailabilityChecker equipmentId={equipment.id} totalQuantity={equipment.totalQuantity} />
    </div>
  )
}
