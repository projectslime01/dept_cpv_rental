'use client'

import { useState, useEffect, useRef } from 'react'
import {
  format, isValid, addMonths, subMonths,
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameDay, isSameMonth,
  isToday, isBefore, startOfDay,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock,
} from 'lucide-react'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

interface Props {
  value: string            // "yyyy-MM-ddTHH:mm"
  onChange: (v: string) => void
  placeholder?: string
  disablePast?: boolean
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = '날짜 선택',
  disablePast = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const initDate = value ? (() => { const d = new Date(value); return isValid(d) ? d : null })() : null
  const [viewDate, setViewDate] = useState(initDate ?? new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(initDate)
  const [hour, setHour] = useState(initDate ? initDate.getHours() : 9)
  const [minute, setMinute] = useState(initDate ? initDate.getMinutes() : 0)

  // Close on outside click
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

  // Calendar grid
  const gridDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewDate), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(viewDate),     { weekStartsOn: 0 }),
  })
  const todayStart = startOfDay(new Date())

  function emit(date: Date, h: number, m: number) {
    const d = new Date(date)
    d.setHours(h, m, 0, 0)
    onChange(format(d, "yyyy-MM-dd'T'HH:mm"))
  }

  function selectDay(day: Date) {
    setSelectedDate(day)
    setViewDate(day)
    emit(day, hour, minute)
  }

  function handleHourInput(raw: string) {
    const n = parseInt(raw, 10)
    if (raw === '') { setHour(0); if (selectedDate) emit(selectedDate, 0, minute); return }
    if (isNaN(n)) return
    const h = Math.max(0, Math.min(23, n))
    setHour(h)
    if (selectedDate) emit(selectedDate, h, minute)
  }

  function handleMinuteInput(raw: string) {
    const n = parseInt(raw, 10)
    if (raw === '') { setMinute(0); if (selectedDate) emit(selectedDate, hour, 0); return }
    if (isNaN(n)) return
    const m = Math.max(0, Math.min(59, n))
    setMinute(m)
    if (selectedDate) emit(selectedDate, hour, m)
  }

  const displayText = selectedDate && isValid(selectedDate)
    ? format(selectedDate, 'M월 d일 (EEE) · HH:mm', { locale: ko })
    : null

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-sm transition-all duration-150 bg-white
          ${open
            ? 'border-slate-700 ring-2 ring-slate-700/10 shadow-sm'
            : 'border-slate-200 hover:border-slate-400 hover:shadow-sm'}`}
      >
        <CalendarDays className={`w-4 h-4 shrink-0 ${displayText ? 'text-slate-700' : 'text-slate-400'}`} />
        <span className={`flex-1 text-left ${displayText ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
          {displayText ?? placeholder}
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 bg-white rounded-2xl shadow-2xl border border-slate-100 w-72 overflow-hidden">

          {/* Month navigation */}
          <div className="bg-slate-900 text-white px-3 py-2.5 flex items-center justify-between">
            <button type="button" onClick={() => setViewDate(subMonths(viewDate, 1))}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-semibold">
              {format(viewDate, 'yyyy년 M월', { locale: ko })}
            </span>
            <button type="button" onClick={() => setViewDate(addMonths(viewDate, 1))}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={`text-center text-[11px] font-semibold py-1.5
                ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-500' : 'text-slate-400'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 p-2 gap-0.5">
            {gridDays.map(day => {
              const sel      = selectedDate ? isSameDay(day, selectedDate) : false
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
                    'aspect-square flex items-center justify-center text-xs rounded-lg transition-all duration-100',
                    sel      ? 'bg-slate-900 text-white font-bold shadow-md scale-95' : '',
                    nowDay && !sel ? 'ring-1 ring-slate-700 font-semibold' : '',
                    !sel && !disabled && thisMonth ? 'hover:bg-slate-100 active:scale-95' : '',
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

          {/* Time picker */}
          <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-3 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">시간 선택</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Hour input */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-400 font-semibold">시</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={String(hour).padStart(2, '0')}
                  onChange={e => handleHourInput(e.target.value)}
                  onFocus={e => e.target.select()}
                  className="w-14 h-11 text-center bg-white rounded-xl border-2 border-slate-200 font-mono text-lg font-bold text-slate-800 focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>

              <span className="text-2xl font-black text-slate-300 mt-4 select-none">:</span>

              {/* Minute input */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-400 font-semibold">분</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={String(minute).padStart(2, '0')}
                  onChange={e => handleMinuteInput(e.target.value)}
                  onFocus={e => e.target.select()}
                  className="w-14 h-11 text-center bg-white rounded-xl border-2 border-slate-200 font-mono text-lg font-bold text-slate-800 focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Confirm button */}
          <div className="px-3 pb-3">
            <button type="button" onClick={() => setOpen(false)} disabled={!selectedDate}
              className="w-full py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              {selectedDate
                ? `${format(selectedDate, 'M.d(EEE) HH:mm', { locale: ko })} 확정`
                : '날짜를 선택해주세요'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
