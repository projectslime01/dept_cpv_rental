'use client'

import { useState } from 'react'
import { ClassroomAvailabilityCalendar } from './ClassroomAvailabilityCalendar'
import { Building2, Users, Monitor, ChevronRight, CalendarDays, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { countWeekdaysInRange } from '@/lib/rental'

interface Classroom {
  id: number
  roomNumber: string
  capacity: number
  description: string | null
  equipment: string | null
}

interface Props {
  classroom: Classroom
}

export function ClassroomDetailClient({ classroom }: Props) {
  const router = useRouter()
  const [startAt, setStartAt] = useState<string>('')
  const [endAt, setEndAt] = useState<string>('')

  const handleRangeSelect = (start: string, end: string) => {
    setStartAt(start)
    setEndAt(end)
  }

  const handleApplyClick = () => {
    if (!startAt || !endAt) return
    router.push(
      `/classrooms/${classroom.id}/apply?startAt=${encodeURIComponent(startAt)}&endAt=${encodeURIComponent(endAt)}`
    )
  }

  const equipmentList = classroom.equipment
    ? classroom.equipment.split(',').map((e) => e.trim())
    : []

  const selectedDays = (startAt && endAt) 
    ? countWeekdaysInRange(new Date(startAt), new Date(endAt)) 
    : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[#6b6468]">
        <a href="/classrooms" className="hover:text-[#9b8f91] transition-colors">강의실 목록</a>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#9b8f91] font-medium">{classroom.roomNumber}</span>
      </nav>

      {/* Classroom main info */}
      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3.5 rounded-2xl border border-[#a78bfa]/20 bg-[#a78bfa]/5 text-[#a78bfa] shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-[#e5e2e1] tracking-tight">{classroom.roomNumber}</h1>
              <p className="text-xs text-[#9b8f91]">{classroom.description || '연성대학교 영상콘텐츠과 전용 학과 강의실'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#a78bfa]/10 border border-[#a78bfa]/20 text-[#a78bfa] text-xs font-bold">
              <Users className="w-4 h-4" />
              <span>수용 인원: {classroom.capacity}명</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-[#2e2b2f]" />

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#c8c4c3]">
            <Monitor className="w-4 h-4 text-[#a78bfa]" />
            <span>제공 시설 및 기자재 목록</span>
          </div>
          {equipmentList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {equipmentList.map((eq, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-xl bg-[#1b191c] border border-[#2e2b2f] text-xs font-semibold text-[#9b8f91]"
                >
                  {eq}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#6b6468]">제공되는 별도 장비가 없습니다.</p>
          )}
        </div>
      </div>

      {/* Calendar Area */}
      <ClassroomAvailabilityCalendar
        classroomId={classroom.id}
        startAt={startAt}
        endAt={endAt}
        onRangeSelect={handleRangeSelect}
      />

      {/* Range Display & Apply Action */}
      {startAt && (
        <div className="bg-[#201f21] rounded-2xl border border-[#a78bfa]/35 p-5 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="flex items-center gap-2 text-[#a78bfa] text-xs font-bold justify-center md:justify-start">
              <CalendarDays className="w-4 h-4" />
              <span>선택 완료 - 신청 일정 확인</span>
            </div>
            <p className="text-sm font-bold text-[#e5e2e1]">
              {startAt.substring(0, 10)} {startAt.substring(11)} ~{' '}
              {endAt ? `${endAt.substring(0, 10)} ${endAt.substring(11)}` : '반납 예정일 미선택'}
              {selectedDays > 0 && <span className="text-[#a78bfa] ml-1.5">({selectedDays}평일)</span>}
            </p>
          </div>
          
          <button
            onClick={handleApplyClick}
            disabled={!endAt}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#a78bfa] disabled:opacity-40 text-sm font-bold text-[#0f0e11] hover:bg-[#bca5ff] active:scale-95 disabled:pointer-events-none transition-all duration-150 shrink-0"
          >
            <span>이 일정으로 강의실 신청서 작성</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
