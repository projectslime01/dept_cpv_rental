'use client'

import { useTransition, useState, useEffect, useMemo } from 'react'
import { createClassroomRentalRequest } from '@/app/actions/classroomRental'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { addWeekdays } from '@/lib/dateUtils'
import {
  CheckCircle2, ArrowRight, AlertTriangle, Clock,
  Building2, User, Users, CalendarDays, FileText, Monitor, AlertCircle,
} from 'lucide-react'
import {
  isSubmissionTimeValid,
  isValidStartDate,
  countWeekdaysInRange,
  includesWeekend,
  isValidWeekendRental,
  getEarliestAllowedStartDate,
} from '@/lib/rentalUtils'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Props {
  classroomId: number
  classroomName: string
  defaultStartAt?: string
  defaultEndAt?: string
}

const inputCls = 'w-full h-10 px-3.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary placeholder:text-base-muted/50 focus:outline-none focus:border-brand-rose transition-colors'

function Field({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold text-base-secondary">{label}</div>
      {hint && <div className="text-[11px] text-base-muted leading-relaxed">{hint}</div>}
      {children}
    </div>
  )
}

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-base rounded-2xl border border-base">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-subtle rounded-t-2xl">
        <Icon className="w-4 h-4 text-base-muted" />
        <h2 className="text-sm font-semibold text-base-secondary">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

export function ClassroomRentalForm({ classroomId, classroomName, defaultStartAt, defaultEndAt }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState<string | null>(null)
  const [startAt, setStartAt] = useState(defaultStartAt ?? '')
  const [endAt, setEndAt] = useState(defaultEndAt ?? '')
  const [isGroup, setIsGroup] = useState<boolean | null>(null)
  const [monitorUsed, setMonitorUsed] = useState<boolean | null>(null)
  const [currentTimeValid, setCurrentTimeValid] = useState(true)
  const [hasDepartmentApproval, setHasDepartmentApproval] = useState(false)

  useEffect(() => {
    setCurrentTimeValid(isSubmissionTimeValid(new Date()))
  }, [])

  // 평일 2일 후 = 최소 대여 시작 가능일
  const minStartDate = useMemo(() => {
    const min = addWeekdays(new Date(), 2)
    min.setHours(0, 0, 0, 0)
    return min
  }, [])

  const isStartAtValid = startAt ? isValidStartDate(new Date(startAt), new Date()) : true
  const earliestAllowedDate = getEarliestAllowedStartDate(new Date())
  const earliestAllowedStr = format(earliestAllowedDate, 'yyyy년 MM월 dd일', { locale: ko })

  let needsApproval = false
  let validationError = ''
  if (startAt && endAt) {
    const s = new Date(startAt)
    const e = new Date(endAt)
    if (s < e) {
      const weekdayCount = countWeekdaysInRange(s, e)
      const exceedsDuration = weekdayCount > 3
      const containsWeekend = includesWeekend(s, e)
      const violatesWeekend = containsWeekend && !isValidWeekendRental(s, e)
      if (exceedsDuration || violatesWeekend) {
        needsApproval = true
        if (exceedsDuration) {
          validationError = `대여 기간은 최대 평일 기준 3일 이내여야 합니다. (현재 선택: 평일 기준 ${weekdayCount}일)`
        } else {
          validationError = '주말이 포함된 대여는 반드시 "금요일 반출, 월요일 반납" 수칙을 준수해야 합니다.'
        }
      }
    }
  }

  const isSubmitDisabled =
    isPending ||
    !startAt ||
    !endAt ||
    isGroup === null ||
    monitorUsed === null ||
    !currentTimeValid ||
    !isStartAtValid ||
    (needsApproval && !hasDepartmentApproval)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isGroup === null) { setError('개인 또는 조별 사용 여부를 선택해주세요.'); return }
    if (monitorUsed === null) { setError('모니터 사용 여부를 선택해주세요.'); return }
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('classroomId', String(classroomId))
    fd.set('startAt', startAt)
    fd.set('endAt', endAt)
    fd.set('isGroup', String(isGroup))
    fd.set('hasDepartmentApproval', String(hasDepartmentApproval))
    if (!monitorUsed) fd.set('monitorAssets', '미사용')
    startTransition(async () => {
      const result = await createClassroomRentalRequest(fd)
      if (result.success) setRequestNumber(result.requestNumber)
      else setError(result.error)
    })
  }

  // ── 완료 화면 ────────────────────────────────────────────────────────────────
  if (requestNumber) {
    return (
      <div className="bg-surface-base rounded-2xl border border-base p-8 text-center space-y-5">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-base-primary">신청 완료!</h2>
          <p className="text-sm text-base-secondary mt-1">{classroomName} 대여 신청이 접수됐습니다.</p>
        </div>
        <div className="bg-surface-raised rounded-xl border border-base p-4">
          <p className="text-[11px] font-bold text-base-muted uppercase tracking-wider mb-2">신청 번호</p>
          <p className="font-mono text-lg font-black text-brand-rose">{requestNumber}</p>
        </div>
        <p className="text-xs text-red-500 font-medium bg-red-500/10 rounded-xl px-4 py-2.5 border border-red-500/20">
          ⚠️ 위 번호를 반드시 저장하세요. 조회 시 사용됩니다.
        </p>
        <div className="flex gap-2 justify-center">
          <a href="/classrooms" className="h-10 px-5 rounded-xl border border-base text-sm font-semibold text-base-secondary hover:bg-surface-overlay hover:text-base-primary transition-colors flex items-center">
            목록으로
          </a>
          <a href="/status" className="h-10 px-5 rounded-xl bg-brand-rose hover:bg-brand-rose/90 text-white text-sm font-bold transition-colors flex items-center gap-1.5">
            신청 조회 <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 bg-surface-raised rounded-xl px-4 py-3 border border-base">
        <Building2 className="w-5 h-5 text-brand-rose shrink-0" />
        <span className="text-sm font-semibold text-base-primary">{classroomName} 대여 신청서</span>
      </div>

      {/* 신청 불가 시간 경고 */}
      {!currentTimeValid && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-500">
          <Clock className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold">신청 불가 시간</p>
            <p className="text-xs leading-relaxed">강의실 대여 신청은 평일 09:00 ~ 17:00에만 가능합니다.</p>
          </div>
        </div>
      )}

      {/* ① 대여자 정보 */}
      <SectionCard icon={User} title="대여자 (대표자) 정보">
        <p className="text-[11px] text-base-muted bg-surface-raised rounded-xl px-3 py-2 border border-base">
          예) 진은범 / 2022102048 / 010-2957-5554
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="이름 *">
            <input name="applicantName" required placeholder="홍길동" className={inputCls} />
          </Field>
          <Field label="학번 *">
            <input name="studentId" required placeholder="2022102048" className={inputCls} />
          </Field>
          <Field label="전화번호 *">
            <input name="phone" type="tel" required placeholder="010-0000-0000" className={inputCls} />
          </Field>
        </div>
      </SectionCard>

      {/* ② 조별/개인 */}
      <SectionCard icon={Users} title="조별 / 개인 사용">
        <div className="text-[11px] text-base-muted bg-surface-raised rounded-xl px-3 py-2.5 border border-base leading-relaxed">
          조별과제 사용의 경우 총원 및 조원 이름을 작성해주세요.<br />
          <span className="text-amber-500 font-semibold">꼭! 조원이 한 명도 빠짐없이 다 들어가야 합니다.</span>
          <br />예) 5명 / 홍길동, 김철수, 이영희 …
        </div>
        <div className="flex gap-2">
          {[
            { value: false, label: '개인 사용' },
            { value: true, label: '조별 과제' },
          ].map(({ value, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => setIsGroup(value)}
              className={`flex-1 h-10 rounded-xl border text-sm font-semibold transition-colors ${
                isGroup === value
                  ? 'bg-brand-rose/10 text-brand-rose border-brand-rose/40'
                  : 'bg-surface-raised text-base-muted border-base hover:text-base-secondary hover:border-strong'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {isGroup === true && (
          <div className="space-y-3 pt-1">
            <Field label="총원 *">
              <input name="groupCount" type="number" min={2} required={isGroup} placeholder="예) 5" className={inputCls} />
            </Field>
            <Field label="조원 이름 *">
              <textarea
                name="groupMembers"
                required={isGroup}
                rows={2}
                placeholder="예) 홍길동, 김철수, 이영희, 박민준, 최지아"
                className="w-full px-3.5 py-2.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary placeholder:text-base-muted/50 focus:outline-none focus:border-brand-rose transition-colors resize-none"
              />
            </Field>
          </div>
        )}
        {isGroup === false && (
          <p className="text-xs text-base-muted pl-1">개인 사용 — 조원 정보 입력 없이 진행합니다.</p>
        )}
      </SectionCard>

      {/* ③ 대여 및 반납 일자 */}
      <SectionCard icon={CalendarDays} title="대여 및 반납 일자">
        <div className="flex items-start gap-2 text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>사용일 기준 <strong>최소 평일 2일 전</strong> 신청 (주말 제외)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="대여 시작 *">
            <DateTimePicker value={startAt} onChange={setStartAt} placeholder="대여 시작" minDate={minStartDate} />
          </Field>
          <Field label="반납 예정 *">
            <DateTimePicker value={endAt} onChange={setEndAt} placeholder="반납 예정" minDate={minStartDate} />
          </Field>
        </div>

        {/* 기한 초과 경고 */}
        {!isStartAtValid && startAt && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-500">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              평일 기준 최소 2일 전까지 신청 가능합니다. (가장 빠른 시작 가능일: <strong>{earliestAllowedStr}</strong>)
            </p>
          </div>
        )}

        {/* 학과장 승인 필요 */}
        {needsApproval && (
          <div className="space-y-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-start gap-2.5 text-amber-500">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold">학과장 승인 필요</p>
                <p className="text-xs leading-relaxed">{validationError}</p>
                <p className="text-[11px] text-base-secondary leading-relaxed">
                  담당 조교 상담 및 학과장님 승인을 받으셨다면 아래 체크 후 신청할 수 있습니다.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-raised border border-base hover:border-strong cursor-pointer transition select-none">
              <input
                type="checkbox"
                checked={hasDepartmentApproval}
                onChange={(e) => setHasDepartmentApproval(e.target.checked)}
                className="w-4 h-4 rounded accent-rose-500"
              />
              <span className="text-xs font-bold text-base-primary">
                학과장님께 사전 서면/대면 승인을 완료했습니다.
              </span>
            </label>
          </div>
        )}
      </SectionCard>

      {/* ④ 강의실 대여 목적 */}
      <SectionCard icon={FileText} title="강의실 대여 목적">
        <Field label="목적 *">
          <textarea
            name="purpose"
            required
            rows={3}
            placeholder="예) 팀 프로젝트 촬영 준비, 편집 작업 등"
            className="w-full px-3.5 py-2.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary placeholder:text-base-muted/50 focus:outline-none focus:border-brand-rose transition-colors resize-none"
          />
        </Field>
      </SectionCard>

      {/* ⑤ 모니터 자산번호 */}
      <SectionCard icon={Monitor} title="모니터 자산번호">
        <div className="text-[11px] text-base-muted bg-surface-raised rounded-xl px-3 py-2.5 border border-base leading-relaxed space-y-0.5">
          <p>• 모니터 뒤 <span className="text-amber-500 font-semibold">노란 스티커</span>의 자산번호를 확인하세요.</p>
          <p>• 사용하는 모니터 수만큼 번호를 기재하세요.</p>
          <p>• 미사용 시 아래에서 <span className="font-semibold text-base-secondary">미사용</span>을 선택하세요.</p>
        </div>
        <div className="flex gap-2">
          {[
            { value: false, label: '미사용' },
            { value: true, label: '사용' },
          ].map(({ value, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => setMonitorUsed(value)}
              className={`flex-1 h-10 rounded-xl border text-sm font-semibold transition-colors ${
                monitorUsed === value
                  ? 'bg-brand-rose/10 text-brand-rose border-brand-rose/40'
                  : 'bg-surface-raised text-base-muted border-base hover:text-base-secondary hover:border-strong'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {monitorUsed === true && (
          <Field label="자산번호 *" hint="여러 대면 줄 바꿈 또는 쉼표로 구분">
            <textarea
              name="monitorAssets"
              required={monitorUsed}
              rows={2}
              placeholder="예) AB-12345, AB-12346"
              className="w-full px-3.5 py-2.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary placeholder:text-base-muted/50 focus:outline-none focus:border-brand-rose transition-colors resize-none"
            />
          </Field>
        )}
        {monitorUsed === false && (
          <p className="text-xs text-base-muted pl-1">모니터 미사용으로 기록됩니다.</p>
        )}
      </SectionCard>

      {/* ⑥ 조회용 비밀번호 */}
      <div className="bg-surface-base rounded-2xl border border-base p-5 space-y-1.5">
        <label htmlFor="password" className="block text-xs font-semibold text-base-secondary">
          조회용 비밀번호 * <span className="text-base-muted font-normal">(4~8자리)</span>
        </label>
        <input id="password" name="password" type="password" minLength={4} maxLength={8} required className={inputCls} />
        <p className="text-[11px] text-base-muted">신청 후 조회 시 사용합니다. 분실 시 복구 불가.</p>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="w-full h-12 rounded-xl bg-brand-rose hover:bg-brand-rose/90 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isPending ? '신청 중...' : <>강의실 대여 신청 <ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  )
}
