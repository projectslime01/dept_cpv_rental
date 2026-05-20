import { StatusLookup } from '@/components/rental/StatusLookup'

export default function StatusPage() {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">신청 조회</h1>
      <StatusLookup />
    </div>
  )
}
