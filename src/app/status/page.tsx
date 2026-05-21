import { StatusLookup } from '@/components/rental/StatusLookup'
import { FileSearch } from 'lucide-react'

export default function StatusPage() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-1">
          <FileSearch className="w-6 h-6 text-slate-600" />
        </div>
        <h1 className="text-2xl font-bold">신청 조회</h1>
        <p className="text-sm text-muted-foreground">신청 번호와 조회용 비밀번호로 대여 현황을 확인하세요.</p>
      </div>
      <div className="border rounded-xl p-6 bg-white shadow-sm">
        <StatusLookup />
      </div>
    </div>
  )
}
