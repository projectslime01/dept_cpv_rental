/**
 * 승인 시 재고 확인용 순수 계산 (DB 의존성 없음 — 서버·클라이언트 공용).
 * DB 조회는 approvalCheck.server.ts 가 담당한다.
 */

export interface UsageInterval {
  startAt: Date
  endAt: Date
  quantity: number
}

/**
 * [start, end) 구간에서 intervals 가 동시에 사용하는 최대 수량.
 *
 * 기간과 겹치는 대여를 단순히 모두 더하면 서로 겹치지 않는 대여(예: 월~화, 목~금)까지
 * 합쳐져 실제보다 부족하다고 판정되므로, 시점별 동시 사용량의 최댓값을 구한다.
 * 구간은 반열림이다 — 10:00 에 끝나는 대여와 10:00 에 시작하는 대여는 겹치지 않는다.
 */
export function peakConcurrentUsage(intervals: UsageInterval[], start: Date, end: Date): number {
  const s0 = start.getTime()
  const e0 = end.getTime()
  const events: [number, number][] = []
  for (const iv of intervals) {
    if (iv.quantity <= 0) continue
    const s = Math.max(iv.startAt.getTime(), s0)
    const e = Math.min(iv.endAt.getTime(), e0)
    if (s >= e) continue
    events.push([s, iv.quantity], [e, -iv.quantity])
  }
  // 같은 시각이면 종료(-)를 먼저 처리해야 맞닿은 대여가 겹친 것으로 세지지 않는다.
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  let current = 0
  let peak = 0
  for (const [, delta] of events) {
    current += delta
    if (current > peak) peak = current
  }
  return peak
}

export interface StockLine {
  /** 'eq:<equipmentId>' 또는 'acc:<재고 풀 키>' */
  key: string
  kind: 'equipment' | 'accessory'
  label: string
  requested: number
  total: number
  /** 이 기간에 추가로 내줄 수 있는 수량 (0 미만이 되지 않음) */
  available: number
  /** 요청 대비 모자란 수량 (0이면 승인 가능) */
  shortage: number
  /** 부속 줄일 때, 이 재고 풀에 속하는 요청 부속 id 들 (화면에서 부속 옆 표시용) */
  accessoryIds?: number[]
}

export function makeStockLine(input: {
  key: string
  kind: 'equipment' | 'accessory'
  label: string
  total: number
  peakUsed: number
  requested: number
  accessoryIds?: number[]
}): StockLine {
  const available = Math.max(0, input.total - input.peakUsed)
  return {
    key: input.key,
    kind: input.kind,
    label: input.label,
    requested: input.requested,
    total: input.total,
    available,
    shortage: Math.max(0, input.requested - available),
    ...(input.accessoryIds ? { accessoryIds: input.accessoryIds } : {}),
  }
}

export interface GroupStockResult {
  ok: boolean
  lines: StockLine[]
  shortages: StockLine[]
}

/** 하나라도 부족하면 묶음 전체를 승인할 수 없다. */
export function summarizeStock(lines: StockLine[]): GroupStockResult {
  const shortages = lines.filter((l) => l.shortage > 0)
  return { ok: shortages.length === 0, lines, shortages }
}
