/**
 * 순수 대여 유틸리티 (DB 의존성 없음 — 클라이언트/서버 양쪽에서 임포트 가능)
 */
import { format } from 'date-fns'

export function generateRequestNumber(date: Date, id: number): string {
  const dateStr = format(date, 'yyyyMMdd')
  return `REQ-${dateStr}-${String(id).padStart(4, '0')}`
}

/**
 * 특정 일자가 한국 공휴일인지 판별 (주말 제외, 주말은 외부에서 판별)
 */
export function isHoliday(date: Date): boolean {
  const y = date.getFullYear()
  const m = date.getMonth() + 1 // 1 ~ 12
  const d = date.getDate()

  // 양력 법정 공휴일
  if (m === 1 && d === 1) return true   // 신정
  if (m === 3 && d === 1) return true   // 삼일절
  if (m === 5 && d === 5) return true   // 어린이날
  if (m === 6 && d === 6) return true   // 현충일
  if (m === 8 && d === 15) return true  // 광복절
  if (m === 10 && d === 3) return true  // 개천절
  if (m === 10 && d === 9) return true  // 한글날
  if (m === 12 && d === 25) return true // 성탄절

  // 2026년 음력 명절 및 대체 공휴일 (KST 기준 하드코딩)
  if (y === 2026) {
    // 설날 연휴: 2월 16일 ~ 2월 18일
    if (m === 2 && (d === 16 || d === 17 || d === 18)) return true
    // 삼일절 대체공휴일: 3월 2일
    if (m === 3 && d === 2) return true
    // 부처님오신날(5월 24일) 및 대체공휴일(5월 25일)
    if (m === 5 && (d === 24 || d === 25)) return true
    // 광복절 대체공휴일: 8월 17일
    if (m === 8 && d === 17) return true
    // 추석 연휴: 9월 24일 ~ 9월 26일, 대체공휴일: 9월 28일
    if (m === 9 && (d === 24 || d === 25 || d === 26 || d === 28)) return true
    // 개천절 대체공휴일: 10월 5일
    if (m === 10 && d === 5) return true
  }

  return false
}

/**
 * UTC Date를 한국 시각(KST, UTC+9)으로 완벽하게 파싱한 일자 및 시/분 정보 반환
 */
export function getKSTHoursAndMinutes(date: Date) {
  const kstString = date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
  const kstDate = new Date(kstString)
  return {
    day: kstDate.getDay(), // 0: 일, 1: 월, ..., 6: 토
    hours: kstDate.getHours(),
    minutes: kstDate.getMinutes(),
    date: kstDate
  }
}

/**
 * 대여 신청(폼 작성)이 평일 09:00 ~ 17:00 (공휴일 제외) 이내인지 판별
 */
export function isSubmissionTimeValid(date: Date): boolean {
  const kst = getKSTHoursAndMinutes(date)
  if (kst.day === 0 || kst.day === 6) return false
  if (isHoliday(kst.date)) return false

  const time = kst.hours * 60 + kst.minutes
  return time >= 9 * 60 && time <= 17 * 60
}

/**
 * 신청일(applyDate) 기준 평일 2일 전 예약을 준수하기 위한 가장 빠른 대여 시작일(00:00 KST 기준) 산출
 */
export function getEarliestAllowedStartDate(applyDate: Date): Date {
  const kstApply = getKSTHoursAndMinutes(applyDate).date
  const current = new Date(kstApply.getFullYear(), kstApply.getMonth(), kstApply.getDate())
  let weekdaysAdded = 0

  while (weekdaysAdded < 2) {
    current.setDate(current.getDate() + 1)
    const day = current.getDay()
    if (day !== 0 && day !== 6 && !isHoliday(current)) {
      weekdaysAdded++
    }
  }

  return new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0, 0)
}

/**
 * 대여 시작일이 평일 기준 최소 2일 전인지 판별
 */
export function isValidStartDate(startAt: Date, applyDate: Date): boolean {
  const earliest = getEarliestAllowedStartDate(applyDate)
  const kstStart = getKSTHoursAndMinutes(startAt).date
  const startDayZero = new Date(kstStart.getFullYear(), kstStart.getMonth(), kstStart.getDate(), 0, 0, 0, 0)
  return startDayZero >= earliest
}

/**
 * 대여 기간 내 실제 평일(영업일) 수량 카운트 (시작일과 종료일이 걸치는 날 기준)
 */
export function countWeekdaysInRange(start: Date, end: Date): number {
  const kstStart = getKSTHoursAndMinutes(start).date
  const kstEnd = getKSTHoursAndMinutes(end).date

  let count = 0
  const current = new Date(kstStart.getFullYear(), kstStart.getMonth(), kstStart.getDate())
  const last = new Date(kstEnd.getFullYear(), kstEnd.getMonth(), kstEnd.getDate())

  while (current <= last) {
    const day = current.getDay()
    if (day !== 0 && day !== 6 && !isHoliday(current)) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  return count
}

/**
 * 대여 기간이 주말(토/일)을 포함하는지 판별
 */
export function includesWeekend(start: Date, end: Date): boolean {
  const kstStart = getKSTHoursAndMinutes(start).date
  const kstEnd = getKSTHoursAndMinutes(end).date

  const current = new Date(kstStart.getFullYear(), kstStart.getMonth(), kstStart.getDate())
  const last = new Date(kstEnd.getFullYear(), kstEnd.getMonth(), kstEnd.getDate())

  while (current <= last) {
    const day = current.getDay()
    if (day === 0 || day === 6) {
      return true
    }
    current.setDate(current.getDate() + 1)
  }
  return false
}

/**
 * 주말이 포함된 대여의 경우, 반드시 금요일 반출 및 월요일 반납을 준수하는지 판별
 */
export function isValidWeekendRental(start: Date, end: Date): boolean {
  if (!includesWeekend(start, end)) return true
  const kstStart = getKSTHoursAndMinutes(start).date
  const kstEnd = getKSTHoursAndMinutes(end).date
  return kstStart.getDay() === 5 && kstEnd.getDay() === 1
}
