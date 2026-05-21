import { StatusLookup } from '@/components/rental/StatusLookup'
import { FileSearch } from 'lucide-react'

export default function StatusPage() {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2 pt-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 mb-2">
          <FileSearch className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">신청 조회</h1>
        <p className="text-sm text-slate-500">신청 번호와 비밀번호로 대여 현황을 확인하세요.</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <StatusLookup />
      </div>
    </div>
  )
}
