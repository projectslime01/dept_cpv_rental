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
  Building2,
} from 'lucide-react'

interface Rental {
  id: string
  type: 'equipment' | 'classroom'
  applicantName: string
  /** 칩에 쓰는 요약 라벨. 일괄 신청이면 "소니 FX3 외 1종" */
  equipmentName: string
  /** 묶음에 포함된 품목 전체 ("소니 FX3 1대, 소니 24-70mm 1개") */
  itemsLabel: string
  items: { name: string; quantity: number; unit: string }[]
  /** 묶음 전체 수량 합 */
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
  const [filter, setFilter] = useState<'all' | 'equipment' | 'classroom'>('all')

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

  // Filter rentals based on active filter
  const filteredRentals = rentals.filter((r) => {
    if (filter === 'all') return true
    return r.type === filter
  })

  // Check if rental is active on a specific day
  const getRentalsForDay = (day: Date): Rental[] => {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0)
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999)

    return filteredRentals.filter((rental) => {
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-base p-4 rounded-2xl border border-base backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-rose-muted border border-brand-rose/20 flex items-center justify-center text-brand-rose">
            <CalendarDays className="w-5 h-5 text-brand-rose" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-base-primary tracking-tight">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </h2>
            <p className="text-xs text-base-secondary mt-0.5">
              승인 완료된 학과 대여(기자재 및 강의실) 통합 현황입니다.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-surface-raised border border-base rounded-xl p-0.5 self-start lg:self-center">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'all'
                ? 'bg-surface-overlay text-base-primary border border-base shadow'
                : 'text-base-muted hover:text-base-primary'
            }`}
          >
            전체 보기
          </button>
          <button
            onClick={() => setFilter('equipment')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'equipment'
                ? 'bg-brand-rose-muted text-brand-rose border border-brand-rose/20 shadow'
                : 'text-base-muted hover:text-base-primary'
            }`}
          >
            기자재만
          </button>
          <button
            onClick={() => setFilter('classroom')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'classroom'
                ? 'bg-brand-indigo-muted text-brand-indigo border border-brand-indigo/20 shadow'
                : 'text-base-muted hover:text-base-primary'
            }`}
          >
            강의실만
          </button>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-2">
          <div className="flex items-center bg-surface-raised border border-base rounded-xl p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-lg text-base-secondary hover:text-base-primary hover:bg-surface-overlay transition-colors"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-semibold text-base-secondary hover:text-base-primary rounded-lg hover:bg-surface-overlay transition-colors"
            >
              오늘
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg text-base-secondary hover:text-base-primary hover:bg-surface-overlay transition-colors"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-surface-raised border border-base rounded-xl text-xs text-brand-rose font-semibold">
            <Info className="w-3.5 h-3.5 shrink-0 text-brand-rose" />
            이번 달 총 {filteredRentals.length}건 승인됨
          </div>
        </div>
      </div>

      {/* Main Grid Calendar */}
      <div className="bg-surface-base rounded-2xl border border-base overflow-hidden shadow-2xl relative">
        {loading && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 bg-surface-raised p-6 rounded-2xl border border-base">
              <Loader2 className="w-8 h-8 text-brand-rose animate-spin" />
              <p className="text-sm font-semibold text-base-muted">대여 현황 로딩 중...</p>
            </div>
          </div>
        )}

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-base bg-surface-raised/50">
          {['일', '월', '화', '수', '목', '금', '토'].map((dayName, idx) => {
            const isSunday = idx === 0
            const isSaturday = idx === 6
            return (
              <div
                key={dayName}
                className={`py-3 text-center text-xs font-bold tracking-wider ${
                  isSunday
                    ? 'text-red-500/80 dark:text-red-400/80'
                    : isSaturday
                    ? 'text-indigo-500/80 dark:text-brand-indigo/80'
                    : 'text-base-muted'
                }`}
              >
                {dayName}
              </div>
            )
          })}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-base border-t border-base">
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
                  isCurrentMonth ? 'bg-surface-base' : 'bg-surface-raised/40 text-base-faint'
                } ${dayRentals.length > 0 ? 'cursor-pointer hover:bg-surface-overlay' : ''} ${
                  isToday
                    ? 'ring-1 ring-brand-rose/50 border-brand-rose z-1'
                    : 'hover:bg-surface-overlay'
                }`}
              >
                {/* Cell Header: Day Number */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold font-mono w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                      !isCurrentMonth
                        ? 'text-base-faint'
                        : isToday
                        ? 'bg-brand-rose text-white dark:text-black font-extrabold'
                        : 'text-base-primary group-hover:text-brand-rose'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-rose animate-pulse mr-1" />
                  )}
                </div>

                {/* Cell Body: Active Reservation Badges */}
                <div className="mt-2 space-y-1.5 flex-1 flex flex-col justify-end">
                  {displayRentals.map((rental) => {
                    const isClassroom = rental.type === 'classroom'
                    return (
                      <div
                        key={rental.id}
                        className={`border rounded-lg px-2 py-1 text-[10px] md:text-xs font-semibold truncate transition-colors flex items-center gap-1 shadow-sm ${
                          isClassroom
                            ? 'bg-brand-indigo-muted hover:bg-brand-indigo-muted/80 border-brand-indigo/20 text-brand-indigo'
                            : 'bg-brand-rose-muted hover:bg-brand-rose-muted/80 border-brand-rose/20 text-brand-rose'
                        }`}
                        title={`[${rental.applicantName}] ${isClassroom ? `${rental.equipmentName} (강의실)` : rental.itemsLabel}`}
                      >
                        <span className="shrink-0 text-base-primary/70">[{rental.applicantName}]</span>
                        <span className="truncate">{rental.equipmentName}</span>
                        {!isClassroom && (
                          <span className="shrink-0 text-brand-rose font-bold">({rental.quantity})</span>
                        )}
                      </div>
                    )
                  })}
                  {hasMore && (
                    <div className="text-[10px] md:text-xs font-bold text-brand-rose pl-1 pt-0.5 hover:underline decoration-brand-rose transition-colors">
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
      <div className="flex items-start gap-3 bg-surface-raised p-4 rounded-xl border border-base">
        <Info className="w-4 h-4 text-brand-rose shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-base-primary">이용 안내</h4>
          <p className="text-xs text-base-secondary leading-relaxed">
            캘린더의 각 날짜 카드를 클릭하면 당일 승인 완료된 대여 상세 일정(대여 시작 및 반납 상세 일시)을 일괄적으로 조회하실 수 있습니다. 학과 내 모든 대여 상태는 개인정보보호를 위해 이름의 가운데 자리가 마스킹(예: 홍*동) 처리되어 표기됩니다.
          </p>
        </div>
      </div>

      {/* Premium Detail Modal / Dialog */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedDay(null)}
          />

          <div className="bg-surface-base border border-base rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-base bg-surface-raised/50">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-brand-rose" />
                <h3 className="text-lg font-bold text-base-primary">
                  {format(selectedDay, 'yyyy년 M월 d일 (E)', { locale: ko })} 대여 목록
                </h3>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 rounded-lg text-base-secondary hover:text-base-primary hover:bg-surface-overlay transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="flex justify-between items-center text-xs text-base-secondary px-1 font-semibold uppercase tracking-wider">
                <span>대여 자산 및 수량</span>
                <span>대여 신청자 및 기간</span>
              </div>

              <div className="space-y-3">
                {selectedRentals.map((rental) => {
                  const isClassroom = rental.type === 'classroom'
                  const ItemIcon = isClassroom ? Building2 : Camera
                  return (
                    <div
                      key={rental.id}
                      className={`bg-surface-raised border border-base rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors shadow-sm ${
                        isClassroom
                          ? 'hover:border-brand-indigo/40'
                          : 'hover:border-brand-rose/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-surface-overlay border border-base flex items-center justify-center shrink-0 ${
                          isClassroom ? 'text-brand-indigo' : 'text-brand-rose'
                        }`}>
                          <ItemIcon className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-base-primary leading-none">
                            {rental.equipmentName}
                          </p>
                          <div className="text-xs text-base-secondary flex items-start gap-1.5">
                            <Layers className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            {isClassroom ? (
                              <strong className="text-brand-indigo">강의실 대여</strong>
                            ) : rental.items.length > 1 ? (
                              <div className="space-y-0.5">
                                <p className="font-semibold text-base-secondary">
                                  일괄 신청 {rental.items.length}종
                                </p>
                                <ul className="space-y-0.5">
                                  {rental.items.map((it, i) => (
                                    <li key={i}>
                                      {it.name} <strong className="text-brand-rose">{it.quantity}{it.unit}</strong>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <span>
                                대여 수량:{' '}
                                <strong className="text-brand-rose">
                                  {rental.items[0]?.quantity ?? rental.quantity}
                                  {rental.items[0]?.unit ?? '개'}
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col sm:items-end justify-between items-center gap-1 border-t sm:border-0 border-base pt-2 sm:pt-0">
                        <div className={`border rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isClassroom
                            ? 'bg-brand-indigo-muted border-brand-indigo/20 text-brand-indigo'
                            : 'bg-brand-rose-muted border-brand-rose/20 text-brand-rose'
                        }`}>
                          {rental.applicantName}
                        </div>
                        <p className="text-xs text-base-secondary font-mono mt-1">
                          {formatRentalTime(rental.startAt)} <span className="text-base-muted/30">→</span> {formatRentalTime(rental.endAt)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-base bg-surface-raised/50 flex justify-end">
              <button
                onClick={() => setSelectedDay(null)}
                className="h-10 px-5 rounded-xl bg-surface-overlay hover:bg-surface-overlay/80 text-base-primary text-xs font-bold border border-base transition-colors"
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
