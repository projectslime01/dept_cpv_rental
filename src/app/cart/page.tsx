import { CartPageClient } from '@/components/cart/CartPageClient'
import { ClipboardList } from 'lucide-react'

export default function CartPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100">
          <ClipboardList className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">신청함</h1>
          <p className="text-sm text-muted-foreground">선택한 기자재를 확인하고 한 번에 신청하세요.</p>
        </div>
      </div>
      <CartPageClient />
    </div>
  )
}
