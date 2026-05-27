'use client'

import { useState, useTransition } from 'react'
import { createTimetableEntry, deleteTimetableEntry } from '@/app/actions/timetable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, CalendarDays, Clock } from 'lucide-react'
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
  roomNumber: string
  initialEntries: TimetableEntryRow[]
}

function formatDateStr(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function ClassroomTimetableManager({ classroomId, roomNumber, initialEntries }: Props) {
  const [entries, setEntries] = useState<TimetableEntryRow[]>(initialEntries)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleAdd(formData: FormData) {
    setError(null)
    setSuccess(false)
    formData.set('classroomId', String(classroomId))
    startTransition(async () => {
      const result = await createTimetableEntry(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setSuccess(true)
        // Reload entries by re-fetching (simple approach: force a page reload via revalidation)
        // We refresh the entries list by calling a refetch — for now just reload
        window.location.reload()
      }
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteTimetableEntry(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(entry.id)}
                        disabled={isPending}
                        className="border-strong text-red-600 hover:bg-red-500/10 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 rounded-lg h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
        <form action={handleAdd} className="p-5 space-y-4">
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
              <Input
                name="startTime"
                type="time"
                required
                className="bg-surface-raised border-strong text-base-primary focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl"
              />
            </div>

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
          </div>

          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-500 font-medium">시간표가 추가되었습니다.</p>
          )}

          <div className="pt-1">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl h-10 px-5"
            >
              {isPending ? '추가 중...' : '시간표 추가'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
