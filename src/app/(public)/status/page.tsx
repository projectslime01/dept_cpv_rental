import { StatusLookup } from '@/components/rental/StatusLookup'
import { FileSearch } from 'lucide-react'

export default function StatusPage() {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2 pt-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#ffb2ba]/15 border border-[#ffb2ba]/25 mb-2">
          <FileSearch className="w-5 h-5 text-[#ffb2ba]" />
        </div>
        <h1 className="text-2xl font-bold text-[#e5e2e1] tracking-tight">신청 조회</h1>
        <p className="text-sm text-[#9b8f91]">신청 번호와 비밀번호로 대여 현황을 확인하세요.</p>
      </div>
      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-6">
        <StatusLookup />
      </div>
    </div>
  )
}
