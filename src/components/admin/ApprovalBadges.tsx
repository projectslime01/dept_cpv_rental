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
