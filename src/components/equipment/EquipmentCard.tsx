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

// Light-mode-safe palette (semi-transparent on both modes)
const CATEGORY_STYLES: Record<string, { icon: string; badge: string }> = {
  '카메라 바디': { icon: 'text-sky-600 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60',       badge: 'text-sky-600 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 border-sky-200 dark:border-sky-900/60' },
  '렌즈':        { icon: 'text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/60', badge: 'text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/60 border-violet-200 dark:border-violet-900/60' },
  '영상 장비':   { icon: 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60',     badge: 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/60' },
  '조명':        { icon: 'text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60', badge: 'text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/60' },
  '저장 매체':   { icon: 'text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60', badge: 'text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/60' },
  '삼각대/지지대':{ icon: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60', badge: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60' },
  '필터':        { icon: 'text-indigo-600 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60', badge: 'text-indigo-600 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900/60' },
  '배터리':      { icon: 'text-orange-600 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/60', badge: 'text-orange-600 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/60 border-orange-200 dark:border-orange-900/60' },
  '음향':        { icon: 'text-pink-600 dark:text-pink-300 bg-pink-100 dark:bg-pink-950/60',     badge: 'text-pink-600 dark:text-pink-300 bg-pink-100 dark:bg-pink-950/60 border-pink-200 dark:border-pink-900/60' },
  '기타':        { icon: 'text-base-secondary bg-surface-overlay',                               badge: 'text-base-secondary bg-surface-overlay border-base' },
}

interface Props {
  id: number
  name: string
  category: string
  description: string | null
  totalQuantity: number
  minRentalQuantity: number
  maxRentalQuantity: number | null
  availableNow: number
}

export function EquipmentCard({ id, name, category, description, totalQuantity, minRentalQuantity, maxRentalQuantity, availableNow }: Props) {
  const isAvailable = availableNow > 0
  const Icon = CATEGORY_ICONS[category] ?? Package
  const styles = CATEGORY_STYLES[category] ?? CATEGORY_STYLES['기타']
  const availPct = totalQuantity > 0 ? Math.round((availableNow / totalQuantity) * 100) : 0

  return (
    <div className="group bg-surface-base rounded-2xl border border-base hover:border-strong hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${styles.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-base-primary leading-snug truncate group-hover:text-brand-rose transition-colors">
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
          <p className="text-xs text-base-faint line-clamp-1 leading-relaxed">{description}</p>
        ) : (
          <div className="h-4" />
        )}
      </div>

      {/* Availability */}
      <div className="px-4 pt-3 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-base-muted">대여 가능</span>
            {minRentalQuantity > 1 && (
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-1.5 py-0.5 rounded-full">
                최소 {minRentalQuantity}개
              </span>
            )}
            {maxRentalQuantity !== null && (
              <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/50 px-1.5 py-0.5 rounded-full">
                최대 {maxRentalQuantity}개
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-base font-black tabular-nums ${isAvailable ? 'text-emerald-500' : 'text-red-500'}`}>
              {availableNow}
            </span>
            <span className="text-xs text-base-faint">/ {totalQuantity}개</span>
          </div>
        </div>
        <div className="h-1 bg-surface-overlay rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isAvailable ? 'bg-emerald-500' : 'bg-red-400/60'}`}
            style={{ width: `${availPct}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2 border-t border-base pt-3">
        <AddToCartButton
          item={{ equipmentId: id, name, category, totalQuantity, minRentalQuantity, maxRentalQuantity }}
          disabled={!isAvailable}
        />
        {isAvailable ? (
          <Link
            href={`/equipment/${id}`}
            className="flex-1 flex items-center justify-center h-11 rounded-xl bg-[hsl(var(--accent-rose))] hover:opacity-90 text-white text-xs font-semibold transition-opacity"
          >
            상세 / 단건 신청
          </Link>
        ) : (
          <div className="flex-1 flex items-center justify-center h-11 rounded-xl bg-surface-overlay text-base-faint text-xs font-semibold cursor-not-allowed">
            대여 불가
          </div>
        )}
      </div>
    </div>
  )
}
