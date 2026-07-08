'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react'

interface DayItem {
  date: string // "YYYY-MM-DD"
  available: number
}

interface Props {
  equipmentId: number
  totalQuantity: number
  startAt: string // "YYYY-MM-DD HH:mm"
  endAt: string // "YYYY-MM-DD HH:mm"
  onRangeSelect: (start: string, end: string) => void
}

export function AvailabilityCalendar({
  equipmentId,
  totalQuantity,
  startAt,
  endAt,
  onRangeSelect,
}: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1 ~ 12
  const [days, setDays] = useState<DayItem[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // "YYYY-MM-DD" 파싱 유틸
  const parseDateOnly = (dateTimeStr: string) => {
    if (!dateTimeStr) return ''
    return dateTimeStr.substring(0, 10) // "2026-05-22"
  }

  const startOnly = parseDateOnly(startAt)
  const endOnly = parseDateOnly(endAt)

  // 일별 가용성 가져오기
  useEffect(() => {
    let active = true
    async function fetchAvailability() {
      setLoading(true)
      setErrorMsg('')
      try {
        const res = await fetch(
          `/api/equipment/${equipmentId}/availability?year=${year}&month=${month}`
        )
        if (!res.ok) throw new Error('데이터를 가져오지 못했습니다.')
        const data = await res.json()
        if (active) {
          setDays(data.days || [])
        }
      } catch (err: any) {
        if (active) {
          setErrorMsg(err.message || '오류가 발생했습니다.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchAvailability()
    return () => { active = false }
  }, [equipmentId, year, month])

  // 월 전환 핸들러
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

  // 달력 그리드를 위한 빈 날짜 및 실제 일자 계산
  const firstDayIndex = new Date(year, month - 1, 1).getDay() // 0 (일) ~ 6 (토)
  const blanks = Array(firstDayIndex).fill(null)

  // 오늘 날짜 문자열 계산
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // 일자별 클릭 핸들러 (원터치 범위 지정)
  const handleDateClick = (dayStr: string, available: number) => {
    if (available === 0) return // 재고 없는 날짜는 무시

    const clickedDate = new Date(dayStr)

    // 1. 시작일이 비어있거나, 또는 범위가 이미 둘 다 차있는 상태에서 새로 클릭할 경우
    if (!startOnly || (startOnly && endOnly)) {
      onRangeSelect(`${dayStr}T09:00`, '')
      return
    }

    // 2. 시작일만 입력된 상태
    const startDate = new Date(startOnly)

    if (clickedDate < startDate) {
      // 시작일보다 과거를 클릭하면 그것을 시작일로 갱신
      onRangeSelect(`${dayStr}T09:00`, '')
    } else {
      // 시작일 포함 이후 날짜를 클릭하면 반납 예정일로 지정하여 범위 완성
      // 범위 사이에 품절(available = 0)인 날짜가 포함되어 있는지 체크
      const startT = startDate.getTime()
      const endT = clickedDate.getTime()
      
      const hasSoldOut = days.some((d) => {
        const dT = new Date(d.date).getTime()
        return dT >= startT && dT <= endT && d.available === 0
      })

      if (hasSoldOut) {
        alert('선택하신 기간 사이에 예약이 마감된(품절) 일자가 포함되어 대여할 수 없습니다.')
        return
      }

      onRangeSelect(`${startOnly}T09:00`, `${dayStr}T18:00`)
    }
  }

  // 특정 일자가 선택 범위 내에 있는지 판단
  const getSelectionState = (dayStr: string) => {
    if (!startOnly) return 'none'
    if (dayStr === startOnly && !endOnly) return 'start-only'
    if (dayStr === startOnly) return 'start'
    if (dayStr === endOnly) return 'end'
    if (endOnly && dayStr > startOnly && dayStr < endOnly) return 'range'
    return 'none'
  }

  return (
    <div className="bg-surface-raised rounded-2xl border border-base p-4 space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between border-b border-base pb-3">
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-base-primary">{year}년</span>
          <span className="text-sm font-bold text-brand-rose">{month}월</span>
          <span className="text-[10px] text-base-muted ml-1">실시간 대여 현황</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-base bg-surface-base hover:bg-surface-overlay text-base-secondary hover:text-base-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-base bg-surface-base hover:bg-surface-overlay text-base-secondary hover:text-base-primary transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Names */}
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-base-muted uppercase tracking-wider">
        <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="h-48 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-brand-rose" />
          <span className="text-xs text-base-muted">예약 정보를 불러오는 중...</span>
        </div>
      ) : errorMsg ? (
        <div className="h-48 flex flex-col items-center justify-center gap-2 text-center">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
          <span className="text-xs text-red-500 dark:text-red-400">{errorMsg}</span>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {/* Blanks */}
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="aspect-square bg-transparent" />
          ))}

          {/* Days */}
          {days.map((dayItem) => {
            const dayNum = parseInt(dayItem.date.split('-')[2])
            const isPast = dayItem.date < todayStr
            const state = getSelectionState(dayItem.date)

            // 재고 상태별 색상 설계
            const isSoldOut = dayItem.available === 0
            const isFullyAvailable = dayItem.available === totalQuantity

            let bgStyle = 'bg-surface-base border-base text-base-primary hover:border-strong'
            let statusText = `${dayItem.available}대`
            let statusColor = 'text-emerald-600 dark:text-emerald-400'

            if (isPast) {
              bgStyle = 'bg-surface-bg/40 border-subtle text-base-faint cursor-not-allowed opacity-40'
              statusText = '-'
              statusColor = 'text-base-faint'
            } else if (isSoldOut) {
              bgStyle = 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-500 dark:text-red-400/70 cursor-not-allowed'
              statusText = '품절'
              statusColor = 'text-red-500 dark:text-red-400 font-semibold'
            } else if (isFullyAvailable) {
              bgStyle = 'bg-surface-base border-base text-base-primary hover:bg-surface-overlay hover:border-brand-rose/40'
              statusColor = 'text-emerald-600 dark:text-emerald-400'
            } else {
              // 일부 대여 중
              bgStyle = 'bg-surface-base border-base text-base-primary hover:bg-surface-overlay hover:border-brand-rose/40'
              statusColor = 'text-amber-600 dark:text-amber-400'
            }

            // 클릭으로 범위 선택 상태에 따른 하이라이트 스타일링 (Visual Premium)
            if (state === 'start-only') {
              bgStyle = 'bg-brand-rose-muted border-brand-rose text-brand-rose shadow-[0_0_12px_rgba(244,63,94,0.15)]'
            } else if (state === 'start') {
              bgStyle = 'bg-brand-rose border-brand-rose text-white dark:text-zinc-950 font-bold rounded-l-xl'
              statusColor = 'text-white dark:text-zinc-950'
            } else if (state === 'end') {
              bgStyle = 'bg-brand-rose border-brand-rose text-white dark:text-zinc-950 font-bold rounded-r-xl'
              statusColor = 'text-white dark:text-zinc-950'
            } else if (state === 'range') {
              bgStyle = 'bg-brand-rose/10 border-brand-rose/20 text-brand-rose'
              statusColor = 'text-brand-rose/80'
            }

            return (
              <button
                key={dayItem.date}
                type="button"
                disabled={isPast || isSoldOut}
                onClick={() => handleDateClick(dayItem.date, dayItem.available)}
                className={`aspect-square rounded-xl border flex flex-col items-center justify-between p-1 sm:p-1.5 transition-all text-left ${bgStyle}`}
              >
                <span className="text-xs font-bold self-start">{dayNum}</span>
                <span className={`text-[10px] sm:text-[11px] font-semibold whitespace-nowrap ${statusColor} self-end`}>
                  {statusText}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Legend & Guide */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-base-muted border-t border-base pt-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>여유</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span>보통</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span>품절</span>
          </div>
        </div>
        <span className="text-right">날짜 2번 클릭으로 대여 기간 자동 범위 지정</span>
      </div>
    </div>
  )
}
