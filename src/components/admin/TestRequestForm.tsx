'use client'

import { useTransition, useRef, useState } from 'react'
import { createTestRentalRequest, createTestClassroomRentalRequest } from '@/app/actions/admin'

interface Equipment {
  id: number
  name: string
  category: string
  totalQuantity: number
  minRentalQuantity: number
  maxRentalQuantity: number | null
}

interface ClassroomOption {
  id: number
  roomNumber: string
}

interface Props {
  equipments: Equipment[]
  classrooms: ClassroomOption[]
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-base bg-surface-raised text-sm text-base-primary placeholder:text-base-faint focus:outline-none focus:border-brand-rose transition-colors'
const labelClass = 'block text-xs font-semibold text-base-secondary mb-1.5'

export function TestRequestForm({ equipments, classrooms }: Props) {
  const [tab, setTab] = useState<'equipment' | 'classroom'>('equipment')
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(
    equipments[0]?.id ?? null,
  )
  const [isGroup, setIsGroup] = useState(false)
  const [equipmentPending, startEquipmentTransition] = useTransition()
  const [classroomPending, startClassroomTransition] = useTransition()
  const [equipmentResult, setEquipmentResult] = useState<
    { success: true; requestNumber: string } | { success: false; error: string } | null
  >(null)
  const [classroomResult, setClassroomResult] = useState<
    { success: true; requestNumber: string } | { success: false; error: string } | null
  >(null)
  const equipmentFormRef = useRef<HTMLFormElement>(null)
  const classroomFormRef = useRef<HTMLFormElement>(null)

  const selectedEquipment = equipments.find((e) => e.id === selectedEquipmentId) ?? null
  const minQty = selectedEquipment?.minRentalQuantity ?? 1
  const maxQty = selectedEquipment
    ? selectedEquipment.maxRentalQuantity !== null
      ? Math.min(selectedEquipment.maxRentalQuantity, selectedEquipment.totalQuantity)
      : selectedEquipment.totalQuantity
    : 1

  function handleEquipmentSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setEquipmentResult(null)
    startEquipmentTransition(async () => {
      const result = await createTestRentalRequest(fd)
      setEquipmentResult(result)
      if (result.success) equipmentFormRef.current?.reset()
    })
  }

  function handleClassroomSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setClassroomResult(null)
    startClassroomTransition(async () => {
      const result = await createTestClassroomRentalRequest(fd)
      setClassroomResult(result)
      if (result.success) {
        classroomFormRef.current?.reset()
        setIsGroup(false)
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
          {equipmentResult && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium border ${
                equipmentResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30'
              }`}
            >
              {equipmentResult.success
                ? `✅ 테스트 신청 완료 — 신청번호: ${equipmentResult.requestNumber}`
                : `❌ ${equipmentResult.error}`}
            </div>
          )}

          <div>
            <label className={labelClass}>기자재 *</label>
            <select
              name="equipmentId"
              required
              value={selectedEquipmentId ?? ''}
              onChange={(e) => setSelectedEquipmentId(parseInt(e.target.value))}
              className={inputClass}
            >
              {equipments.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  [{eq.category}] {eq.name}
                </option>
              ))}
            </select>
          </div>

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
              <label className={labelClass}>
                수량 * (최소 {minQty} / 최대 {maxQty})
              </label>
              <input
                key={selectedEquipmentId ?? 'none'}
                type="number"
                name="quantity"
                required
                min={minQty}
                max={maxQty}
                defaultValue={minQty}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>비밀번호 * (4~8자)</label>
              <input type="password" name="password" required minLength={4} maxLength={8} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>목적 (선택)</label>
            <textarea name="purpose" rows={2} className={inputClass} />
          </div>

          <button
            type="submit"
            disabled={equipmentPending || equipments.length === 0}
            className="w-full py-2.5 rounded-xl bg-brand-rose text-white font-semibold text-sm disabled:opacity-50 hover:bg-brand-rose/90 transition-colors"
          >
            {equipmentPending ? '처리 중...' : '테스트 신청 생성'}
          </button>
        </form>
      )}

      {/* 강의실 탭 */}
      {tab === 'classroom' && (
        <form ref={classroomFormRef} onSubmit={handleClassroomSubmit} className="space-y-4">
          {classroomResult && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium border ${
                classroomResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30'
              }`}
            >
              {classroomResult.success
                ? `✅ 테스트 신청 완료 — 신청번호: ${classroomResult.requestNumber}`
                : `❌ ${classroomResult.error}`}
            </div>
          )}

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
              <input type="datetime-local" name="startAt" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>대여 종료 *</label>
              <input type="datetime-local" name="endAt" required className={inputClass} />
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
              <label className={labelClass}>비밀번호 * (4~8자)</label>
              <input type="password" name="password" required minLength={4} maxLength={8} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>모니터 자산 (선택)</label>
              <input type="text" name="monitorAssets" placeholder="없음" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>목적 (선택)</label>
            <textarea name="purpose" rows={2} className={inputClass} />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isGroup"
              checked={isGroup}
              onChange={(e) => setIsGroup(e.target.checked)}
              className="w-4 h-4 accent-brand-rose"
            />
            <label htmlFor="isGroup" className="text-sm text-base-primary cursor-pointer">
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
            {classroomPending ? '처리 중...' : '테스트 신청 생성'}
          </button>
        </form>
      )}
    </div>
  )
}
