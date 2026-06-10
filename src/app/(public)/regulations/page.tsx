import { Metadata } from 'next'
import { FileText } from 'lucide-react'
import { RegulationViewer } from '@/components/regulations/RegulationViewer'

export const metadata: Metadata = {
  title: '대여 규정 | 연성대학교 영상콘텐츠과 기자재 대여',
  description: '영상콘텐츠과 기자재 및 강의실 대여 규정을 확인하세요.',
}

const REGULATION_FILES = [
  {
    title: '기자재 대여 규정',
    description: '영상콘텐츠과 기자재 대여 운영 규정',
    path: '/regulations/기자재-대여-규정.pdf',
  },
]

export default function RegulationsPage() {
  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="border-b border-base pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-rose-muted border border-brand-rose flex items-center justify-center text-brand-rose shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-base-primary tracking-tight">대여 규정</h1>
            <p className="text-sm text-base-secondary mt-0.5">
              영상콘텐츠과 기자재 및 강의실 대여 운영 규정을 확인하세요.
            </p>
          </div>
        </div>
      </div>

      <RegulationViewer files={REGULATION_FILES} />
    </div>
  )
}
