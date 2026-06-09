'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/useCart'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { createBatchRentalRequest, checkCartAvailability, type CartAvailabilityItem } from '@/app/actions/rental'
import { ClipboardList, Trash2, CheckCircle2, Minus, Plus, ArrowRight, CalendarDays, User, Loader2, AlertTriangle, Clock } from 'lucide-react'
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

type AvailabilityMap = Record<number, CartAvailabilityItem>

const CATEGORY_STYLES: Record<string, string> = {
  '카메라 바디': 'text-sky-750 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950/60 dark:border-sky-900/60',
  '렌즈':        'text-violet-750 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-950/60 dark:border-violet-900/60',
  '영상 장비':   'text-blue-750 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/60 dark:border-blue-900/60',
  '조명':        'text-amber-750 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-900/60',
  '저장 매체':   'text-emerald-750 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-900/60',
  '삼각대/지지대':'text-slate-750 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-800/60 dark:border-slate-700/60',
  '필터':        'text-indigo-750 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/60 dark:border-indigo-900/60',
  '배터리':      'text-orange-750 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-950/60 dark:border-orange-900/60',
  '음향':        'text-pink-750 bg-pink-50 border-pink-200 dark:text-pink-300 dark:bg-pink-950/60 dark:border-pink-900/60',
  '기타':        'text-base-secondary bg-surface-raised border-base',
}

const inputCls = 'w-full h-10 px-3.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary focus:outline-none focus:border-brand-rose transition-colors'

function SectionCard({ title, icon: Icon, children, badge }: { title: string; icon: React.ElementType; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="bg-surface-base rounded-2xl border border-base">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-base rounded-t-2xl">
        <Icon className="w-4 h-4 text-base-muted" />
        <h2 className="text-sm font-semibold text-base-primary">{title}</h2>
        {badge && <div className="ml-auto">{badge}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function SuccessScreen({ requestNumbers, onClear }: { groupNumber: string; requestNumbers: string[]; onClear: () => void }) {
  return (
    <div className="bg-surface-base rounded-2xl border border-base p-8 text-center space-y-5">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/30">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-base-primary">신청 완료!</h2>
        <p className="text-sm text-base-secondary mt-1">{requestNumbers.length}종 기자재가 일괄 신청됐습니다.</p>
      </div>
      <div className="bg-surface-raised rounded-xl border border-base p-4 text-left space-y-2">
        <p className="text-[11px] font-bold text-base-muted uppercase tracking-wider mb-3">신청 번호</p>
        {requestNumbers.map(rn => (
          <p key={rn} className="font-mono text-sm font-bold text-brand-rose bg-surface-overlay rounded-lg border border-base px-3 py-2">
            {rn}
          </p>
        ))}
      </div>
      <p className="text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-2.5 border border-red-200 dark:border-red-900/30">
        ⚠️ 위 번호를 반드시 저장하세요. 조회 시 사용됩니다.
      </p>
      <div className="flex gap-2 justify-center">
        <Link href="/" onClick={onClear} className="h-10 px-5 rounded-xl border border-base text-sm font-semibold text-base-secondary hover:bg-surface-overlay hover:text-base-primary transition-colors flex items-center">
          목록으로
        </Link>
        <Link href="/status" className="h-10 px-5 rounded-xl bg-rose-600 dark:bg-brand-rose hover:bg-rose-700 dark:hover:bg-rose-400 text-white dark:text-zinc-950 text-sm font-semibold transition-colors flex items-center gap-1.5">
          신청 조회 <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}

export function CartPageClient() {
  const { items, remove, setQty, clear, hydrated } = useCart()
  const [isPending, startTransition] = useTransition()
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ groupNumber: string; requestNumbers: string[] } | null>(null)
  const [availability, setAvailability] = useState<AvailabilityMap | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [grade, setGrade] = useState<number | null>(null)

  // 실시간 제약 검증용 클라이언트 상태
  const [currentTimeValid, setCurrentTimeValid] = useState(true)
  const [hasDepartmentApproval, setHasDepartmentApproval] = useState(false)

  useEffect(() => {
    // SSR-hydration 미스매치 방지를 위해 클라이언트 마운트 시 현재 시간 검증 실행
    setCurrentTimeValid(isSubmissionTimeValid(new Date()))
  }, [])

  // 2. 신청 기한 검증 (평일 기준 최소 2일 전)
  const isStartAtValid = startAt ? isValidStartDate(new Date(startAt), new Date()) : true
  const earliestAllowedDate = getEarliestAllowedStartDate(new Date())
  const earliestAllowedStr = format(earliestAllowedDate, 'yyyy년 MM월 dd일', { locale: ko })

  // 3 & 4. 대여 기간 및 주말 검사
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

  // 학년 자격 미달 품목 (availability 로딩 후 minGrade 기준)
  const gradeBlockedItems = grade != null && availability
    ? items.filter(i => (availability[i.equipmentId]?.minGrade ?? 1) > grade)
    : []

  // 제출 비활성화 계산
  const isSubmitDisabled =
    isPending ||
    !startAt ||
    !endAt ||
    grade == null ||
    gradeBlockedItems.length > 0 ||
    !currentTimeValid ||
    !isStartAtValid ||
    (needsApproval && !hasDepartmentApproval)

  // 날짜·수량이 바뀔 때마다 재고 재조회 (400ms debounce)
  const itemsKey = items.map(i => `${i.equipmentId}:${i.quantity}`).join(',')
  useEffect(() => {
    if (!startAt || !endAt) { setAvailability(null); return }
    const s = new Date(startAt), e = new Date(endAt)
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s >= e) { setAvailability(null); return }

    setIsChecking(true)
    const timer = setTimeout(async () => {
      try {
        const results = await checkCartAvailability(
          items.map(i => ({ equipmentId: i.equipmentId, quantity: i.quantity })),
          startAt,
          endAt
        )
        const map: AvailabilityMap = {}
        for (const r of results) map[r.equipmentId] = r
        setAvailability(map)
      } finally {
        setIsChecking(false)
      }
    }, 400)

    return () => { clearTimeout(timer); setIsChecking(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startAt, endAt, itemsKey])

  if (!hydrated) return null
  if (result) return <SuccessScreen {...result} onClear={clear} />

  if (items.length === 0) {
    return (
      <div className="bg-surface-base rounded-2xl border border-base py-20 text-center space-y-3">
        <ClipboardList className="w-12 h-12 mx-auto text-base-muted" />
        <p className="text-sm font-medium text-base-muted">선택한 기자재가 없습니다.</p>
        <Link href="/" className="inline-flex items-center h-9 px-5 rounded-xl border border-base text-sm font-semibold text-base-secondary hover:bg-surface-overlay hover:text-base-primary transition-colors">
          기자재 목록으로
        </Link>
      </div>
    )
  }

  function handleSubmit(formData: FormData) {
    formData.set('startAt', startAt)
    formData.set('endAt', endAt)
    formData.set('items', JSON.stringify(items.map(i => ({ equipmentId: i.equipmentId, quantity: i.quantity }))))
    formData.set('hasDepartmentApproval', String(hasDepartmentApproval))
    formData.set('grade', grade != null ? String(grade) : '')
    setError(null)
    startTransition(async () => {
      const res = await createBatchRentalRequest(formData)
      if (res.success) { setResult({ groupNumber: res.groupNumber, requestNumbers: res.requestNumbers }); clear() }
      else setError(res.error)
    })
  }

  return (
    <div className="space-y-4">
      {/* 1. 신청 시간 위반 시 경고 배너 */}
      {!currentTimeValid && (
        <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-xl p-4 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
          <Clock className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider">신청 불가 시간 안내</p>
            <p className="text-xs font-medium leading-relaxed">
              기자재 대여 신청은 평일 09:00 ~ 17:00에만 가능합니다. (주말 및 공휴일 신청 불가)
            </p>
          </div>
        </div>
      )}

      {/* 선택 목록 */}
      <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-base">
          <ClipboardList className="w-4 h-4 text-base-muted" />
          <h2 className="text-sm font-semibold text-base-primary">선택한 기자재</h2>
          <span className="ml-auto text-xs text-base-muted">{items.length}종</span>
        </div>
        <div className="divide-y divide-base">
          {items.map(item => {
            const catStyle = CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES['기타']
            const av = availability?.[item.equipmentId]
            return (
              <div key={item.equipmentId} className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${catStyle}`}>
                    {item.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-base-primary truncate">{item.name}</p>
                    {(item.minRentalQuantity > 1 || item.maxRentalQuantity !== null) && (
                      <p className="text-[10px] font-semibold mt-0.5 flex gap-1.5">
                        {item.minRentalQuantity > 1 && <span className="text-amber-600 dark:text-amber-400">최소 {item.minRentalQuantity}개</span>}
                        {item.maxRentalQuantity !== null && <span className="text-sky-600 dark:text-sky-400">최대 {item.maxRentalQuantity}개</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => setQty(item.equipmentId, item.quantity - 1)} disabled={item.quantity <= item.minRentalQuantity}
                      className="w-9 h-9 rounded-lg border border-base flex items-center justify-center hover:bg-surface-overlay disabled:opacity-30 transition-colors">
                      <Minus className="w-3 h-3 text-base-secondary" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-base-primary">{item.quantity}</span>
                    <button type="button" onClick={() => setQty(item.equipmentId, item.quantity + 1)}
                      disabled={item.quantity >= Math.min(item.maxRentalQuantity ?? item.totalQuantity, item.totalQuantity)}
                      className="w-9 h-9 rounded-lg border border-base flex items-center justify-center hover:bg-surface-overlay disabled:opacity-30 transition-colors">
                      <Plus className="w-3 h-3 text-base-secondary" />
                    </button>
                  </div>
                  <button type="button" onClick={() => remove(item.equipmentId)}
                    className="p-1.5 rounded-lg text-base-muted hover:text-red-650 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 실시간 재고 표시 */}
                {(isChecking || av) && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {isChecking ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-base-muted">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        재고 확인 중...
                      </span>
                    ) : av ? (
                      av.available >= av.requested ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-650 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-full">
                          ✓ 대여 가능 · {av.available}개 여유
                        </span>
                      ) : av.available > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-750 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded-full">
                          ⚠ 수량 부족 · {av.available}개만 가능
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-650 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-2 py-0.5 rounded-full">
                          ✕ 이 기간 대여 불가
                        </span>
                      )
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <form action={handleSubmit} className="space-y-4">
        {/* 대여 기간 */}
        <SectionCard
          title="대여 기간 (전체 공통)"
          icon={CalendarDays}
          badge={
            isChecking ? (
              <span className="flex items-center gap-1 text-[11px] text-base-muted">
                <Loader2 className="w-3 h-3 animate-spin" />
                재고 확인 중
              </span>
            ) : availability ? (
              Object.values(availability).some(a => a.available < a.requested) ? (
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">⚠ 재고 부족 항목 있음</span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-650 dark:text-emerald-400">✓ 전체 재고 확인됨</span>
              )
            ) : undefined
          }
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-base-secondary">대여 시작 *</p>
                <DateTimePicker value={startAt} onChange={setStartAt} placeholder="대여 시작" disablePast />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-base-secondary">반납 예정 *</p>
                <DateTimePicker value={endAt} onChange={setEndAt} placeholder="반납 예정" disablePast />
              </div>
            </div>

            {/* 2. 대여 시작일 위반 시 경고 문구 */}
            {startAt && !isStartAtValid && (
              <div className="text-xs text-red-650 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl px-3 py-2 flex items-center gap-1.5 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>대여 신청은 평일 기준 최소 2일 전까지만 가능합니다. (가장 빠른 대여 가능일: {earliestAllowedStr})</span>
              </div>
            )}
          </div>
        </SectionCard>

        {/* 3 & 4. 대여 기간 또는 주말 제약 조건 위반 시 학과장님 승인 확인 박스 */}
        {startAt && endAt && needsApproval && (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 text-amber-800 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider">기간 초과/주말 수칙 초과 대여 경고</p>
                <p className="text-xs font-medium leading-relaxed">
                  {validationError}
                </p>
                <p className="text-[11px] text-base-secondary font-semibold leading-relaxed mt-0.5">
                  (기준 초과 대여의 경우 학과장님께 사전 승인 후 신청이 가능하며, 담당 조교에게 공유 필수입니다.)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-surface-overlay border border-base rounded-xl p-3.5 hover:border-brand-rose/40 transition-colors">
              <input
                type="checkbox"
                id="hasDepartmentApproval"
                checked={hasDepartmentApproval}
                onChange={(e) => setHasDepartmentApproval(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-base text-brand-rose focus:ring-brand-rose/50 focus:ring-offset-surface-raised bg-surface-raised mt-0.5 cursor-pointer accent-brand-rose shrink-0"
              />
              <label htmlFor="hasDepartmentApproval" className="text-xs font-semibold text-base-primary select-none cursor-pointer leading-relaxed">
                학과장님 사전 승인을 받았으며, 담당 조교에게 공유를 완료했습니다. (승인 확인 체크)
              </label>
            </div>
          </div>
        )}

        {/* 신청자 정보 */}
        <SectionCard title="신청자 정보" icon={User}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="applicantName" className="block text-xs font-medium text-base-secondary">이름 *</label>
                <input id="applicantName" name="applicantName" required className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="studentId" className="block text-xs font-medium text-base-secondary">학번 *</label>
                <input id="studentId" name="studentId" required className={inputCls} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="phone" className="block text-xs font-medium text-base-secondary">연락처 *</label>
              <input id="phone" name="phone" type="tel" placeholder="010-0000-0000" required className={inputCls} />
            </div>
            {/* 학년 선택 (학년별 대여 자격 제한) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-base-secondary">학년 <span className="text-brand-rose">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${
                      grade === g
                        ? 'bg-brand-rose text-white border-brand-rose'
                        : 'bg-surface-raised border-base text-base-secondary hover:border-brand-rose/50'
                    }`}
                  >
                    {g}학년
                  </button>
                ))}
              </div>
              {gradeBlockedItems.length > 0 && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl px-3 py-2 flex items-start gap-1.5 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    선택한 학년으로 대여할 수 없는 품목이 있습니다:{' '}
                    <b>{gradeBlockedItems.map(i => `${i.name}(${availability?.[i.equipmentId]?.minGrade}학년~)`).join(', ')}</b>
                    {' '}— 해당 품목을 빼거나 학년을 확인해주세요.
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-base-secondary">조회용 비밀번호 * <span className="text-base-muted">(4~8자리)</span></label>
              <input id="password" name="password" type="password" minLength={4} maxLength={8} required className={inputCls} />
              <p className="text-[11px] text-base-muted">신청 후 조회 시 사용합니다. 분실 시 복구 불가.</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="purpose" className="block text-xs font-medium text-base-secondary">사용 목적 <span className="text-brand-rose">*</span></label>
              <textarea id="purpose" name="purpose" rows={2} required
                placeholder="예) 과제 촬영, 팀 프로젝트 등"
                className="w-full px-3.5 py-2.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary placeholder:text-base-faint focus:outline-none focus:border-brand-rose transition-colors resize-none" />
            </div>
          </div>
        </SectionCard>

        {availability && Object.values(availability).some(a => a.available < a.requested) && (
          <div className="text-sm text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl px-4 py-3">
            ⚠ 일부 기자재의 재고가 부족합니다. 수량을 줄이거나 다른 날짜를 선택해주세요.
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitDisabled}
          className="w-full h-12 rounded-xl bg-rose-600 dark:bg-brand-rose hover:bg-rose-700 dark:hover:bg-rose-400 text-white dark:text-zinc-950 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {isPending ? '신청 중...' : <>{items.length}종 기자재 일괄 신청 <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>
    </div>
  )
}
