'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createTimetableEntry, deleteTimetableEntry } from '@/app/actions/timetable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/DatePicker'
import { TimePicker } from '@/components/ui/TimePicker'
import { Trash2, Plus, CalendarDays, Clock, AlertTriangle } from 'lucide-react'
import { DOW_LABELS } from '@/lib/timetable'

export interface TimetableEntryRow {
  id: number
  classroomId: number
  dayOfWeek: number
  startTime: string
  endTime: string
  courseName: string | null
  semesterStart: string // ISO string
  semesterEnd: string   // ISO string
}

interface Props {
  classroomId: number
  initialEntries: TimetableEntryRow[]
}

function formatDateStr(iso: string): string {
  // "YYYY-MM-DDTHH:..." → "YYYY-MM-DD"
  return iso.substring(0, 10)
}

export function ClassroomTimetableManager({ classroomId, initialEntries }: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const [entries, setEntries] = useState<TimetableEntryRow[]>(initialEntries)
  const [addPending, startAddTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  // id of the row waiting for delete confirmation; null = none
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [semesterStart, setSemesterStart] = useState('')
  const [semesterEnd, setSemesterEnd] = useState('')

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
        // 새 항목을 로컬 state에 추가 — 페이지 새로고침 없이 즉시 반영
        setEntries((prev) => [...prev, result.entry])
        setSuccessMsg('시간표가 추가되었습니다.')
        formRef.current?.reset()
        setStartTime('')
        setEndTime('')
        setSemesterStart('')
        setSemesterEnd('')
        router.refresh() // 서버 캐시 동기화 (백그라운드)
      }
    })
  }

  function handleDeleteRequest(id: number) {
    setConfirmDeleteId(id)
  }

  function handleDeleteCancel() {
    setConfirmDeleteId(null)
  }

  function handleDeleteConfirm(id: number) {
    setConfirmDeleteId(null)
    startDeleteTransition(async () => {
      await deleteTimetableEntry(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
      router.refresh()
    })
  }

  const sorted = [...entries].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek
    return a.startTime.localeCompare(b.startTime)
  })

  return (
    <div className="space-y-6">
      {/* 기존 시간표 목록 */}
      <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-subtle">
          <CalendarDays className="w-4 h-4 text-rose-500" />
          <h2 className="text-sm font-semibold text-base-secondary">등록된 수업 시간표</h2>
          <span className="ml-auto text-xs text-base-muted">{entries.length}개 항목</span>
        </div>

        {sorted.length === 0 ? (
          <div className="py-12 text-center text-sm text-base-muted">
            등록된 시간표가 없습니다. 아래에서 수업을 추가해주세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-surface-raised border-b border-base">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">요일</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">수업 시간</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">과목명</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">학기 기간</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-base-muted whitespace-nowrap">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border-subtle))]">
                {sorted.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-raised transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-600 dark:text-rose-400">
                        {DOW_LABELS[entry.dayOfWeek]}요일
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-base-primary font-semibold">
                      {entry.startTime} ~ {entry.endTime}
                    </td>
                    <td className="px-4 py-3 text-base-secondary">
                      {entry.courseName ?? <span className="text-base-faint text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-base-muted font-mono">
                      {formatDateStr(entry.semesterStart)} ~ {formatDateStr(entry.semesterEnd)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {confirmDeleteId === entry.id ? (
                        /* 삭제 확인 인라인 */
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-[10px] text-red-500 font-semibold whitespace-nowrap">삭제할까요?</span>
                          <Button
                            size="sm"
                            onClick={() => handleDeleteConfirm(entry.id)}
                            disabled={deletePending}
                            className="h-7 px-2 text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg"
                          >
                            확인
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDeleteCancel}
                            disabled={deletePending}
                            className="h-7 px-2 text-[10px] border-strong text-base-secondary hover:bg-surface-overlay rounded-lg"
                          >
                            취소
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteRequest(entry.id)}
                          disabled={deletePending}
                          className="border-strong text-red-600 hover:bg-red-500/10 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 rounded-lg h-8 w-8 p-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 새 시간표 추가 폼 */}
      <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-subtle">
          <Plus className="w-4 h-4 text-brand-indigo" />
          <h2 className="text-sm font-semibold text-base-secondary">수업 시간표 추가</h2>
        </div>
        <form ref={formRef} onSubmit={handleAddSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 요일 */}
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">요일 *</Label>
              <select
                name="dayOfWeek"
                required
                className="w-full h-10 rounded-xl border border-[hsl(var(--border-strong))] bg-surface-raised px-3 text-sm text-base-primary focus:outline-none focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo"
              >
                {DOW_LABELS.map((label, idx) => (
                  <option key={idx} value={idx}>{label}요일</option>
                ))}
              </select>
            </div>

            {/* 과목명 */}
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">과목명 (선택)</Label>
              <Input
                name="courseName"
                placeholder="예: 영상 편집 실습"
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl"
              />
            </div>

            {/* 시작 시간 */}
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">
                <Clock className="inline w-3 h-3 mr-1" />
                수업 시작 시간 *
              </Label>
              <TimePicker value={startTime} onChange={setStartTime} placeholder="시작 시간 선택" />
            </div>

            {/* 종료 시간 */}
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">
                <Clock className="inline w-3 h-3 mr-1" />
                수업 종료 시간 *
              </Label>
              <TimePicker value={endTime} onChange={setEndTime} placeholder="종료 시간 선택" />
            </div>

            {/* 학기 시작일 */}
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">학기 시작일 *</Label>
              <DatePicker value={semesterStart} onChange={setSemesterStart} placeholder="시작일 선택" />
            </div>

            {/* 학기 종료일 */}
            <div className="space-y-1.5">
              <Label className="text-base-secondary text-xs font-semibold">학기 종료일 *</Label>
              <DatePicker value={semesterEnd} onChange={setSemesterEnd} placeholder="종료일 선택" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <p className="text-sm text-emerald-500 font-medium">{successMsg}</p>
          )}

          <div className="pt-1">
            <Button
              type="submit"
              disabled={addPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl h-10 px-5"
            >
              {addPending ? '추가 중...' : '시간표 추가'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
