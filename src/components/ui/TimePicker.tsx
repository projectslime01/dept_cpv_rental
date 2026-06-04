'use client'

import { useState, useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'

interface Props {
  value: string    // "HH:MM"
  onChange: (v: string) => void
  placeholder?: string
}

function parseHM(v: string): [number, number] {
  const parts = v.split(':')
  const h = parseInt(parts[0] ?? '', 10)
  const m = parseInt(parts[1] ?? '', 10)
  return [
    isNaN(h) ? 9 : Math.max(0, Math.min(23, h)),
    isNaN(m) ? 0 : Math.max(0, Math.min(59, m)),
  ]
}

export function TimePicker({ value, onChange, placeholder = '시간 선택' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const [initH, initM] = value ? parseHM(value) : [9, 0]
  const [hour, setHour] = useState(initH)
  const [minute, setMinute] = useState(initM)

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
    const [h, m] = value ? parseHM(value) : [9, 0]
    setHour(h)
    setMinute(m)
  }, [value])

  function emit(h: number, m: number) {
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }

  function handleHour(raw: string) {
    if (raw === '') { setHour(0); emit(0, minute); return }
    const n = Math.max(0, Math.min(23, parseInt(raw, 10) || 0))
    setHour(n)
    emit(n, minute)
  }

  function handleMinute(raw: string) {
    if (raw === '') { setMinute(0); emit(hour, 0); return }
    const n = Math.max(0, Math.min(59, parseInt(raw, 10) || 0))
    setMinute(n)
    emit(hour, n)
  }

  const displayText = value || null

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
        <Clock className={`w-4 h-4 shrink-0 ${displayText ? 'text-base-primary' : 'text-base-faint'}`} />
        <span className={`flex-1 text-left font-mono ${displayText ? 'text-base-primary font-medium' : 'text-base-faint'}`}>
          {displayText ?? placeholder}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 bg-surface-base rounded-2xl shadow-2xl border border-strong w-52 overflow-hidden">
          <div className="border-b border-base bg-surface px-3 py-2.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-base-muted" />
            <span className="text-[10px] font-bold text-base-muted uppercase tracking-wider">시간 선택</span>
          </div>
          <div className="px-4 py-4 space-y-3 bg-surface-raised">
            <div className="flex items-center gap-3 justify-center">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-base-muted font-semibold">시</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={String(hour).padStart(2, '0')}
                  onChange={e => handleHour(e.target.value)}
                  onFocus={e => e.target.select()}
                  className="w-14 h-11 text-center bg-surface-base rounded-xl border-2 border-strong font-mono text-lg font-bold text-base-primary focus:outline-none focus:border-brand-rose transition-colors"
                />
              </div>
              <span className="text-2xl font-black text-base-muted mt-4 select-none">:</span>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-base-muted font-semibold">분</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={String(minute).padStart(2, '0')}
                  onChange={e => handleMinute(e.target.value)}
                  onFocus={e => e.target.select()}
                  className="w-14 h-11 text-center bg-surface-base rounded-xl border-2 border-strong font-mono text-lg font-bold text-base-primary focus:outline-none focus:border-brand-rose transition-colors"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2.5 bg-brand-rose text-white text-sm font-semibold rounded-xl hover:bg-brand-rose/90 transition-colors"
            >
              {`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} 확정`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
