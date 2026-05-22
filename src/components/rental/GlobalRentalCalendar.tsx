'use client'

import { useState, useEffect } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday as isDateFnsToday,
  format,
  addMonths,
  subMonths,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  Camera,
  Layers,
  X,
  Info,
} from 'lucide-react'

interface Rental {
  id: string
  applicantName: string
  equipmentName: string
  quantity: number
  startAt: string
  endAt: string
}

export function GlobalRentalCalendar() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedRentals, setSelectedRentals] = useState<Rental[]>([])

  // Calculate year and month for API query (month is 1-indexed)
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth() + 1

  useEffect(() => {
    async function fetchRentals() {
      setLoading(true)
      try {
        const response = await fetch(`/api/rentals?year=${year}&month=${month}`)
        if (response.ok) {
          const data = await response.json()
          setRentals(data.rentals || [])
        } else {
          console.error('Failed to fetch rentals status')
        }
      } catch (err) {
        console.error('Error fetching rentals', err)
      } finally {
        setLoading(false)
      }
    }
    fetchRentals()
  }, [year, month])

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => setCurrentMonth(new Date())

  // Generate calendar grid days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  // Check if rental is active on a specific day
  const getRentalsForDay = (day: Date): Rental[] => {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0)
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999)

    return rentals.filter((rental) => {
      const rentStart = new Date(rental.startAt)
      const rentEnd = new Date(rental.endAt)
      return rentStart <= dayEnd && rentEnd >= dayStart
    })
  }

  const handleDayClick = (day: Date, dayRentals: Rental[]) => {
    if (dayRentals.length > 0) {
      setSelectedDay(day)
      setSelectedRentals(dayRentals)
    }
  }

  const formatRentalTime = (isoString: string) => {
    const date = new Date(isoString)
    return format(date, 'MM/dd HH:mm', { locale: ko })
  }

  return (
    <div className="space-y-6">
      {/* Calendar Controls & Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141316] p-4 rounded-2xl border border-[#2e2b2f] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ff4f73]/10 border border-[#ff4f73]/20 flex items-center justify-center text-[#ff4f73]">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#e5e2e1] tracking-tight">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </h2>
            <p className="text-xs text-[#9b8f91] mt-0.5">
              승인 완료된 학과 기자재 대여 현황입니다.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center bg-[#1a191b] border border-[#2e2b2f] rounded-xl p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-lg text-[#9b8f91] hover:text-[#e5e2e1] hover:bg-[#252228] transition-colors"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-semibold text-[#c8c4c3] hover:text-[#e5e2e1] rounded-lg hover:bg-[#252228] transition-colors"
            >
              오늘
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg text-[#9b8f91] hover:text-[#e5e2e1] hover:bg-[#252228] transition-colors"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-[#201f21] border border-[#2e2b2f] rounded-xl text-xs text-[#ffb2ba] font-semibold">
            <Info className="w-3.5 h-3.5 shrink-0" />
            이번 달 총 {rentals.length}건 승인됨
          </div>
        </div>
      </div>

      {/* Main Grid Calendar */}
      <div className="bg-[#141316] rounded-2xl border border-[#2e2b2f] overflow-hidden shadow-2xl relative">
        {loading && (
          <div className="absolute inset-0 bg-[#0f0e11]/70 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 bg-[#1a191b] p-6 rounded-2xl border border-[#2e2b2f]">
              <Loader2 className="w-8 h-8 text-[#ff4f73] animate-spin" />
              <p className="text-sm font-semibold text-[#9b8f91]">대여 현황 로딩 중...</p>
            </div>
          </div>
        )}

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-[#2e2b2f] bg-[#1a191b]/50">
          {['일', '월', '화', '수', '목', '금', '토'].map((dayName, idx) => {
            const isSunday = idx === 0
            const isSaturday = idx === 6
            return (
              <div
                key={dayName}
                className={`py-3 text-center text-xs font-bold tracking-wider ${
                  isSunday
                    ? 'text-red-400/80'
                    : isSaturday
                    ? 'text-blue-400/80'
                    : 'text-[#9b8f91]'
                }`}
              >
                {dayName}
              </div>
            )
          })}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#2e2b2f] border-t border-[#2e2b2f]">
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isToday = isDateFnsToday(day)
            const dayRentals = getRentalsForDay(day)
            const displayRentals = dayRentals.slice(0, 3)
            const hasMore = dayRentals.length > 3

            return (
              <div
                key={day.toString()}
                onClick={() => handleDayClick(day, dayRentals)}
                className={`min-h-[100px] md:min-h-[140px] p-2 flex flex-col justify-between group transition-colors relative ${
                  isCurrentMonth ? 'bg-[#141316]' : 'bg-[#0c0b0d]/50 text-[#4a4448]'
                } ${dayRentals.length > 0 ? 'cursor-pointer hover:bg-[#1d1b1f]' : ''} ${
                  isToday
                    ? 'ring-1 ring-[#ff4f73]/50 border-[#ff4f73] z-1'
                    : 'hover:bg-[#181719]'
                }`}
              >
                {/* Cell Header: Day Number */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold font-mono w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                      !isCurrentMonth
                        ? 'text-[#4a4448]'
                        : isToday
                        ? 'bg-[#ff4f73] text-white'
                        : 'text-[#e5e2e1] group-hover:text-[#ffb2ba]'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff4f73] animate-pulse mr-1" />
                  )}
                </div>

                {/* Cell Body: Active Reservation Badges */}
                <div className="mt-2 space-y-1.5 flex-1 flex flex-col justify-end">
                  {displayRentals.map((rental) => (
                    <div
                      key={rental.id}
                      className="bg-[#ff4f73]/10 hover:bg-[#ff4f73]/20 border border-[#ff4f73]/20 rounded-lg px-2 py-1 text-[10px] md:text-xs font-semibold text-[#ffb2ba] truncate transition-colors flex items-center gap-1 shadow-sm"
                      title={`[${rental.applicantName}] ${rental.equipmentName} (${rental.quantity}대)`}
                    >
                      <span className="shrink-0 text-white/70">[{rental.applicantName}]</span>
                      <span className="truncate">{rental.equipmentName}</span>
                      <span className="shrink-0 text-[#ff4f73] font-bold">({rental.quantity})</span>
                    </div>
                  ))}
                  {hasMore && (
                    <div className="text-[10px] md:text-xs font-bold text-[#ff4f73] pl-1 pt-0.5 hover:underline decoration-[#ff4f73] transition-colors">
                      + {dayRentals.length - 3}개 더보기
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Visual Legend / Help Card */}
      <div className="flex items-start gap-3 bg-[#1a191b] p-4 rounded-xl border border-[#2e2b2f]">
        <Info className="w-4 h-4 text-[#ffb2ba] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-[#e5e2e1]">이용 안내</h4>
          <p className="text-xs text-[#9b8f91] leading-relaxed">
            캘린더의 각 날짜 카드를 클릭하면 당일 승인 완료된 대여 상세 일정(대여 시작 및 반납 상세 일시)을 일괄적으로 조회하실 수 있습니다. 학과 내 모든 대여 상태는 개인정보보호를 위해 이름의 가운데 자리가 마스킹(예: 홍*동) 처리되어 표기됩니다.
          </p>
        </div>
      </div>

      {/* Premium Detail Modal / Dialog */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with transition */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedDay(null)}
          />

          {/* Modal content */}
          <div className="bg-[#141316] border border-[#2e2b2f] rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#2e2b2f] bg-[#1a191b]/50">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#ff4f73]" />
                <h3 className="text-lg font-bold text-[#e5e2e1]">
                  {format(selectedDay, 'yyyy년 M월 d일 (E)', { locale: ko })} 대여 목록
                </h3>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 rounded-lg text-[#9b8f91] hover:text-[#e5e2e1] hover:bg-[#252228] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="flex justify-between items-center text-xs text-[#9b8f91] px-1 font-semibold uppercase tracking-wider">
                <span>기자재 및 대여 수량</span>
                <span>대여 신청자 및 기간</span>
              </div>

              <div className="space-y-3">
                {selectedRentals.map((rental) => (
                  <div
                    key={rental.id}
                    className="bg-[#1a191b] border border-[#2e2b2f] hover:border-[#ff4f73]/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#252228] border border-[#2e2b2f] flex items-center justify-center shrink-0 text-[#ffb2ba]">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[#e5e2e1] leading-none">
                          {rental.equipmentName}
                        </p>
                        <p className="text-xs text-[#9b8f91] flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          대여 수량: <span className="text-[#ffb2ba] font-bold">{rental.quantity}대</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col sm:items-end justify-between items-center gap-1 border-t sm:border-0 border-[#252228] pt-2 sm:pt-0">
                      <div className="bg-[#ff4f73]/10 border border-[#ff4f73]/20 rounded-full px-2.5 py-0.5 text-xs text-[#ffb2ba] font-bold">
                        {rental.applicantName}
                      </div>
                      <p className="text-xs text-[#9b8f91] font-mono mt-1">
                        {formatRentalTime(rental.startAt)} <span className="text-white/30">→</span> {formatRentalTime(rental.endAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#2e2b2f] bg-[#1a191b]/50 flex justify-end">
              <button
                onClick={() => setSelectedDay(null)}
                className="h-10 px-5 rounded-xl bg-[#252228] hover:bg-[#322d36] text-[#e5e2e1] text-xs font-bold border border-[#2e2b2f] transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
