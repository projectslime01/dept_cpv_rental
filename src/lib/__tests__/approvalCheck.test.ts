import { describe, it, expect } from 'vitest'
import { peakConcurrentUsage, makeStockLine, summarizeStock } from '../approvalCheck'

const at = (s: string) => new Date(s)
const iv = (s: string, e: string, quantity: number) => ({ startAt: at(s), endAt: at(e), quantity })

describe('peakConcurrentUsage — 기간 내 최대 동시 사용량', () => {
  const S = at('2026-10-13T09:00')
  const E = at('2026-10-16T18:00')

  it('대여가 없으면 0', () => {
    expect(peakConcurrentUsage([], S, E)).toBe(0)
  })

  it('서로 겹치지 않는 대여는 합산하지 않는다 (최대치만)', () => {
    // 월~화 3대, 목~금 4대 → 동시에 나가 있는 최대는 4대
    const list = [iv('2026-10-13T09:00', '2026-10-14T18:00', 3), iv('2026-10-15T09:00', '2026-10-16T18:00', 4)]
    expect(peakConcurrentUsage(list, S, E)).toBe(4)
  })

  it('겹치는 대여는 합산한다', () => {
    const list = [iv('2026-10-13T09:00', '2026-10-15T18:00', 3), iv('2026-10-14T09:00', '2026-10-16T18:00', 4)]
    expect(peakConcurrentUsage(list, S, E)).toBe(7)
  })

  it('끝나는 시각에 시작하는 대여는 겹치지 않는다 (반열림 구간)', () => {
    const list = [iv('2026-10-13T09:00', '2026-10-14T10:00', 3), iv('2026-10-14T10:00', '2026-10-15T10:00', 4)]
    expect(peakConcurrentUsage(list, S, E)).toBe(4)
  })

  it('조회 기간 밖의 대여는 세지 않는다', () => {
    const list = [iv('2026-10-01T09:00', '2026-10-02T18:00', 9), iv('2026-10-20T09:00', '2026-10-21T18:00', 9)]
    expect(peakConcurrentUsage(list, S, E)).toBe(0)
  })

  it('조회 기간 경계에 딱 맞닿은 대여는 세지 않는다', () => {
    const list = [iv('2026-10-12T09:00', '2026-10-13T09:00', 5), iv('2026-10-16T18:00', '2026-10-17T09:00', 5)]
    expect(peakConcurrentUsage(list, S, E)).toBe(0)
  })

  it('기간에 걸쳐 있는 대여는 센다', () => {
    const list = [iv('2026-10-10T09:00', '2026-10-14T09:00', 2), iv('2026-10-16T09:00', '2026-10-20T09:00', 3)]
    expect(peakConcurrentUsage(list, S, E)).toBe(3)
  })

  it('수량 0 이하는 무시한다', () => {
    expect(peakConcurrentUsage([iv('2026-10-13T09:00', '2026-10-14T09:00', 0)], S, E)).toBe(0)
  })
})

describe('makeStockLine — 가용/부족 계산', () => {
  it('여유가 있으면 부족 0', () => {
    const l = makeStockLine({ key: 'eq:1', kind: 'equipment', label: '소니 FX3', total: 10, peakUsed: 4, requested: 3 })
    expect(l.available).toBe(6)
    expect(l.shortage).toBe(0)
  })

  it('요청이 가용을 넘으면 부족 수량을 계산한다', () => {
    const l = makeStockLine({ key: 'eq:1', kind: 'equipment', label: '소니 FX3', total: 10, peakUsed: 9, requested: 3 })
    expect(l.available).toBe(1)
    expect(l.shortage).toBe(2)
  })

  it('이미 초과 대여 상태여도 가용은 0 미만이 되지 않는다', () => {
    const l = makeStockLine({ key: 'eq:1', kind: 'equipment', label: '소니 FX3', total: 2, peakUsed: 5, requested: 1 })
    expect(l.available).toBe(0)
    expect(l.shortage).toBe(1)
  })
})

describe('summarizeStock — 묶음 판정', () => {
  const ok = makeStockLine({ key: 'eq:1', kind: 'equipment', label: 'A', total: 5, peakUsed: 0, requested: 1 })
  const short = makeStockLine({ key: 'eq:2', kind: 'equipment', label: 'B', total: 1, peakUsed: 1, requested: 1 })

  it('모두 여유가 있으면 ok', () => {
    expect(summarizeStock([ok]).ok).toBe(true)
  })

  it('하나라도 부족하면 묶음 전체 불가', () => {
    const r = summarizeStock([ok, short])
    expect(r.ok).toBe(false)
    expect(r.shortages.map((l) => l.label)).toEqual(['B'])
  })
})
