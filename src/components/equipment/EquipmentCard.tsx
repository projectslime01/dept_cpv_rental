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
  '카메라 바디': { icon: 'text-sky-300 bg-sky-950/60',       badge: 'text-sky-300 bg-sky-950/60 border-sky-900/60' },
  '렌즈':        { icon: 'text-violet-300 bg-violet-950/60', badge: 'text-violet-300 bg-violet-950/60 border-violet-900/60' },
  '영상 장비':   { icon: 'text-blue-300 bg-blue-950/60',     badge: 'text-blue-300 bg-blue-950/60 border-blue-900/60' },
  '조명':        { icon: 'text-amber-300 bg-amber-950/60',   badge: 'text-amber-300 bg-amber-950/60 border-amber-900/60' },
  '저장 매체':   { icon: 'text-emerald-300 bg-emerald-950/60', badge: 'text-emerald-300 bg-emerald-950/60 border-emerald-900/60' },
  '삼각대/지지대':{ icon: 'text-slate-300 bg-slate-800/60',  badge: 'text-slate-300 bg-slate-800/60 border-slate-700/60' },
  '필터':        { icon: 'text-indigo-300 bg-indigo-950/60', badge: 'text-indigo-300 bg-indigo-950/60 border-indigo-900/60' },
  '배터리':      { icon: 'text-orange-300 bg-orange-950/60', badge: 'text-orange-300 bg-orange-950/60 border-orange-900/60' },
  '음향':        { icon: 'text-pink-300 bg-pink-950/60',     badge: 'text-pink-300 bg-pink-950/60 border-pink-900/60' },
  '기타':        { icon: 'text-[#9b8f91] bg-[#252228]',     badge: 'text-[#9b8f91] bg-[#252228] border-[#3a3640]' },
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
    <div className="group bg-[#201f21] rounded-2xl border border-[#2e2b2f] hover:border-[#3a3640] hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${styles.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#e5e2e1] leading-snug truncate group-hover:text-[#ffb2ba] transition-colors">
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
          <p className="text-xs text-[#6b6468] line-clamp-1 leading-relaxed">{description}</p>
        ) : (
          <div className="h-4" />
        )}
      </div>

      {/* Availability */}
      <div className="px-4 pt-3 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#6b6468]">대여 가능</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-base font-black tabular-nums ${isAvailable ? 'text-emerald-400' : 'text-red-400'}`}>
              {availableNow}
            </span>
            <span className="text-xs text-[#4a4448]">/ {totalQuantity}개</span>
          </div>
        </div>
        <div className="h-1 bg-[#2a282b] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isAvailable ? 'bg-emerald-500' : 'bg-red-500/60'}`}
            style={{ width: `${availPct}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2 border-t border-[#252228] pt-3">
        <AddToCartButton
          item={{ equipmentId: id, name, category, totalQuantity }}
          disabled={!isAvailable}
        />
        {isAvailable ? (
          <Link
            href={`/equipment/${id}`}
            className="flex-1 flex items-center justify-center h-11 rounded-xl bg-[#ff4f73] hover:bg-[#e03d61] text-white text-xs font-semibold transition-colors"
          >
            상세 / 단건 신청
          </Link>
        ) : (
          <div className="flex-1 flex items-center justify-center h-11 rounded-xl bg-[#252228] text-[#4a4448] text-xs font-semibold cursor-not-allowed">
            대여 불가
          </div>
        )}
      </div>
    </div>
  )
}
