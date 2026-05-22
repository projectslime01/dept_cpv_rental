'use client'

import { useTransition, useState, useEffect } from 'react'
import { createClassroomRentalRequest } from '@/app/actions/classroomRental'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { CheckCircle2, ArrowRight, AlertTriangle, Clock, Building2 } from 'lucide-react'
import {
  isSubmissionTimeValid,
  isValidStartDate,
  countWeekdaysInRange,
  includesWeekend,
  isValidWeekendRental,
  getEarliestAllowedStartDate,
} from '@/lib/rental'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Props {
  classroomId: number
  classroomName: string
  defaultStartAt?: string
  defaultEndAt?: string
}

const inputCls = 'w-full h-10 px-3.5 rounded-xl border border-[#3a3640] text-sm bg-[#1a191b] text-[#e5e2e1] placeholder:text-[#4a4448] focus:outline-none focus:border-[#a78bfa] transition-colors'

export function ClassroomRentalForm({ classroomId, classroomName, defaultStartAt, defaultEndAt }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState<string | null>(null)
  const [startAt, setStartAt] = useState(defaultStartAt ?? '')
  const [endAt, setEndAt] = useState(defaultEndAt ?? '')

  // 실시간 제약 검증용 클라이언트 상태
  const [currentTimeValid, setCurrentTimeValid] = useState(true)
  const [hasDepartmentApproval, setHasDepartmentApproval] = useState(false)

  useEffect(() => {
    // SSR-hydration 미스매치 방지를 위해 마운트 시 현재 시간 검증 실행
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
    formData.set('classroomId', String(classroomId))
    formData.set('startAt', startAt)
    formData.set('endAt', endAt)
    formData.set('hasDepartmentApproval', String(hasDepartmentApproval))
    setError(null)
    startTransition(async () => {
      const result = await createClassroomRentalRequest(formData)
      if (result.success) setRequestNumber(result.requestNumber)
      else setError(result.error)
    })
  }

  if (requestNumber) {
    return (
      <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-8 text-center space-y-5">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-950/50 border border-indigo-900/50">
          <CheckCircle2 className="w-8 h-8 text-[#a78bfa]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#e5e2e1]">신청 완료!</h2>
          <p className="text-sm text-[#9b8f91] mt-1">{classroomName} 대여 신청이 접수됐습니다.</p>
        </div>
        <div className="bg-[#1a191b] rounded-xl border border-[#2e2b2f] p-4">
          <p className="text-[11px] font-bold text-[#6b6468] uppercase tracking-wider mb-2">대여 신청 번호</p>
          <p className="font-mono text-lg font-black text-[#a78bfa]">{requestNumber}</p>
        </div>
        <p className="text-xs text-red-400 font-medium bg-red-950/40 rounded-xl px-4 py-2.5 border border-red-900/50">
          ⚠️ 위 신청 번호를 반드시 저장하세요. 신청 조회 시 필요합니다.
        </p>
        <div className="flex gap-2 justify-center">
          <a href="/classrooms" className="h-10 px-5 rounded-xl border border-[#3a3640] text-sm font-semibold text-[#9b8f91] hover:bg-[#252228] hover:text-[#e5e2e1] transition-colors flex items-center">목록으로</a>
          <a href="/status" className="h-10 px-5 rounded-xl bg-[#a78bfa] hover:bg-[#bca5ff] text-[#0f0e11] text-sm font-bold transition-colors flex items-center gap-1.5">
            신청 조회 <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#201f21] rounded-2xl border border-[#2e2b2f] p-6 space-y-5">
      <div className="flex items-center gap-3 bg-[#1a191b] rounded-xl px-4 py-3 border border-[#2e2b2f]">
        <Building2 className="w-5 h-5 text-[#a78bfa] shrink-0" />
        <span className="text-sm font-semibold text-[#c8c4c3]">{classroomName} 대여 신청</span>
      </div>

      {/* 1. 신청 시간 위반 시 경고 배너 */}
      {!currentTimeValid && (
        <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-900/50 rounded-xl p-4 text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
          <Clock className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider">신청 불가 시간 안내</p>
            <p className="text-xs font-medium leading-relaxed">
              강의실 대여 신청은 평일 09:00 ~ 17:00에만 가능합니다. (주말 및 공휴일 신청 불가)
            </p>
          </div>
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="applicantName" className="block text-xs font-medium text-[#9b8f91]">이름 *</label>
            <input id="applicantName" name="applicantName" required className={inputCls} placeholder="홍길동" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="studentId" className="block text-xs font-medium text-[#9b8f91]">학번 *</label>
            <input id="studentId" name="studentId" required className={inputCls} placeholder="202612345" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="phone" className="block text-xs font-medium text-[#9b8f91]">연락처 *</label>
            <input id="phone" name="phone" required className={inputCls} placeholder="010-XXXX-XXXX" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-medium text-[#9b8f91]">비밀번호 (신청조회용) *</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={4}
              maxLength={8}
              className={inputCls}
              placeholder="4~8자리 비밀번호"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="purpose" className="block text-xs font-medium text-[#9b8f91]">대여 목적</label>
          <textarea
            id="purpose"
            name="purpose"
            className="w-full min-h-[70px] max-h-[140px] px-3.5 py-2.5 rounded-xl border border-[#3a3640] text-sm bg-[#1a191b] text-[#e5e2e1] placeholder:text-[#4a4448] focus:outline-none focus:border-[#a78bfa] transition-colors"
            placeholder="대여 목적을 입력해주세요. (예: 영상 촬영 실습, 캡스톤 스터디)"
          />
        </div>

        {/* DateTimePickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#9b8f91]">대여 시작 날짜 시간 *</label>
            <DateTimePicker value={startAt} onChange={setStartAt} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#9b8f91]">반납 예정 날짜 시간 *</label>
            <DateTimePicker value={endAt} onChange={setEndAt} />
          </div>
        </div>

        {/* 2. 평일 기준 최소 2일 전 기한 예외 처리 경고 배너 */}
        {!isStartAtValid && (
          <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-900/50 rounded-xl p-4 text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider">신청 기한 초과 (신청 불가)</p>
              <p className="text-xs font-medium leading-relaxed">
                강의실 대여 신청은 평일 기준 최소 2일 전까지만 가능합니다. (가장 빠른 대여 시작 가능일: <span className="font-bold underline">{earliestAllowedStr}</span>)
              </p>
            </div>
          </div>
        )}

        {/* 3 & 4. 대여 기간 초과 및 주말 예외 규칙 학과장 승인 서약서 */}
        {needsApproval && (
          <div className="space-y-3 bg-amber-950/30 border border-amber-900/40 rounded-xl p-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-start gap-2.5 text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider">행정 예외 및 추가 동의 필수</p>
                <p className="text-xs font-semibold leading-relaxed">{validationError}</p>
                <p className="text-[11px] text-[#9b8f91] leading-relaxed">
                  대여 제약 기준(최대 3일/주말 금~월 미준수)을 초과하는 대여 신청은 <strong>학과장님 승인</strong>이 필수적입니다. 담당 조교와 상담 및 승인을 받으셨다면 하단 체크박스에 동의 후 신청을 접수할 수 있습니다.
                </p>
              </div>
            </div>
            
            <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#1a191b] border border-[#3a3640] hover:border-[#524d5b] cursor-pointer transition select-none">
              <input
                type="checkbox"
                checked={hasDepartmentApproval}
                onChange={(e) => setHasDepartmentApproval(e.target.checked)}
                className="w-4.5 h-4.5 rounded-md accent-[#a78bfa] border-[#3a3640] focus:ring-transparent"
              />
              <span className="text-xs font-bold text-[#c8c4c3]">
                학과장님께 본 대여 신청 건에 대한 사전 서면/대면 승인을 완료했습니다.
              </span>
            </label>
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-3 text-center text-xs font-bold text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full h-11 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#a78bfa] text-sm font-bold text-[#0f0e11] hover:bg-[#bca5ff] disabled:bg-[#201f21] disabled:border disabled:border-[#2e2b2f] disabled:text-[#6b6468] transition duration-200"
        >
          {isPending ? '대여 신청 접수 중...' : '강의실 대여 신청 완료'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
