import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
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

const CATEGORY_COLORS: Record<string, string> = {
  '카메라 바디': 'text-sky-600 bg-sky-50',
  '렌즈': 'text-violet-600 bg-violet-50',
  '영상 장비': 'text-blue-600 bg-blue-50',
  '조명': 'text-amber-600 bg-amber-50',
  '저장 매체': 'text-emerald-600 bg-emerald-50',
  '삼각대/지지대': 'text-slate-600 bg-slate-100',
  '필터': 'text-indigo-600 bg-indigo-50',
  '배터리': 'text-orange-600 bg-orange-50',
  '음향': 'text-pink-600 bg-pink-50',
  '기타': 'text-gray-600 bg-gray-100',
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
  const colorClass = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['기타']
  const availPct = totalQuantity > 0 ? Math.round((availableNow / totalQuantity) * 100) : 0

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colorClass} shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold leading-snug truncate group-hover:text-sky-700 transition-colors">
              {name}
            </CardTitle>
            <span className="text-xs text-muted-foreground mt-0.5 block">{category}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3 space-y-3">
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">대여 가능</span>
            <span>
              <span className={`font-bold text-sm ${isAvailable ? 'text-green-600' : 'text-red-500'}`}>
                {availableNow}
              </span>
              <span className="text-muted-foreground"> / {totalQuantity}개</span>
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${isAvailable ? 'bg-green-500' : 'bg-red-400'}`}
              style={{ width: `${availPct}%` }}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          asChild={isAvailable}
          size="sm"
          className="w-full"
          variant={isAvailable ? 'default' : 'secondary'}
          disabled={!isAvailable}
        >
          {isAvailable ? (
            <Link href={`/equipment/${id}`}>상세 보기 / 신청</Link>
          ) : (
            <span>대여 불가</span>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
