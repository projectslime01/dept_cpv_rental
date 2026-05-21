import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AvailabilityChecker } from '@/components/equipment/AvailabilityChecker'
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
  '카메라 바디': 'text-sky-600 bg-sky-50 border-sky-100',
  '렌즈': 'text-violet-600 bg-violet-50 border-violet-100',
  '영상 장비': 'text-blue-600 bg-blue-50 border-blue-100',
  '조명': 'text-amber-600 bg-amber-50 border-amber-100',
  '저장 매체': 'text-emerald-600 bg-emerald-50 border-emerald-100',
  '삼각대/지지대': 'text-slate-600 bg-slate-100 border-slate-200',
  '필터': 'text-indigo-600 bg-indigo-50 border-indigo-100',
  '배터리': 'text-orange-600 bg-orange-50 border-orange-100',
  '음향': 'text-pink-600 bg-pink-50 border-pink-100',
  '기타': 'text-gray-500 bg-gray-100 border-gray-200',
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
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <a href="/" className="hover:text-slate-600 transition-colors">기자재 목록</a>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-600 font-medium">{equipment.name}</span>
      </nav>

      {/* Equipment info card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl border ${catStyle} shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{equipment.name}</h1>
            <div className="flex items-center gap-2.5 mt-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${catStyle}`}>
                {equipment.category}
              </span>
              <span className="text-sm text-slate-400">총 {equipment.totalQuantity}개 보유</span>
            </div>
          </div>
        </div>
        {equipment.description && (
          <p className="mt-4 text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 leading-relaxed">
            {equipment.description}
          </p>
        )}
      </div>

      <AvailabilityChecker equipmentId={equipment.id} totalQuantity={equipment.totalQuantity} />
    </div>
  )
}
