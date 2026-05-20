import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

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
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{name}</CardTitle>
          <Badge variant={isAvailable ? 'default' : 'secondary'}>
            {category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <p className="text-sm mt-2">
          <span className="font-medium">대여 가능:</span>{' '}
          <span className={isAvailable ? 'text-green-600 font-bold' : 'text-red-500'}>
            {availableNow}
          </span>
          <span className="text-muted-foreground"> / {totalQuantity}개</span>
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild size="sm" className="w-full" disabled={!isAvailable}>
          <Link href={`/equipment/${id}`}>
            {isAvailable ? '상세 보기 / 신청' : '대여 불가'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
