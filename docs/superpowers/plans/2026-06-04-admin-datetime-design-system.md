# 관리자 날짜/시간 입력 디자인 시스템 통일 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 페이지의 브라우저 기본 날짜/시간 입력(`datetime-local`, `date`, `time`)을 프로젝트 디자인 시스템 컴포넌트로 교체한다.

**Architecture:** 기존 `DateTimePicker` 컴포넌트(`src/components/ui/DateTimePicker.tsx`)의 UI 패턴을 따라 날짜 전용 `DatePicker`와 시간 전용 `TimePicker`를 신규 생성한다. `TestRequestForm`은 기존 `DateTimePicker`를 직접 사용하고, `ClassroomTimetableManager`는 `DatePicker` + `TimePicker`를 사용한다. 커스텀 컴포넌트는 controlled 상태로 관리되며, 폼 제출 시 `FormData`에 수동 주입한다.

**Tech Stack:** Next.js 14 App Router, React (`useState`, `useEffect`, `useRef`), date-fns, lucide-react, Tailwind CSS (design tokens: `bg-surface-raised`, `border-strong`, `brand-rose` 등)

---

## 파일 구조

| 파일 | 유형 | 역할 |
|------|------|------|
| `src/components/ui/DatePicker.tsx` | 신규 | 날짜만 선택 ("YYYY-MM-DD"). DateTimePicker에서 시간 섹션 제거 버전 |
| `src/components/ui/TimePicker.tsx` | 신규 | 시간만 선택 ("HH:MM"). 드롭다운 팝오버 + 시/분 숫자 입력 |
| `src/components/admin/TestRequestForm.tsx` | 수정 | `datetime-local` 4개 → `DateTimePicker` |
| `src/components/admin/ClassroomTimetableManager.tsx` | 수정 | `type="date"` 2개 → `DatePicker`, `type="time"` 2개 → `TimePicker` |

---

## Task 1: `DatePicker` 컴포넌트 생성

**Files:**
- Create: `src/components/ui/DatePicker.tsx`

### 컨텍스트

- 참고 파일: `src/components/ui/DateTimePicker.tsx` — 달력 그리드, 월 네비게이션, 요일 헤더, 날짜 셀 로직 동일하게 복사
- `DateTimePicker`와 차이: 시간 섹션 없음, 날짜 선택 즉시 `onChange` 호출 후 드롭다운 닫힘 (확인 버튼 불필요)
- Props: `value: string` ("yyyy-MM-dd"), `onChange: (v: string) => void`, `placeholder?: string`, `disablePast?: boolean`
- 트리거 버튼 표시: 날짜 선택 전 → placeholder, 선택 후 → `"M월 d일 (EEE)"` 형식

- [ ] **Step 1: 파일 생성**

`src/components/ui/DatePicker.tsx` 전체 내용:

```tsx
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
```

- [ ] **Step 2: TypeScript 체크**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
git add src/components/ui/DatePicker.tsx
git commit -m "feat: add DatePicker component (date-only, design system)"
```

---

## Task 2: `TimePicker` 컴포넌트 생성

**Files:**
- Create: `src/components/ui/TimePicker.tsx`

### 컨텍스트

- Props: `value: string` ("HH:MM"), `onChange: (v: string) => void`, `placeholder?: string`
- 트리거 버튼: 비어있을 때 placeholder, 선택 후 "HH:MM" 표시 (monospace)
- 팝오버: `DateTimePicker`의 시간 섹션과 동일한 시/분 number input 스타일
- 시/분 input 변경 즉시 `onChange` 호출 (실시간 반영)
- "확정" 버튼 클릭 시 팝오버 닫힘
- 아웃사이드 클릭 시 닫힘

- [ ] **Step 1: 파일 생성**

`src/components/ui/TimePicker.tsx` 전체 내용:

```tsx
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
```

- [ ] **Step 2: TypeScript 체크**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
git add src/components/ui/TimePicker.tsx
git commit -m "feat: add TimePicker component (time-only, design system)"
```

---

## Task 3: `TestRequestForm.tsx` — `datetime-local` → `DateTimePicker` 교체

**Files:**
- Modify: `src/components/admin/TestRequestForm.tsx`

### 컨텍스트

현재 폼에는 `<input type="datetime-local" name="startAt">`, `<input type="datetime-local" name="endAt">` 가 기자재 탭에 2개, 강의실 탭에 2개 (총 4개) 있다.

`handleEquipmentSubmit`와 `handleClassroomSubmit`는 `new FormData(e.currentTarget)`으로 네이티브 폼 데이터를 수집한다. `DateTimePicker`는 controlled state이므로 값이 FormData에 자동으로 들어가지 않는다 → 수동으로 `fd.set()` 필요.

폼 리셋 시 `formRef.current?.reset()`은 네이티브 input만 초기화하므로, `DateTimePicker` state도 별도로 초기화해야 한다.

**추가할 state 4개:**
```ts
const [equipStartAt, setEquipStartAt] = useState('')
const [equipEndAt, setEquipEndAt] = useState('')
const [classStartAt, setClassStartAt] = useState('')
const [classEndAt, setClassEndAt] = useState('')
```

- [ ] **Step 1: 현재 파일 확인**

```bash
head -80 "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement/src/components/admin/TestRequestForm.tsx"
```

- [ ] **Step 2: import 추가**

파일 맨 위 import에 `DateTimePicker` 추가:

기존:
```ts
import { createTestRentalRequest, createTestClassroomRentalRequest } from '@/app/actions/admin'
```

변경 후:
```ts
import { createTestRentalRequest, createTestClassroomRentalRequest } from '@/app/actions/admin'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
```

- [ ] **Step 3: 날짜 state 4개 추가**

기존 state 선언 블록 (예: `const [tab, setTab] = useState(...)` 이후):
```ts
  const [equipStartAt, setEquipStartAt] = useState('')
  const [equipEndAt, setEquipEndAt] = useState('')
  const [classStartAt, setClassStartAt] = useState('')
  const [classEndAt, setClassEndAt] = useState('')
```

- [ ] **Step 4: handleEquipmentSubmit에 날짜 주입 추가**

기존:
```ts
  function handleEquipmentSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setEquipmentResult(null)
```

변경 후:
```ts
  function handleEquipmentSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('startAt', equipStartAt)
    fd.set('endAt', equipEndAt)
    setEquipmentResult(null)
```

- [ ] **Step 5: 기자재 폼 리셋 시 날짜 상태 초기화**

기존:
```ts
      if (result.success) equipmentFormRef.current?.reset()
```

변경 후:
```ts
      if (result.success) {
        equipmentFormRef.current?.reset()
        setEquipStartAt('')
        setEquipEndAt('')
      }
```

- [ ] **Step 6: handleClassroomSubmit에 날짜 주입 추가**

기존:
```ts
  function handleClassroomSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setClassroomResult(null)
```

변경 후:
```ts
  function handleClassroomSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('startAt', classStartAt)
    fd.set('endAt', classEndAt)
    setClassroomResult(null)
```

- [ ] **Step 7: 강의실 폼 리셋 시 날짜 상태 초기화**

기존:
```ts
      if (result.success) {
        classroomFormRef.current?.reset()
        setIsGroup(false)
      }
```

변경 후:
```ts
      if (result.success) {
        classroomFormRef.current?.reset()
        setIsGroup(false)
        setClassStartAt('')
        setClassEndAt('')
      }
```

- [ ] **Step 8: 기자재 탭 datetime-local 입력 교체**

기존 (기자재 탭의 대여 시작/종료 grid):
```tsx
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>대여 시작 *</label>
              <input type="datetime-local" name="startAt" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>대여 종료 *</label>
              <input type="datetime-local" name="endAt" required className={inputClass} />
            </div>
          </div>
```

변경 후:
```tsx
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>대여 시작 *</label>
              <DateTimePicker value={equipStartAt} onChange={setEquipStartAt} placeholder="대여 시작" />
            </div>
            <div>
              <label className={labelClass}>대여 종료 *</label>
              <DateTimePicker value={equipEndAt} onChange={setEquipEndAt} placeholder="대여 종료" />
            </div>
          </div>
```

- [ ] **Step 9: 강의실 탭 datetime-local 입력 교체**

기존 (강의실 탭의 대여 시작/종료 grid):
```tsx
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>대여 시작 *</label>
              <input type="datetime-local" name="startAt" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>대여 종료 *</label>
              <input type="datetime-local" name="endAt" required className={inputClass} />
            </div>
          </div>
```

변경 후:
```tsx
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>대여 시작 *</label>
              <DateTimePicker value={classStartAt} onChange={setClassStartAt} placeholder="대여 시작" />
            </div>
            <div>
              <label className={labelClass}>대여 종료 *</label>
              <DateTimePicker value={classEndAt} onChange={setClassEndAt} placeholder="대여 종료" />
            </div>
          </div>
```

- [ ] **Step 10: TypeScript 체크**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

- [ ] **Step 11: 커밋**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
git add src/components/admin/TestRequestForm.tsx
git commit -m "feat: replace datetime-local with DateTimePicker in TestRequestForm"
```

---

## Task 4: `ClassroomTimetableManager.tsx` — date/time 입력 교체

**Files:**
- Modify: `src/components/admin/ClassroomTimetableManager.tsx`

### 컨텍스트

현재 폼에는:
- `<Input type="time" name="startTime">` — `TimePicker`로 교체
- `<Input type="time" name="endTime">` — `TimePicker`로 교체
- `<Input type="date" name="semesterStart">` — `DatePicker`로 교체
- `<Input type="date" name="semesterEnd">` — `DatePicker`로 교체

현재 폼: `<form ref={formRef} action={handleAdd} className="p-5 space-y-4">`
- `action={handleAdd}` 방식은 Next.js server action 형식으로 FormData를 자동 수집
- 커스텀 컴포넌트로 교체 시 해당 값들이 FormData에 자동 포함되지 않음
- → `onSubmit` 방식으로 전환하고, state 값들을 `fd.set()`으로 수동 주입

`createTimetableEntry` 서버 액션 입력 형식:
- `startTime`, `endTime`: "HH:MM" 문자열 (`TimePicker` 출력과 동일)
- `semesterStart`, `semesterEnd`: `new Date(string)`으로 파싱되므로 "YYYY-MM-DD" 형식 OK (`DatePicker` 출력과 동일)

`dayOfWeek`, `courseName` 필드는 네이티브 `<select>`, `<Input>`이 그대로 유지되므로 FormData에 자동 포함됨.

**추가할 state 4개:**
```ts
const [startTime, setStartTime] = useState('')
const [endTime, setEndTime] = useState('')
const [semesterStart, setSemesterStart] = useState('')
const [semesterEnd, setSemesterEnd] = useState('')
```

- [ ] **Step 1: 현재 파일 확인**

```bash
cat "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement/src/components/admin/ClassroomTimetableManager.tsx"
```

- [ ] **Step 2: import 추가**

기존 import에서 `Input`, `Label`을 유지하면서 새 컴포넌트 추가:

기존:
```ts
import { createTimetableEntry, deleteTimetableEntry } from '@/app/actions/timetable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, CalendarDays, Clock, AlertTriangle } from 'lucide-react'
```

변경 후:
```ts
import { createTimetableEntry, deleteTimetableEntry } from '@/app/actions/timetable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/DatePicker'
import { TimePicker } from '@/components/ui/TimePicker'
import { Trash2, Plus, CalendarDays, Clock, AlertTriangle } from 'lucide-react'
```

- [ ] **Step 3: state 4개 추가**

기존 state 선언들 (예: `const [entries, setEntries] = useState(...)`) 바로 아래에 추가:
```ts
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [semesterStart, setSemesterStart] = useState('')
  const [semesterEnd, setSemesterEnd] = useState('')
```

- [ ] **Step 4: `handleAdd` 함수를 `handleAddSubmit`으로 교체**

기존:
```ts
  function handleAdd(formData: FormData) {
    setError(null)
    setSuccessMsg(null)
    formData.set('classroomId', String(classroomId))
    startAddTransition(async () => {
      const result = await createTimetableEntry(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setEntries((prev) => [...prev, result.entry])
        setSuccessMsg('시간표가 추가되었습니다.')
        formRef.current?.reset()
        router.refresh()
      }
    })
  }
```

변경 후 (함수 이름 및 시그니처 변경):
```ts
  function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('classroomId', String(classroomId))
    formData.set('startTime', startTime)
    formData.set('endTime', endTime)
    formData.set('semesterStart', semesterStart)
    formData.set('semesterEnd', semesterEnd)
    setError(null)
    setSuccessMsg(null)
    startAddTransition(async () => {
      const result = await createTimetableEntry(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setEntries((prev) => [...prev, result.entry])
        setSuccessMsg('시간표가 추가되었습니다.')
        formRef.current?.reset()
        setStartTime('')
        setEndTime('')
        setSemesterStart('')
        setSemesterEnd('')
        router.refresh()
      }
    })
  }
```

- [ ] **Step 5: form 태그의 `action` → `onSubmit` 변경**

기존:
```tsx
        <form ref={formRef} action={handleAdd} className="p-5 space-y-4">
```

변경 후:
```tsx
        <form ref={formRef} onSubmit={handleAddSubmit} className="p-5 space-y-4">
```

- [ ] **Step 6: 수업 시작 시간 `Input type="time"` → `TimePicker` 교체**

기존:
```tsx
            {/* 시작 시간 */}
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">
                <Clock className="inline w-3 h-3 mr-1" />
                수업 시작 시간 *
              </Label>
              <Input
                name="startTime"
                type="time"
                required
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl"
              />
            </div>
```

변경 후:
```tsx
            {/* 시작 시간 */}
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">
                <Clock className="inline w-3 h-3 mr-1" />
                수업 시작 시간 *
              </Label>
              <TimePicker value={startTime} onChange={setStartTime} placeholder="시작 시간 선택" />
            </div>
```

- [ ] **Step 7: 수업 종료 시간 `Input type="time"` → `TimePicker` 교체**

기존:
```tsx
            {/* 종료 시간 */}
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">
                <Clock className="inline w-3 h-3 mr-1" />
                수업 종료 시간 *
              </Label>
              <Input
                name="endTime"
                type="time"
                required
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl"
              />
            </div>
```

변경 후:
```tsx
            {/* 종료 시간 */}
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">
                <Clock className="inline w-3 h-3 mr-1" />
                수업 종료 시간 *
              </Label>
              <TimePicker value={endTime} onChange={setEndTime} placeholder="종료 시간 선택" />
            </div>
```

- [ ] **Step 8: 학기 시작일 `Input type="date"` → `DatePicker` 교체**

기존:
```tsx
            {/* 학기 시작일 */}
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">학기 시작일 *</Label>
              <Input
                name="semesterStart"
                type="date"
                required
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl"
              />
            </div>
```

변경 후:
```tsx
            {/* 학기 시작일 */}
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">학기 시작일 *</Label>
              <DatePicker value={semesterStart} onChange={setSemesterStart} placeholder="시작일 선택" />
            </div>
```

- [ ] **Step 9: 학기 종료일 `Input type="date"` → `DatePicker` 교체**

기존:
```tsx
            {/* 학기 종료일 */}
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">학기 종료일 *</Label>
              <Input
                name="semesterEnd"
                type="date"
                required
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl"
              />
            </div>
```

변경 후:
```tsx
            {/* 학기 종료일 */}
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">학기 종료일 *</Label>
              <DatePicker value={semesterEnd} onChange={setSemesterEnd} placeholder="종료일 선택" />
            </div>
```

- [ ] **Step 10: TypeScript 체크**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

- [ ] **Step 11: 커밋**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
git add src/components/admin/ClassroomTimetableManager.tsx
git commit -m "feat: replace date/time inputs with DatePicker/TimePicker in ClassroomTimetableManager"
```

---

## 자체 검토

### 스펙 커버리지

| 요구사항 | 태스크 |
|---------|--------|
| `DatePicker` 컴포넌트 신규 생성 | Task 1 |
| `TimePicker` 컴포넌트 신규 생성 | Task 2 |
| `TestRequestForm` datetime-local → DateTimePicker (기자재) | Task 3 |
| `TestRequestForm` datetime-local → DateTimePicker (강의실) | Task 3 |
| `ClassroomTimetableManager` time → TimePicker (2개) | Task 4 |
| `ClassroomTimetableManager` date → DatePicker (2개) | Task 4 |

모두 커버 ✅

### Placeholder 스캔

없음 ✅

### 타입 일관성

- `DatePicker` Props: `value: string ("yyyy-MM-dd")`, `onChange: (v: string) => void` — Task 4에서 `semesterStart`/`semesterEnd` state (string)와 일치 ✅
- `TimePicker` Props: `value: string ("HH:MM")`, `onChange: (v: string) => void` — Task 4에서 `startTime`/`endTime` state와 일치, 서버 액션 기대값("HH:MM")과 일치 ✅
- `DateTimePicker` Props: `value: string ("yyyy-MM-ddTHH:mm")`, `onChange: (v: string) => void` — Task 3에서 `equipStartAt` 등 state와 일치, 서버 액션 기대값과 일치 ✅

### 서버 액션 형식 검증

- `createTestRentalRequest`: `startAt = new Date(formData.get('startAt'))` — `DateTimePicker` 출력 "yyyy-MM-ddTHH:mm" → `new Date()` 파싱 OK ✅
- `createTimetableEntry`: `startTime = formData.get('startTime').trim()`, 비교: `startTime >= endTime` 문자열 비교 — "HH:MM" 형식 OK ✅
- `createTimetableEntry`: `semesterStart = new Date(formData.get('semesterStart'))` — "YYYY-MM-DD" → `new Date()` 파싱 OK ✅
