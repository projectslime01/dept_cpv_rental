import { describe, it, expect } from 'vitest'
import { groupStatus } from '../requestGrouping'

const rows = (...statuses: string[]) => statuses.map((status) => ({ status }))

describe('groupStatus — 상태가 섞인 묶음의 대표 상태', () => {
  it('모두 같은 상태면 그 상태', () => {
    expect(groupStatus(rows('approved', 'approved'))).toBe('approved')
  })

  it('승인된 묶음에 대기 건이 합류하면 대기 (처리할 일이 남아 있음)', () => {
    // 첫 줄(최신)이 아니어도 대기 건이 있으면 대기
    expect(groupStatus(rows('approved', 'pending', 'approved'))).toBe('pending')
  })

  it('합류한 건만 거절되면 나머지 승인 건 기준으로 승인 (반납 처리 가능해야 함)', () => {
    expect(groupStatus(rows('rejected', 'approved', 'approved'))).toBe('approved')
  })

  it('승인 건이 반납되고 거절 건만 남으면 반납', () => {
    expect(groupStatus(rows('rejected', 'returned'))).toBe('returned')
  })

  it('모두 거절이면 거절', () => {
    expect(groupStatus(rows('rejected', 'rejected'))).toBe('rejected')
  })
})
