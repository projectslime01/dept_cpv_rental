'use client'

import { useState, useEffect, useRef } from 'react'
import {
  format, isValid, addMonths, subMonths,
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameDay, isSameMonth,
  isToday, isBefore, startOfDay,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

interface Props {
  value: string            // "yyyy-MM-dd"
  onChange: (v: string) => void
  placeholder?: string
  disablePast?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = '날짜 선택',
  disablePast = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const initDate = value
    ? (() => { const d = new Date(value + 'T00:00'); return isValid(d) ? d : null })()
    : null
  const [viewDate, setViewDate] = useState(initDate ?? new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(initDate)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    const d = value ? new Date(value + 'T00:00') : null
    if (d && isValid(d)) {
      setSelectedDate(d)
      setViewDate(d)
    } else {
      setSelectedDate(null)
    }
  }, [value])

  const gridDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewDate), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(viewDate),     { weekStartsOn: 0 }),
  })
  const todayStart = startOfDay(new Date())

  function selectDay(day: Date) {
    setSelectedDate(day)
    setViewDate(day)
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const displayText = selectedDate && isValid(selectedDate)
    ? format(selectedDate, 'M월 d일 (EEE)', { locale: ko })
    : null

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-sm transition-all duration-150 bg-surface-raised
          ${open
            ? 'border-brand-rose ring-2 ring-brand-rose/10'
            : 'border-strong hover:border-brand-rose/50'}`}
      >
        <CalendarDays className={`w-4 h-4 shrink-0 ${displayText ? 'text-base-primary' : 'text-base-faint'}`} />
        <span className={`flex-1 text-left ${displayText ? 'text-base-primary font-medium' : 'text-base-faint'}`}>
          {displayText ?? placeholder}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 bg-surface-base rounded-2xl shadow-2xl border border-strong w-72 overflow-hidden">
          {/* Month navigation */}
          <div className="bg-surface border-b border-base text-base-primary px-3 py-2.5 flex items-center justify-between">
            <button type="button" onClick={() => setViewDate(subMonths(viewDate, 1))}
              className="p-1.5 rounded-lg hover:bg-brand-rose-muted transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-semibold">
              {format(viewDate, 'yyyy년 M월', { locale: ko })}
            </span>
            <button type="button" onClick={() => setViewDate(addMonths(viewDate, 1))}
              className="p-1.5 rounded-lg hover:bg-brand-rose-muted transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 bg-surface-raised border-b border-base">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={`text-center text-[11px] font-semibold py-1.5
                ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-sky-500' : 'text-base-muted'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 p-2 gap-0.5">
            {gridDays.map(day => {
              const sel       = selectedDate ? isSameDay(day, selectedDate) : false
              const thisMonth = isSameMonth(day, viewDate)
              const disabled  = disablePast && isBefore(startOfDay(day), todayStart)
              const nowDay    = isToday(day)
              const sun = day.getDay() === 0
              const sat = day.getDay() === 6
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && selectDay(day)}
                  className={[
                    'aspect-square flex items-center justify-center text-xs rounded-lg transition-all duration-100 text-base-primary',
                    sel      ? 'bg-brand-rose text-white font-bold scale-95' : '',
                    nowDay && !sel ? 'ring-1 ring-brand-rose font-semibold' : '',
                    !sel && !disabled && thisMonth ? 'hover:bg-surface-overlay active:scale-95' : '',
                    !thisMonth ? 'opacity-20' : '',
                    disabled  ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer',
                    sun && !sel && thisMonth ? 'text-rose-500' : '',
                    sat && !sel && thisMonth ? 'text-sky-500' : '',
                  ].join(' ')}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
