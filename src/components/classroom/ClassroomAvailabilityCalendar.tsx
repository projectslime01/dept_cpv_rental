'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, CalendarDays, Clock, CheckCircle2, HelpCircle, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

interface BookingItem {
  id: number
  startAt: string
  endAt: string
  applicantName: string
  status: 'approved' | 'pending' | string
  purpose: string | null
}

interface TimetableSlot {
  dayStr: string
  startTime: string
  endTime: string
  courseName: string | null
  timetableId: number
}

interface ClassroomAvailabilityData {
  year: number
  month: number
  classroom: {
    id: number
    roomNumber: string
    capacity: number
    equipment: string | null
  }
  bookings: BookingItem[]
  timetableSlots: TimetableSlot[]
}

interface Props {
  classroomId: number
  startAt: string // "YYYY-MM-DDTHH:mm"
  endAt: string // "YYYY-MM-DDTHH:mm"
  onRangeSelect: (start: string, end: string) => void
}

export function ClassroomAvailabilityCalendar({
  classroomId,
  startAt,
  endAt,
  onRangeSelect,
}: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1 ~ 12
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  // 날짜 선택 시 인라인 오류/경고 (alert() 대신)
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [rangeWarning, setRangeWarning] = useState<string | null>(null)
  const [selectedDayStr, setSelectedDayStr] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  )

  // 10자 날짜만 파싱 ("YYYY-MM-DD")
  const parseDateOnly = (dateTimeStr: string) => {
    if (!dateTimeStr) return ''
    return dateTimeStr.substring(0, 10)
  }

  const startOnly = parseDateOnly(startAt)
  const endOnly = parseDateOnly(endAt)

  // 월간 예약 정보 가져오기
  useEffect(() => {
    let active = true
    async function fetchBookings() {
      setLoading(true)
      setErrorMsg('')
      try {
        const res = await fetch(
          `/api/classrooms/${classroomId}/availability?year=${year}&month=${month}`
        )
        if (!res.ok) throw new Error('강의실 대여 일정을 가져오지 못했습니다.')
        const data: ClassroomAvailabilityData = await res.json()
        if (active) {
          setBookings(data.bookings || [])
          setTimetableSlots(data.timetableSlots || [])
        }
      } catch (err: unknown) {
        if (active) {
          setErrorMsg(err instanceof Error ? err.message : '일정 조회 중 오류가 발생했습니다.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchBookings()
    return () => { active = false }
  }, [classroomId, year, month])

  // 월 이동
  const handlePrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  // 달력 계산
  const numDaysInMonth = new Date(year, month, 0).getDate()
  // new Date(year, month-1, 1): 로컬 자정 기준 → 타임존 영향 없음
  const firstDayIndex = new Date(year, month - 1, 1).getDay() // 0(일) ~ 6(토)
  const blanks = Array(firstDayIndex).fill(null)

  const dayStrings: string[] = []
  for (let d = 1; d <= numDaysInMonth; d++) {
    dayStrings.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }

  // 해당 일자의 승인/대기 예약 필터
  const getBookingsForDay = (dayStr: string) => {
    return bookings.filter((b) => {
      const bStart = b.startAt.substring(0, 10)
      const bEnd = b.endAt.substring(0, 10)
      return dayStr >= bStart && dayStr <= bEnd
    })
  }

  // 해당 일자의 수업 시간표 슬롯
  const getTimetableSlotsForDay = (dayStr: string) =>
    timetableSlots.filter((s) => s.dayStr === dayStr)

  // 일자 클릭 핸들러
  const handleDayClick = (dayStr: string) => {
    setSelectedDayStr(dayStr)
    setRangeError(null)
    setRangeWarning(null)

    if (!startOnly || (startOnly && endOnly)) {
      // 시작일을 해당 일자 09:00으로 세팅
      onRangeSelect(`${dayStr}T09:00`, '')
    } else {
      // 시작일이 지정된 상태 — 반납일 지정
      if (dayStr < startOnly) {
        // 더 과거 클릭 시 시작일 변경
        onRangeSelect(`${dayStr}T09:00`, '')
      } else {
        const reqStart = new Date(`${startOnly}T09:00`).getTime()
        const reqEnd   = new Date(`${dayStr}T18:00`).getTime()

        // 승인 완료 예약 충돌 검사
        const hasBookingConflict = bookings.some((b) => {
          if (b.status !== 'approved') return false
          const bStart = new Date(b.startAt).getTime()
          const bEnd   = new Date(b.endAt).getTime()
          return reqStart < bEnd && reqEnd > bStart
        })

        if (hasBookingConflict) {
          setRangeError('선택하신 기간 사이에 이미 승인 완료된 강의실 예약이 존재하여 선택할 수 없습니다.')
          return
        }

        // 수업 시간표 포함 여부 경고 (차단은 서버에서, 클라이언트는 미리 알림)
        const hasTimetableInRange = timetableSlots.some(
          (s) => s.dayStr >= startOnly && s.dayStr <= dayStr
        )
        if (hasTimetableInRange) {
          setRangeWarning('선택하신 기간에 수업이 있는 날이 포함되어 있습니다. 수업 시간과 대여 시간이 겹칠 경우 신청이 자동 차단됩니다.')
        }

        onRangeSelect(`${startOnly}T09:00`, `${dayStr}T18:00`)
      }
    }
  }

  const activeDayBookings = getBookingsForDay(selectedDayStr)
  const activeDayTimetable = getTimetableSlotsForDay(selectedDayStr)
  const formattedActiveDay = selectedDayStr ? (() => {
    const parts = selectedDayStr.split('-')
    return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`
  })() : ''

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1 & 2. 달력 영역 */}
      <div className="lg:col-span-2 bg-surface-base rounded-2xl border border-base p-4 space-y-4 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-base pb-3">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-5 h-5 text-brand-indigo" />
              <h2 className="text-base font-bold text-base-primary tracking-tight">강의실 가용 달력</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-base bg-surface-raised hover:bg-surface-overlay text-base-secondary transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-base-primary min-w-[70px] text-center">
                {year}년 {month}월
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-base bg-surface-raised hover:bg-surface-overlay text-base-secondary transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Titles */}
          <div className="grid grid-cols-7 gap-1 text-center py-2 text-[11px] font-bold text-base-muted uppercase tracking-wider">
            <span className="text-rose-500">일</span>
            <span>월</span>
            <span>화</span>
            <span>수</span>
            <span>목</span>
            <span>금</span>
            <span className="text-brand-indigo">토</span>
          </div>

          {/* Days Grid */}
          {loading ? (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-indigo" />
              <p className="text-xs text-base-secondary">대여 정보를 동기화하는 중...</p>
            </div>
          ) : errorMsg ? (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <p className="text-xs text-red-500">{errorMsg}</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {blanks.map((_, i) => (
                <div key={`blank-${i}`} className="aspect-square bg-transparent" />
              ))}
              {dayStrings.map((dayStr) => {
                const dayNum = parseInt(dayStr.substring(8))
                // new Date(year, month-1, day): 로컬 자정으로 생성해 타임존 영향 제거
                const dateObj = new Date(year, month - 1, dayNum)
                const dayOfWeek = dateObj.getDay() // 0: 일, 6: 토
                const isSelected = selectedDayStr === dayStr
                const isToday = format(today, 'yyyy-MM-dd') === dayStr

                const dayBookings = getBookingsForDay(dayStr)
                const approvedCount = dayBookings.filter((b) => b.status === 'approved').length
                const pendingCount = dayBookings.filter((b) => b.status === 'pending').length
                const dayTimetableSlots = getTimetableSlotsForDay(dayStr)
                const hasTimetable = dayTimetableSlots.length > 0

                // 선택 범위 상태
                let selectionClass = ''
                if (dayStr === startOnly && !endOnly) {
                  selectionClass = 'bg-brand-indigo-muted border border-brand-indigo text-brand-indigo'
                } else if (dayStr === startOnly) {
                  selectionClass = 'bg-brand-indigo text-white dark:text-black font-extrabold rounded-l-xl'
                } else if (dayStr === endOnly) {
                  selectionClass = 'bg-brand-indigo text-white dark:text-black font-extrabold rounded-r-xl'
                } else if (endOnly && dayStr > startOnly && dayStr < endOnly) {
                  selectionClass = 'bg-brand-indigo-muted text-brand-indigo'
                } else if (isSelected) {
                  selectionClass = 'bg-surface-overlay border border-strong text-base-primary'
                } else {
                  selectionClass = 'bg-surface-raised hover:bg-surface-overlay border border-subtle text-base-primary'
                }

                // 주말 텍스트 컬러 지정
                let textCol = ''
                if (dayOfWeek === 0) textCol = 'text-rose-500'
                else if (dayOfWeek === 6) textCol = 'text-brand-indigo'

                return (
                  <button
                    key={dayStr}
                    type="button"
                    onClick={() => handleDayClick(dayStr)}
                    className={`aspect-square flex flex-col justify-between p-1.5 rounded-xl transition duration-150 relative text-left ${selectionClass}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-bold ${textCol} ${isToday ? 'underline decoration-2 decoration-brand-rose' : ''}`}>
                        {dayNum}
                      </span>
                      {isToday && (
                        <span className="text-[8px] px-1 py-0.5 rounded-md bg-brand-rose-muted border border-brand-rose/20 font-bold text-brand-rose">
                          오늘
                        </span>
                      )}
                    </div>

                    {/* Booking / timetable indicator badges */}
                    <div className="flex flex-col gap-0.5 mt-auto w-full">
                      {hasTimetable && (
                        <div className="w-full h-1.5 rounded bg-rose-500" title="수업 있음" />
                      )}
                      {approvedCount > 0 && (
                        <div className="w-full h-1.5 rounded bg-brand-indigo" title="승인 예약 완료" />
                      )}
                      {pendingCount > 0 && (
                        <div className="w-full h-1.5 rounded bg-amber-500/60" title="대기 중인 예약" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 인라인 오류/경고 메시지 (alert() 대체) */}
        {rangeError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{rangeError}</span>
          </div>
        )}
        {rangeWarning && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{rangeWarning}</span>
          </div>
        )}

        {/* Help tooltip */}
        <div className="text-[10px] text-base-muted flex items-center gap-1.5 border-t border-base pt-2 mt-2">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>날짜 클릭 시 시작일/종료일 지정, 하루에 승인 예약 겹침은 불가합니다.</span>
        </div>
      </div>

      {/* 3. 우측 일별 타임라인 패널 */}
      <div className="bg-surface-base rounded-2xl border border-base p-4 flex flex-col space-y-4 justify-between h-[360px] lg:h-auto">
        <div className="space-y-3 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="border-b border-base pb-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-brand-indigo" />
            <h3 className="text-xs font-bold text-base-primary uppercase tracking-wider">
              {formattedActiveDay} 대여 현황
            </h3>
          </div>

          {/* Timeline List */}
          {activeDayBookings.length === 0 && activeDayTimetable.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center gap-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/25 mb-1" />
              <p className="text-xs font-semibold text-base-primary">확정된 예약 없음</p>
              <p className="text-[10px] text-base-muted max-w-[160px]">
                이 날짜에는 아직 대여 승인이나 대기 건이 없으므로 자유롭게 신청할 수 있습니다!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 수업 시간표 슬롯 */}
              {activeDayTimetable.map((s) => (
                <div
                  key={`timetable-${s.timetableId}`}
                  className="p-2.5 rounded-xl border flex flex-col gap-1 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-base-primary">
                      {s.startTime} ~ {s.endTime}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-lg font-bold border bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-900/50">
                      수업 중
                    </span>
                  </div>
                  {s.courseName && (
                    <div className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">
                      {s.courseName}
                    </div>
                  )}
                </div>
              ))}
              {/* 대여 예약 */}
              {activeDayBookings.map((b) => {
                const isApproved = b.status === 'approved'
                const startStr = format(new Date(b.startAt), 'HH:mm')
                const endStr = format(new Date(b.endAt), 'HH:mm')

                return (
                  <div
                    key={b.id}
                    className={`p-2.5 rounded-xl border flex flex-col gap-1 transition ${
                      isApproved
                        ? 'bg-brand-indigo-muted border-brand-indigo/15'
                        : 'bg-amber-500/5 border-amber-500/15'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-base-primary">
                        {startStr} ~ {endStr}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-lg font-bold border ${
                          isApproved
                            ? 'bg-brand-indigo-muted text-brand-indigo border-brand-indigo/20'
                            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30'
                        }`}
                      >
                        {isApproved ? '대여 승인완료' : '예약 대기중'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-base-secondary">
                      <span>신청자: <strong className="text-base-primary">{b.applicantName}</strong></span>
                      {b.purpose && (
                        <span className="truncate max-w-[120px]" title={b.purpose}>
                          목적: {b.purpose}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected date action buttons */}
        <div className="space-y-1.5 pt-2 border-t border-base">
          <div className="text-[10px] text-base-secondary">
            선택 범위: <strong className="text-brand-indigo">{startOnly || '미지정'}</strong>
            {endOnly && <> ~ <strong className="text-brand-indigo">{endOnly}</strong></>}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setRangeError(null)
                setRangeWarning(null)
                onRangeSelect(`${selectedDayStr}T09:00`, endAt ? `${endOnly}T18:00` : '')
              }}
              className="py-2 rounded-xl bg-surface-raised border border-strong text-xs font-semibold text-base-primary hover:bg-surface-overlay transition"
            >
              시작일 지정
            </button>
            <button
              type="button"
              disabled={!startOnly}
              onClick={() => {
                if (selectedDayStr < startOnly) {
                  setRangeError('반납 예정일은 대여 시작일보다 이전일 수 없습니다.')
                  return
                }
                setRangeError(null)
                setRangeWarning(null)
                onRangeSelect(startAt, `${selectedDayStr}T18:00`)
              }}
              className="py-2 rounded-xl bg-surface-raised border border-strong text-xs font-semibold text-base-primary hover:bg-surface-overlay disabled:opacity-30 transition"
            >
              반납일 지정
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
