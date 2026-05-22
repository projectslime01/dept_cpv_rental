import { Metadata } from 'next'
import { GlobalRentalCalendar } from '@/components/rental/GlobalRentalCalendar'
import { CalendarDays } from 'lucide-react'

export const metadata: Metadata = {
  title: '전체 대여 현황 | 연성대학교 영상콘텐츠과 기자재 대여',
  description: '연성대학교 영상콘텐츠과 전체 기자재의 실시간 대여 현황을 한눈에 조회합니다.',
}

export default function RentalStatusPage() {
  return (
    <div className="space-y-6">
      {/* Visual Title Header Area */}
      <div className="border-b border-[#2a2830] pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#ff4f73]/10 border border-[#ff4f73]/20 flex items-center justify-center text-[#ff4f73]">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-[#e5e2e1] tracking-tight sm:text-4xl">
              전체 대여 현황
            </h1>
            <p className="text-sm md:text-base text-[#9b8f91] mt-1.5 leading-relaxed">
              기자재를 개별로 선택하지 않아도 학과 전체의 승인 완료된 대여 내역을 캘린더에서 한눈에 통합 확인하실 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Main Calendar Section */}
      <div className="max-w-6xl mx-auto">
        <GlobalRentalCalendar />
      </div>
    </div>
  )
}
