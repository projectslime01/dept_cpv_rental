import { describe, it, expect } from 'vitest'
import {
  countWeekdaysInRange,
  includesWeekend,
  isValidWeekendRental,
  isValidStartDate,
} from '../rentalUtils'

/**
 * 신청 폼은 "YYYY-MM-DDTHH:mm" 형태의 KST 벽시계 문자열을 보내고,
 * 서버는 이를 서버 타임존으로 파싱한다. 따라서 아래 판정들은
 * 서버 타임존이 무엇이든(KST 개발 PC, UTC Vercel) 동일해야 한다.
 *
 * 이 파일은 TZ=UTC 로도 반드시 통과해야 한다:
 *   TZ=UTC npx vitest run src/lib/__tests__/rentalUtils.test.ts
 */
const at = (s: string) => new Date(s)

describe('countWeekdaysInRange — 서버 타임존 무관', () => {
  it('화 13:00 ~ 목 17:00 은 평일 3일이다 (오후 종료가 다음 날로 밀리면 안 된다)', () => {
    expect(countWeekdaysInRange(at('2026-08-25T13:00'), at('2026-08-27T17:00'))).toBe(3)
  })

  it('같은 날 안에서 끝나면 1일이다', () => {
    expect(countWeekdaysInRange(at('2026-08-25T09:00'), at('2026-08-25T18:00'))).toBe(1)
  })

  it('밤 늦게 끝나도 그날까지만 센다', () => {
    expect(countWeekdaysInRange(at('2026-08-25T09:00'), at('2026-08-26T23:30'))).toBe(2)
  })

  it('주말은 세지 않는다 (금 ~ 월 = 2일)', () => {
    expect(countWeekdaysInRange(at('2026-08-28T15:00'), at('2026-08-31T10:00'))).toBe(2)
  })
})

describe('includesWeekend — 서버 타임존 무관', () => {
  it('화 ~ 목 은 주말을 포함하지 않는다', () => {
    expect(includesWeekend(at('2026-08-25T13:00'), at('2026-08-27T17:00'))).toBe(false)
  })

  it('금 ~ 월 은 주말을 포함한다', () => {
    expect(includesWeekend(at('2026-08-28T15:00'), at('2026-08-31T10:00'))).toBe(true)
  })
})

describe('isValidWeekendRental — 서버 타임존 무관', () => {
  it('금요일 오후 반출 ~ 월요일 반납은 허용된다', () => {
    expect(isValidWeekendRental(at('2026-08-28T15:00'), at('2026-08-31T10:00'))).toBe(true)
  })

  it('금요일 늦은 시간 반출도 여전히 금요일로 본다', () => {
    expect(isValidWeekendRental(at('2026-08-28T18:00'), at('2026-08-31T10:00'))).toBe(true)
  })

  it('목요일 반출 ~ 월요일 반납은 허용되지 않는다', () => {
    expect(isValidWeekendRental(at('2026-08-27T15:00'), at('2026-08-31T10:00'))).toBe(false)
  })

  it('주말을 포함하지 않으면 규칙 대상이 아니다', () => {
    expect(isValidWeekendRental(at('2026-08-25T13:00'), at('2026-08-27T17:00'))).toBe(true)
  })
})

describe('isValidStartDate — 서버 타임존 무관', () => {
  // 신청 시각: 2026-08-21(금) 10:00 KST -> 가장 빠른 시작일은 평일 2일 뒤인 8/25(화)
  const applyAt = new Date('2026-08-21T01:00:00Z')

  it('가장 빠른 허용일에 시작하면 통과한다', () => {
    expect(isValidStartDate(at('2026-08-25T09:00'), applyAt)).toBe(true)
  })

  it('하루 이른 시작은 오후 시간이라도 차단된다', () => {
    expect(isValidStartDate(at('2026-08-24T16:00'), applyAt)).toBe(false)
  })
})
