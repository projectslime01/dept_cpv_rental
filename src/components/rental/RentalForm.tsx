'use client'

import { useTransition, useState, useEffect } from 'react'
import { createRentalRequest } from '@/app/actions/rental'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { CheckCircle2, ArrowRight, AlertTriangle, Clock, CalendarDays } from 'lucide-react'
import { AvailabilityCalendar } from '@/components/equipment/AvailabilityCalendar'
import { AccessorySelector } from '@/components/rental/AccessorySelector'
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
  equipmentId: number
  equipmentName: string
  defaultStartAt?: string
  defaultEndAt?: string
  maxQuantity: number
  minRentalQuantity?: number
  maxRentalQuantity?: number | null
}

const inputCls = 'w-full h-10 px-3.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary placeholder:text-base-muted/50 focus:outline-none focus:border-brand-rose transition-colors'

export function RentalForm({ equipmentId, equipmentName, defaultStartAt, defaultEndAt, maxQuantity, minRentalQuantity = 1, maxRentalQuantity }: Props) {
  const effectiveMax = Math.min(maxRentalQuantity ?? maxQuantity, maxQuantity)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState<string | null>(null)
  const [startAt, setStartAt] = useState(defaultStartAt ?? '')
  const [endAt, setEndAt] = useState(defaultEndAt ?? '')
  const [selectedAccessories, setSelectedAccessories] = useState<{ accessoryId: number; quantity: number }[]>([])

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

  // 제출 버튼 비활성화 상태 계산
  const isSubmitDisabled =
    isPending ||
    !startAt ||
    !endAt ||
    !currentTimeValid ||
    !isStartAtValid ||
    (needsApproval && !hasDepartmentApproval)

  function handleSubmit(formData: FormData) {
    formData.set('equipmentId', String(equipmentId))
    formData.set('startAt', startAt)
    formData.set('endAt', endAt)
    formData.set('hasDepartmentApproval', String(hasDepartmentApproval))
    formData.set('accessories', JSON.stringify(selectedAccessories))
    setError(null)
    startTransition(async () => {
      const result = await createRentalRequest(formData)
      if (result.success) setRequestNumber(result.requestNumber)
      else setError(result.error)
    })
  }

  if (requestNumber) {
    return (
      <div className="bg-surface-base rounded-2xl border border-base p-8 text-center space-y-5">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/30">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-base-primary">신청 완료!</h2>
          <p className="text-sm text-base-secondary mt-1">{equipmentName} 대여 신청이 접수됐습니다.</p>
        </div>
        <div className="bg-surface-raised rounded-xl border border-base p-4">
          <p className="text-[11px] font-bold text-base-muted uppercase tracking-wider mb-2">신청 번호</p>
          <p className="font-mono text-lg font-black text-brand-rose">{requestNumber}</p>
        </div>
        <p className="text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-2.5 border border-red-200 dark:border-red-900/30">
          ⚠️ 위 번호를 반드시 저장하세요. 조회 시 사용됩니다.
        </p>
        <div className="flex gap-2 justify-center">
          <a href="/" className="h-10 px-5 rounded-xl border border-base text-sm font-semibold text-base-secondary hover:bg-surface-overlay hover:text-base-primary transition-colors flex items-center">목록으로</a>
          <a href="/status" className="h-10 px-5 rounded-xl bg-rose-600 dark:bg-brand-rose hover:bg-rose-700 dark:hover:bg-rose-400 text-white dark:text-zinc-950 text-sm font-semibold transition-colors flex items-center gap-1.5">
            신청 조회 <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-base rounded-2xl border border-base p-6 space-y-5">
      <div className="flex items-center gap-3 bg-surface-raised rounded-xl px-4 py-3 border border-base">
        <div className="w-1.5 h-1.5 rounded-full bg-brand-rose shrink-0" />
        <span className="text-sm font-semibold text-base-primary">{equipmentName}</span>
      </div>

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

      <form action={handleSubmit} className="space-y-4">
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

        <div className="space-y-1.5">
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

          {/* 실시간 예약 현황 캘린더 연동 (Visual Premium) */}
          <div className="mt-3.5 p-4 rounded-xl border border-base bg-surface-raised/40 space-y-3">
            <p className="text-xs font-semibold text-base-secondary flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-brand-rose" />
              기자재 실시간 대여 현황 달력
            </p>
            <AvailabilityCalendar
              equipmentId={equipmentId}
              totalQuantity={maxQuantity}
              startAt={startAt}
              endAt={endAt}
              onRangeSelect={(start, end) => {
                setStartAt(start)
                setEndAt(end)
              }}
            />
          </div>

          {/* 2. 대여 시작일 위반 시 경고 문구 */}
          {startAt && !isStartAtValid && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl px-3 py-2 flex items-center gap-1.5 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>대여 신청은 평일 기준 최소 2일 전까지만 가능합니다. (가장 빠른 대여 가능일: {earliestAllowedStr})</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="quantity" className="block text-xs font-medium text-base-secondary">
            수량 *{' '}
            <span className="text-base-muted">
              ({minRentalQuantity > 1 ? `최소 ${minRentalQuantity}개 · ` : ''}최대 {effectiveMax}개)
            </span>
          </label>
          <input id="quantity" name="quantity" type="number" min={minRentalQuantity} max={effectiveMax} defaultValue={minRentalQuantity} required className={inputCls} />
        </div>

        {/* 부속 기자재 선택 */}
        <AccessorySelector
          equipmentId={equipmentId}
          startAt={startAt}
          endAt={endAt}
          onChange={setSelectedAccessories}
        />

        {/* 3 & 4. 대여 기간 또는 주말 제약 조건 위반 시 학과장님 승인 확인 박스 */}
        {startAt && endAt && needsApproval && (
          <div className="space-y-2.5 pt-1.5 animate-in fade-in duration-200">
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

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-xs font-medium text-base-secondary">조회용 비밀번호 * <span className="text-base-muted">(4~8자리)</span></label>
          <input id="password" name="password" type="password" minLength={4} maxLength={8} required className={inputCls} />
          <p className="text-[11px] text-base-muted">신청 후 조회 시 사용합니다. 분실 시 복구 불가.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="purpose" className="block text-xs font-medium text-base-secondary">사용 목적 <span className="text-base-muted">(선택)</span></label>
          <textarea id="purpose" name="purpose" rows={2}
            className="w-full px-3.5 py-2.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary focus:outline-none focus:border-brand-rose transition-colors resize-none" />
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3">{error}</div>
        )}

        <button type="submit" disabled={isSubmitDisabled}
          className="w-full h-11 rounded-xl bg-rose-600 dark:bg-brand-rose hover:bg-rose-700 dark:hover:bg-rose-400 text-white dark:text-zinc-950 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {isPending ? '신청 중...' : '대여 신청하기'}
        </button>
      </form>
    </div>
  )
}
