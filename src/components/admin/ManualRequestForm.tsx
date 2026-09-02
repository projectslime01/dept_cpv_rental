'use client'

import { useTransition, useRef, useState } from 'react'
import {
  createManualBatchRentalRequest,
  createManualClassroomRentalRequest,
} from '@/app/actions/admin'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { Plus, X } from 'lucide-react'

interface Equipment {
  id: number
  name: string
  category: string
  totalQuantity: number
}

interface ClassroomOption {
  id: number
  roomNumber: string
}

interface Props {
  equipments: Equipment[]
  classrooms: ClassroomOption[]
}

interface EquipRow {
  key: number
  equipmentId: number | ''
  quantity: number
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-base bg-surface-raised text-sm text-base-primary placeholder:text-base-faint focus:outline-none focus:border-brand-rose transition-colors'
const labelClass = 'block text-xs font-semibold text-base-secondary mb-1.5'

type Result = { success: true; requestNumber: string } | { success: false; error: string } | null

function ResultBanner({
  result,
  renderSuccess,
}: {
  result: Result
  renderSuccess?: (requestNumber: string) => string
}) {
  if (!result) return null
  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm font-medium border ${
        result.success
          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
          : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30'
      }`}
    >
      {result.success
        ? renderSuccess
          ? renderSuccess(result.requestNumber)
          : `✅ 등록 완료 (즉시 승인) — 신청번호: ${result.requestNumber}`
        : `❌ ${result.error}`}
    </div>
  )
}

export function ManualRequestForm({ equipments, classrooms }: Props) {
  const [tab, setTab] = useState<'equipment' | 'classroom'>('equipment')
  const [rows, setRows] = useState<EquipRow[]>([
    { key: 0, equipmentId: equipments[0]?.id ?? '', quantity: 1 },
  ])
  const nextKey = useRef(1)
  const [isGroup, setIsGroup] = useState(false)
  const [equipmentPending, startEquipmentTransition] = useTransition()
  const [classroomPending, startClassroomTransition] = useTransition()
  const [equipmentResult, setEquipmentResult] = useState<Result>(null)
  const [classroomResult, setClassroomResult] = useState<Result>(null)
  const [lastEquipCount, setLastEquipCount] = useState(1)
  const [equipStartAt, setEquipStartAt] = useState('')
  const [equipEndAt, setEquipEndAt] = useState('')
  const [classStartAt, setClassStartAt] = useState('')
  const [classEndAt, setClassEndAt] = useState('')
  const equipmentFormRef = useRef<HTMLFormElement>(null)
  const classroomFormRef = useRef<HTMLFormElement>(null)

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: nextKey.current++, equipmentId: equipments[0]?.id ?? '', quantity: 1 },
    ])
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)))
  }

  function updateRow(key: number, patch: Partial<EquipRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function resetEquipmentForm() {
    equipmentFormRef.current?.reset()
    setRows([{ key: nextKey.current++, equipmentId: equipments[0]?.id ?? '', quantity: 1 }])
    setEquipStartAt('')
    setEquipEndAt('')
  }

  function handleEquipmentSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const items = rows
      .filter((r) => r.equipmentId !== '')
      .map((r) => ({ equipmentId: Number(r.equipmentId), quantity: r.quantity }))
    if (items.length === 0) {
      setEquipmentResult({ success: false, error: '기자재를 1개 이상 추가해주세요.' })
      return
    }
    if (items.some((it) => !Number.isInteger(it.quantity) || it.quantity < 1)) {
      setEquipmentResult({ success: false, error: '각 기자재 수량은 1개 이상이어야 합니다.' })
      return
    }
    if (!equipStartAt || !equipEndAt) {
      setEquipmentResult({ success: false, error: '대여 시작일과 종료일을 선택해주세요.' })
      return
    }
    const fd = new FormData(e.currentTarget)
    fd.set('startAt', equipStartAt)
    fd.set('endAt', equipEndAt)
    fd.set('items', JSON.stringify(items))
    setEquipmentResult(null)
    setLastEquipCount(items.length)
    startEquipmentTransition(async () => {
      const result = await createManualBatchRentalRequest(fd)
      setEquipmentResult(result)
      if (result.success) resetEquipmentForm()
    })
  }

  function handleClassroomSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!classStartAt || !classEndAt) {
      setClassroomResult({ success: false, error: '대여 시작일과 종료일을 선택해주세요.' })
      return
    }
    const fd = new FormData(e.currentTarget)
    fd.set('startAt', classStartAt)
    fd.set('endAt', classEndAt)
    setClassroomResult(null)
    startClassroomTransition(async () => {
      const result = await createManualClassroomRentalRequest(fd)
      setClassroomResult(result)
      if (result.success) {
        classroomFormRef.current?.reset()
        setIsGroup(false)
        setClassStartAt('')
        setClassEndAt('')
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* 탭 */}
      <div className="flex border-b border-base gap-2">
        <button
          type="button"
          onClick={() => setTab('equipment')}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 transition-all duration-200 ${
            tab === 'equipment'
              ? 'border-brand-rose text-brand-rose'
              : 'border-transparent text-base-secondary hover:text-base-primary'
          }`}
        >
          기자재
        </button>
        <button
          type="button"
          onClick={() => setTab('classroom')}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 transition-all duration-200 ${
            tab === 'classroom'
              ? 'border-brand-rose text-brand-rose'
              : 'border-transparent text-base-secondary hover:text-base-primary'
          }`}
        >
          강의실
        </button>
      </div>

      {/* 기자재 탭 */}
      {tab === 'equipment' && (
        <form ref={equipmentFormRef} onSubmit={handleEquipmentSubmit} className="space-y-4">
          <ResultBanner
            result={equipmentResult}
            renderSuccess={(rn) =>
              lastEquipCount > 1
                ? `✅ ${lastEquipCount}종 일괄 등록 완료 (즉시 승인) — 그룹번호: ${rn}`
                : `✅ 등록 완료 (즉시 승인) — 신청번호: ${rn}`
            }
          />

          {/* 기자재 목록 (여러 개 추가 가능) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`${labelClass} mb-0`}>기자재 목록 * (여러 개 추가 가능)</label>
              <button
                type="button"
                onClick={addRow}
                disabled={equipments.length === 0}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-rose hover:opacity-80 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> 기자재 추가
              </button>
            </div>

            {rows.map((row, idx) => (
              <div key={row.key} className="flex items-center gap-2">
                <span className="shrink-0 w-6 text-center text-xs font-semibold text-base-faint tabular-nums">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <select
                    required
                    value={row.equipmentId}
                    onChange={(e) => updateRow(row.key, { equipmentId: parseInt(e.target.value) })}
                    className={inputClass}
                  >
                    {equipments.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        [{eq.category}] {eq.name} (총 {eq.totalQuantity}개 보유)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative w-24 shrink-0">
                  <input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) =>
                      updateRow(row.key, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    aria-label="수량"
                    className={`${inputClass} pr-8 text-right tabular-nums`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-base-muted">
                    개
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length <= 1}
                  aria-label="기자재 삭제"
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-base text-base-muted hover:text-red-500 hover:border-red-300 disabled:opacity-30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <p className="text-xs text-base-muted">
              수량은 최대 한도·재고를 초과해도 그대로 등록됩니다. 2개 이상이면 한 건(일괄 신청)으로 묶입니다.
            </p>
          </div>

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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>신청자 이름 *</label>
              <input type="text" name="applicantName" required placeholder="홍길동" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>학번 *</label>
              <input type="text" name="studentId" required placeholder="20240001" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>연락처 *</label>
              <input type="text" name="phone" required placeholder="010-0000-0000" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>조회용 비밀번호 (선택 · 4~8자)</label>
            <input type="password" name="password" minLength={4} maxLength={8} placeholder="미입력 시 조회 불가" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>목적 (선택)</label>
            <textarea name="purpose" rows={2} placeholder="예) OOO 수업 실습용" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>관리자 메모 (선택)</label>
            <input type="text" name="memo" placeholder="예) 학과장 승인 · 5/12 유선 접수" className={inputClass} />
          </div>

          <button
            type="submit"
            disabled={equipmentPending || equipments.length === 0}
            className="w-full py-2.5 rounded-xl bg-brand-rose text-white font-semibold text-sm disabled:opacity-50 hover:bg-brand-rose/90 transition-colors"
          >
            {equipmentPending ? '처리 중...' : '규정 무시하고 등록 (즉시 승인)'}
          </button>
        </form>
      )}

      {/* 강의실 탭 */}
      {tab === 'classroom' && (
        <form ref={classroomFormRef} onSubmit={handleClassroomSubmit} className="space-y-4">
          <ResultBanner result={classroomResult} />

          <div>
            <label className={labelClass}>강의실 *</label>
            {classrooms.length === 0 ? (
              <p className="text-sm text-base-muted py-2">등록된 강의실이 없습니다.</p>
            ) : (
              <select name="classroomId" required className={inputClass}>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.roomNumber}
                  </option>
                ))}
              </select>
            )}
          </div>

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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>신청자 이름 *</label>
              <input type="text" name="applicantName" required placeholder="홍길동" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>학번 *</label>
              <input type="text" name="studentId" required placeholder="20240001" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>연락처 *</label>
              <input type="text" name="phone" required placeholder="010-0000-0000" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>조회용 비밀번호 (선택 · 4~8자)</label>
              <input type="password" name="password" minLength={4} maxLength={8} placeholder="미입력 시 조회 불가" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>모니터 자산 (선택)</label>
              <input type="text" name="monitorAssets" placeholder="없음" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>목적 (선택)</label>
            <textarea name="purpose" rows={2} placeholder="예) OOO 수업 촬영" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>관리자 메모 (선택)</label>
            <input type="text" name="memo" placeholder="예) 학과장 승인 · 5/12 유선 접수" className={inputClass} />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="manualIsGroup"
              checked={isGroup}
              onChange={(e) => setIsGroup(e.target.checked)}
              className="w-4 h-4 accent-brand-rose"
            />
            <label htmlFor="manualIsGroup" className="text-sm text-base-primary cursor-pointer">
              단체 신청
            </label>
            <input type="hidden" name="isGroup" value={String(isGroup)} />
          </div>

          {isGroup && (
            <div className="grid grid-cols-2 gap-3 pl-6">
              <div>
                <label className={labelClass}>인원 수 *</label>
                <input type="number" name="groupCount" required={isGroup} min={2} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>구성원 (선택)</label>
                <input type="text" name="groupMembers" placeholder="홍길동, 김철수" className={inputClass} />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={classroomPending || classrooms.length === 0}
            className="w-full py-2.5 rounded-xl bg-brand-rose text-white font-semibold text-sm disabled:opacity-50 hover:bg-brand-rose/90 transition-colors"
          >
            {classroomPending ? '처리 중...' : '규정 무시하고 등록 (즉시 승인)'}
          </button>
        </form>
      )}
    </div>
  )
}
