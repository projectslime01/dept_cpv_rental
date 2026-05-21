import Link from 'next/link'
import { AddToCartButton } from '@/components/cart/AddToCartButton'
import {
  Camera, Aperture, Video, Sun, HardDrive,
  Layers, Battery, Mic, Package, Grip,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  '카메라 바디': Camera,
  '렌즈': Aperture,
  '영상 장비': Video,
  '조명': Sun,
  '저장 매체': HardDrive,
  '삼각대/지지대': Grip,
  '필터': Layers,
  '배터리': Battery,
  '음향': Mic,
}

const CATEGORY_STYLES: Record<string, { icon: string; badge: string }> = {
  '카메라 바디': { icon: 'text-sky-600 bg-sky-50',    badge: 'text-sky-700 bg-sky-50 border-sky-200' },
  '렌즈':        { icon: 'text-violet-600 bg-violet-50', badge: 'text-violet-700 bg-violet-50 border-violet-200' },
  '영상 장비':   { icon: 'text-blue-600 bg-blue-50',   badge: 'text-blue-700 bg-blue-50 border-blue-200' },
  '조명':        { icon: 'text-amber-600 bg-amber-50',  badge: 'text-amber-700 bg-amber-50 border-amber-200' },
  '저장 매체':   { icon: 'text-emerald-600 bg-emerald-50', badge: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  '삼각대/지지대':{ icon: 'text-slate-600 bg-slate-100', badge: 'text-slate-700 bg-slate-100 border-slate-200' },
  '필터':        { icon: 'text-indigo-600 bg-indigo-50', badge: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  '배터리':      { icon: 'text-orange-600 bg-orange-50', badge: 'text-orange-700 bg-orange-50 border-orange-200' },
  '음향':        { icon: 'text-pink-600 bg-pink-50',   badge: 'text-pink-700 bg-pink-50 border-pink-200' },
  '기타':        { icon: 'text-gray-500 bg-gray-100',  badge: 'text-gray-600 bg-gray-100 border-gray-200' },
}

interface Props {
  id: number
  name: string
  category: string
  description: string | null
  totalQuantity: number
  availableNow: number
}

export function EquipmentCard({ id, name, category, description, totalQuantity, availableNow }: Props) {
  const isAvailable = availableNow > 0
  const Icon = CATEGORY_ICONS[category] ?? Package
  const styles = CATEGORY_STYLES[category] ?? CATEGORY_STYLES['기타']
  const availPct = totalQuantity > 0 ? Math.round((availableNow / totalQuantity) * 100) : 0

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${styles.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 leading-snug truncate group-hover:text-sky-600 transition-colors">
            {name}
          </h3>
          <span className={`inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${styles.badge}`}>
            {category}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 flex-1">
        {description ? (
          <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed">{description}</p>
        ) : (
          <div className="h-4" />
        )}
      </div>

      {/* Availability */}
      <div className="px-4 pt-3 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">대여 가능</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-base font-black tabular-nums ${isAvailable ? 'text-emerald-500' : 'text-red-400'}`}>
              {availableNow}
            </span>
            <span className="text-xs text-slate-300">/ {totalQuantity}개</span>
          </div>
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isAvailable ? 'bg-emerald-400' : 'bg-red-300'}`}
            style={{ width: `${availPct}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2 border-t border-slate-50 pt-3">
        <AddToCartButton
          item={{ equipmentId: id, name, category, totalQuantity }}
          disabled={!isAvailable}
        />
        {isAvailable ? (
          <Link
            href={`/equipment/${id}`}
            className="flex-1 flex items-center justify-center h-9 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            상세 / 단건 신청
          </Link>
        ) : (
          <div className="flex-1 flex items-center justify-center h-9 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed">
            대여 불가
          </div>
        )}
      </div>
    </div>
  )
}
