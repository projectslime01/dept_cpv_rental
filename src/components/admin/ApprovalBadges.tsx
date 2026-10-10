import type { GroupStockResult, StockLine } from '@/lib/approvalCheck'

const OK = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
const BAD = 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/40'

/** 품목 옆 재고 표시: "가용 3/10" 또는 "가용 1/10 · 2개 부족" */
export function StockPill({ line }: { line: StockLine }) {
  const short = line.shortage > 0
  return (
    <span
      className={`ml-1.5 inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md border whitespace-nowrap align-middle ${short ? BAD : OK}`}
    >
      가용 {line.available}/{line.total}
      {short ? ` · ${line.shortage}개 부족` : ''}
    </span>
  )
}

/** 신청 건 승인 가능 여부 배지 + 부족 요약 */
export function StockStatusBadge({ stock }: { stock: GroupStockResult }) {
  return (
    <div className="mt-1.5 space-y-1">
      <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${stock.ok ? OK : BAD}`}>
        {stock.ok ? '승인 가능' : '재고 부족'}
      </span>
      {!stock.ok && (
        <ul className="text-[10px] leading-snug text-red-600 dark:text-red-400 text-left">
          {stock.shortages.map((l) => (
            <li key={l.key} className="break-keep">
              {l.kind === 'accessory' ? '└ ' : ''}
              {l.label} {l.shortage}개 부족
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** 강의실 신청 건 충돌 배지 + 요약 */
export function ClassroomConflictBadge({ conflicts }: { conflicts: string[] }) {
  const ok = conflicts.length === 0
  return (
    <div className="mt-1.5 space-y-1">
      <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${ok ? OK : BAD}`}>
        {ok ? '승인 가능' : '예약 충돌'}
      </span>
      {!ok && (
        <ul className="text-[10px] leading-snug text-red-600 dark:text-red-400 text-left max-w-[220px] mx-auto">
          {conflicts.map((c) => (
            <li key={c} className="break-keep">{c}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

const ROW_STATUS_LABELS: Record<string, string> = {
  pending: '대기', approved: '승인됨', rejected: '거절됨', returned: '반납됨',
}

/** 상태가 섞인 묶음에서 대표 상태와 다른 품목 옆에 붙이는 표시 (예: 이미 승인된 품목) */
export function RowStatusTag({ status }: { status: string }) {
  return (
    <span className="ml-1.5 inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md border whitespace-nowrap align-middle bg-surface-raised text-base-muted border-base">
      {ROW_STATUS_LABELS[status] ?? status}
    </span>
  )
}

/** 상태가 섞인 묶음이면 "추가 신청 1건 · 기존 승인 13건"처럼 구성을 알려준다. */
export function MixedStatusNote({ rows, status }: { rows: { status: string }[]; status: string }) {
  const others = rows.filter((r) => r.status !== status)
  if (others.length === 0) return null
  const counts = new Map<string, number>()
  for (const r of others) counts.set(r.status, (counts.get(r.status) ?? 0) + 1)
  const main = rows.length - others.length
  const mainLabel = status === 'pending' ? '추가 신청' : (ROW_STATUS_LABELS[status] ?? status)
  return (
    <div className="mt-1 text-[10px] leading-snug text-base-muted break-keep">
      {mainLabel} {main}건
      {Array.from(counts.entries()).map(([s, n]) => ` · ${ROW_STATUS_LABELS[s] ?? s} ${n}건`).join('')}
    </div>
  )
}
