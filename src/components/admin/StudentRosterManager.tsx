'use client'

import { useState, useTransition, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  previewRosterUpload,
  commitRosterUpload,
  addStudentManually,
  setStudentStatus,
  type RosterPreview,
} from '@/app/actions/students'
import { Upload, UserPlus, AlertTriangle, Search, Check, X } from 'lucide-react'

interface StudentRow {
  studentId: string
  name: string
  grade: number
  className: string | null
  major: string | null
  status: string
  source: string
}

const inputCls =
  'w-full h-10 px-3.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary placeholder:text-base-muted/50 focus:outline-none focus:border-brand-rose transition-colors'

export function StudentRosterManager({ initialStudents }: { initialStudents: StudentRow[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const addFormRef = useRef<HTMLFormElement>(null)

  const [pending, startTransition] = useTransition()
  const [preview, setPreview] = useState<RosterPreview | null>(null)
  const [bulkConfirmed, setBulkConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const knownMajors = useMemo(
    () => Array.from(new Set(initialStudents.map((s) => s.major).filter((m): m is string => !!m))),
    [initialStudents],
  )

  const filtered = useMemo(() => {
    const q = query.replace(/\s+/g, '').toLowerCase()
    if (!q) return initialStudents
    return initialStudents.filter(
      (s) =>
        s.studentId.toLowerCase().includes(q) ||
        s.name.replace(/\s+/g, '').toLowerCase().includes(q) ||
        (s.major ?? '').toLowerCase().includes(q),
    )
  }, [initialStudents, query])

  function handlePreview(formData: FormData) {
    setError(null)
    setMessage(null)
    setBulkConfirmed(false)
    startTransition(async () => {
      const res = await previewRosterUpload(formData)
      if (!res.success) {
        setError(res.error)
        setPreview(null)
      } else {
        setPreview(res.preview)
      }
    })
  }

  function handleCommit() {
    if (!preview) return
    setError(null)
    startTransition(async () => {
      const res = await commitRosterUpload(preview.files.map((f) => f.fileName), preview.rows)
      if (!res.success) {
        setError(res.error)
      } else {
        setMessage(`반영 완료 — 추가 ${res.added}명 · 갱신 ${res.updated}명 · 비활성화 ${res.deactivated}명`)
        setPreview(null)
        setBulkConfirmed(false)
        if (fileRef.current) fileRef.current.value = ''
        router.refresh()
      }
    })
  }

  function handleAdd(formData: FormData) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const res = await addStudentManually(formData)
      if (!res.success) setError(res.error)
      else {
        setMessage('학생이 추가되었습니다.')
        addFormRef.current?.reset()
        router.refresh()
      }
    })
  }

  function handleToggle(studentId: string, next: 'active' | 'inactive') {
    startTransition(async () => {
      const res = await setStudentStatus(studentId, next)
      if (!res.success) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* 업로드 */}
      <div className="bg-surface-base rounded-2xl border border-base p-5 space-y-4">
        <h2 className="text-sm font-bold text-base-primary flex items-center gap-2">
          <Upload className="w-4 h-4" />
          명단 업로드
        </h2>
        <p className="text-xs text-base-muted leading-relaxed">
          엑셀(xls·xlsx) 또는 CSV 파일을 올립니다. <strong className="text-base-secondary">전공별 명부를 여러 개 한 번에</strong> 선택할 수 있습니다.
          교체 범위는 <strong className="text-base-secondary">업로드한 파일에 들어 있는 전공</strong>으로 한정되므로,
          한 전공만 올려도 다른 전공 학생은 그대로 유지됩니다. 확정 전에 변경 내용을 먼저 확인할 수 있습니다.
          필수 컬럼은 학번·이름·학년이고, 학과(전공)·반은 선택입니다.
        </p>
        <form action={handlePreview} className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept=".xls,.xlsx,.csv"
            multiple
            required
            className="text-sm text-base-secondary file:mr-3 file:h-10 file:px-4 file:rounded-xl file:border-0 file:bg-surface-raised file:text-base-secondary file:text-sm file:font-semibold"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-10 px-5 rounded-xl border border-base text-sm font-semibold text-base-secondary hover:bg-surface-raised disabled:opacity-50 transition-colors"
          >
            {pending ? '분석 중...' : '변경 내용 확인'}
          </button>
        </form>

        {preview && (
          <div className="rounded-xl border border-base bg-surface-raised p-4 space-y-3">
            <div className="space-y-1">
              {preview.files.map((f) => (
                <p key={f.fileName} className="text-sm font-semibold text-base-primary">
                  {f.fileName}
                  <span className="ml-2 text-xs font-normal text-base-muted">
                    {f.rowCount}명
                    {f.majors.length > 0 && ` · ${f.majors.join(', ')}`}
                    {f.skipped > 0 && ` · 건너뜀 ${f.skipped}행`}
                  </span>
                </p>
              ))}
            </div>

            <div className="text-xs bg-surface-base border border-base rounded-lg px-3 py-2 text-base-secondary">
              {preview.scopeMajors.length > 0 ? (
                <>
                  교체 범위: <strong className="text-base-primary">{preview.scopeMajors.join(', ')}</strong>
                  {preview.outOfScopeActive > 0 && (
                    <> · 범위 밖 <strong className="text-base-primary">{preview.outOfScopeActive}명</strong>은 그대로 유지됩니다</>
                  )}
                </>
              ) : (
                <>파일에 학과(전공) 정보가 없어 <strong className="text-base-primary">전체 명단을 교체</strong>합니다.</>
              )}
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">추가 {preview.addedCount}명</span>
              <span className="text-sky-600 dark:text-sky-400 font-semibold">갱신 {preview.updatedCount}명</span>
              <span className="text-base-muted">유지 {preview.unchangedCount}명</span>
              <span className="text-red-600 dark:text-red-400 font-semibold">비활성화 예정 {preview.deactivated.length}명</span>
              {preview.skipped > 0 && <span className="text-amber-600 dark:text-amber-400">건너뜀 {preview.skipped}행</span>}
            </div>

            {preview.deactivated.length > 0 && (
              <details className="text-xs text-base-secondary">
                <summary className="cursor-pointer hover:text-base-primary">비활성화 대상 보기</summary>
                <ul className="mt-2 space-y-0.5 max-h-40 overflow-y-auto">
                  {preview.deactivated.map((s) => (
                    <li key={s.studentId} className="font-mono">
                      {s.studentId} {s.name} ({s.grade}학년{s.major ? ` · ${s.major}` : ''})
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {preview.bulkWarning && (
              <label className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkConfirmed}
                  onChange={(e) => setBulkConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  교체 범위({preview.scopeMajors.length > 0 ? preview.scopeMajors.join(', ') : '전체'}) 안의
                  활성 학생 {preview.activeInScopeBefore}명 중 {preview.deactivated.length}명이 비활성화됩니다.
                  파일이 올바른지 확인했다면 체크해 주세요.
                </span>
              </label>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPreview(null); setBulkConfirmed(false) }}
                className="h-10 px-4 rounded-xl border border-base text-sm font-semibold text-base-secondary hover:bg-surface-overlay transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCommit}
                disabled={pending || (preview.bulkWarning && !bulkConfirmed)}
                className="h-10 px-5 rounded-xl bg-rose-600 dark:bg-brand-rose hover:bg-rose-700 dark:hover:bg-rose-400 text-white dark:text-zinc-950 text-sm font-bold disabled:opacity-40 transition-colors"
              >
                {pending ? '반영 중...' : '이대로 반영'}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      {message && (
        <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      {/* 개별 추가 */}
      <div className="bg-surface-base rounded-2xl border border-base p-5">
        <h2 className="text-sm font-bold text-base-primary mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          학생 개별 추가
        </h2>
        <form ref={addFormRef} action={handleAdd} className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-medium text-base-secondary">학번 *</label>
            <input name="studentId" required placeholder="2026102001" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-base-secondary">이름 *</label>
            <input name="name" required placeholder="홍길동" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-base-secondary">학년 *</label>
            <select name="grade" required defaultValue="" className={inputCls}>
              <option value="" disabled>선택</option>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-base-secondary">전공</label>
            <input name="major" list="major-options" placeholder="영상콘텐츠과" className={inputCls} />
            <datalist id="major-options">
              {knownMajors.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-base-secondary">반</label>
            <div className="flex gap-2">
              <input name="className" placeholder="A" className={inputCls} />
              <button
                type="submit"
                disabled={pending}
                className="h-10 px-4 shrink-0 rounded-xl bg-rose-600 dark:bg-brand-rose hover:bg-rose-700 dark:hover:bg-rose-400 text-white dark:text-zinc-950 text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                추가
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 목록 */}
      <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
        <div className="px-5 py-3.5 border-b border-base flex items-center gap-2">
          <h2 className="text-sm font-bold text-base-primary">등록된 학생</h2>
          <span className="text-xs text-base-muted">{filtered.length}명</span>
          <div className="ml-auto relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-base-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="학번·이름 검색"
              className="h-9 pl-8 pr-3 rounded-xl border border-base text-sm bg-surface-raised text-base-primary placeholder:text-base-muted/50 focus:outline-none focus:border-brand-rose"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-surface-raised border-b border-base">
                <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider">학번</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider">이름</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider">전공</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider">학년</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider">반</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider">상태</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-base-secondary uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-base-muted">등록된 학생이 없습니다.</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.studentId} className="hover:bg-surface-raised transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-base-secondary">{s.studentId}</td>
                  <td className="px-5 py-3 font-medium text-base-primary">{s.name}</td>
                  <td className="px-5 py-3 text-base-secondary text-xs">{s.major ?? '—'}</td>
                  <td className="px-5 py-3 text-base-secondary">{s.grade}학년</td>
                  <td className="px-5 py-3 text-base-secondary">{s.className ?? '—'}</td>
                  <td className="px-5 py-3">
                    {s.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <Check className="w-3 h-3" />활성
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-overlay text-base-muted border border-base">
                        <X className="w-3 h-3" />비활성
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleToggle(s.studentId, s.status === 'active' ? 'inactive' : 'active')}
                      disabled={pending}
                      className="text-xs font-semibold text-base-muted hover:text-base-primary disabled:opacity-50 transition-colors"
                    >
                      {s.status === 'active' ? '비활성화' : '활성화'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
