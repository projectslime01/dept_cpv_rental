/**
 * 승인 시 재고·예약 충돌 확인 — 서버 전용 쿼리.
 *
 * 순수 계산은 @/lib/approvalCheck 에 있고, 여기서는 DB 에서 "이미 승인된" 대여를
 * 읽어 와 그 계산에 넘긴다. db 인자로 트랜잭션 클라이언트를 받을 수 있어
 * 승인 액션이 같은 트랜잭션 안에서 다시 확인할 때도 그대로 쓴다.
 */

import type { Prisma } from '@prisma/client'
import { format } from 'date-fns'
import { prisma } from '@/lib/prisma'
import {
  peakConcurrentUsage,
  makeStockLine,
  summarizeStock,
  type GroupStockResult,
  type StockLine,
  type UsageInterval,
} from '@/lib/approvalCheck'
import { findTimetableConflict } from '@/lib/timetable'

type Db = Prisma.TransactionClient

export interface PendingRentalRow {
  id: number
  equipmentId: number
  quantity: number
  startAt: Date
  endAt: Date
  accessories: { accessoryId: number; quantity: number }[]
}

const periodKey = (s: Date, e: Date) => `${s.getTime()}|${e.getTime()}`

/**
 * 승인 대기 묶음들의 기자재·부속 재고를 확인한다.
 * 반환: 묶음 key → 판정 결과. (같은 기자재/부속 풀은 묶음 안에서 요청 수량을 합산)
 */
export async function checkEquipmentGroupsStock(
  groups: { key: string; rows: PendingRentalRow[] }[],
  db: Db = prisma,
): Promise<Map<string, GroupStockResult>> {
  const result = new Map<string, GroupStockResult>()
  const allRows = groups.flatMap((g) => g.rows)
  if (allRows.length === 0) return result

  const windowStart = new Date(Math.min(...allRows.map((r) => r.startAt.getTime())))
  const windowEnd = new Date(Math.max(...allRows.map((r) => r.endAt.getTime())))
  const rowIds = allRows.map((r) => r.id)
  const equipmentIds = Array.from(new Set(allRows.map((r) => r.equipmentId)))

  // ── 기자재: 총량 + 승인된 대여 ─────────────────────────────────────────
  const [equipments, approvedRentals, accessories] = await Promise.all([
    db.equipment.findMany({
      where: { id: { in: equipmentIds } },
      select: { id: true, name: true, totalQuantity: true },
    }),
    db.rentalRequest.findMany({
      where: {
        equipmentId: { in: equipmentIds },
        status: 'approved',
        id: { notIn: rowIds },
        startAt: { lt: windowEnd },
        endAt: { gt: windowStart },
      },
      select: { equipmentId: true, startAt: true, endAt: true, quantity: true },
    }),
    // 부속 표는 작으므로 통째로 읽어 재고 풀을 구성한다.
    db.equipmentAccessory.findMany({
      select: { id: true, name: true, totalQuantity: true, status: true, sharedStockKey: true },
    }),
  ])
  const equipmentById = new Map(equipments.map((e) => [e.id, e]))
  const approvedByEquipment = new Map<number, UsageInterval[]>()
  for (const r of approvedRentals) {
    const list = approvedByEquipment.get(r.equipmentId) ?? []
    list.push({ startAt: r.startAt, endAt: r.endAt, quantity: r.quantity })
    approvedByEquipment.set(r.equipmentId, list)
  }

  // ── 부속 재고 풀: sharedStockKey 가 같으면 한 풀, 총량은 활성 멤버 총량의 최댓값 ──
  const accessoryById = new Map(accessories.map((a) => [a.id, a]))
  const poolKeyOf = (accessoryId: number) => {
    const a = accessoryById.get(accessoryId)
    return a?.sharedStockKey ? `k:${a.sharedStockKey}` : `a:${accessoryId}`
  }
  const poolMembers = new Map<string, number[]>()
  const poolTotal = new Map<string, number>()
  for (const a of accessories) {
    const key = poolKeyOf(a.id)
    if (a.status === 'active') {
      poolMembers.set(key, [...(poolMembers.get(key) ?? []), a.id])
      poolTotal.set(key, Math.max(poolTotal.get(key) ?? 0, a.totalQuantity))
    }
  }

  const requestedPoolKeys = new Set(
    allRows.flatMap((r) => r.accessories.map((a) => poolKeyOf(a.accessoryId))),
  )
  const memberIdsForRequested = Array.from(requestedPoolKeys).flatMap((k) => poolMembers.get(k) ?? [])
  const approvedAccessoryUses = memberIdsForRequested.length
    ? await db.rentalRequestAccessory.findMany({
        where: {
          accessoryId: { in: memberIdsForRequested },
          rentalRequestId: { notIn: rowIds },
          rentalRequest: { status: 'approved', startAt: { lt: windowEnd }, endAt: { gt: windowStart } },
        },
        select: {
          accessoryId: true,
          quantity: true,
          rentalRequest: { select: { startAt: true, endAt: true } },
        },
      })
    : []
  const approvedByPool = new Map<string, UsageInterval[]>()
  for (const u of approvedAccessoryUses) {
    const key = poolKeyOf(u.accessoryId)
    const list = approvedByPool.get(key) ?? []
    list.push({ startAt: u.rentalRequest.startAt, endAt: u.rentalRequest.endAt, quantity: u.quantity })
    approvedByPool.set(key, list)
  }

  // ── 묶음별 판정 ──────────────────────────────────────────────────────
  for (const group of groups) {
    const lines: StockLine[] = []

    // 기자재: (기자재, 기간) 단위로 요청 수량 합산
    const eqDemand = new Map<string, { equipmentId: number; startAt: Date; endAt: Date; requested: number }>()
    for (const r of group.rows) {
      const k = `${r.equipmentId}|${periodKey(r.startAt, r.endAt)}`
      const d = eqDemand.get(k) ?? { equipmentId: r.equipmentId, startAt: r.startAt, endAt: r.endAt, requested: 0 }
      d.requested += r.quantity
      eqDemand.set(k, d)
    }
    for (const d of Array.from(eqDemand.values())) {
      const eq = equipmentById.get(d.equipmentId)
      lines.push(
        makeStockLine({
          key: `eq:${d.equipmentId}`,
          kind: 'equipment',
          label: eq?.name ?? `기자재 #${d.equipmentId}`,
          total: eq?.totalQuantity ?? 0,
          peakUsed: peakConcurrentUsage(approvedByEquipment.get(d.equipmentId) ?? [], d.startAt, d.endAt),
          requested: d.requested,
        }),
      )
    }

    // 부속: (재고 풀, 기간) 단위로 요청 수량 합산
    const accDemand = new Map<
      string,
      { poolKey: string; startAt: Date; endAt: Date; requested: number; accessoryIds: Set<number> }
    >()
    for (const r of group.rows) {
      for (const a of r.accessories) {
        if (a.quantity <= 0) continue
        const poolKey = poolKeyOf(a.accessoryId)
        const k = `${poolKey}|${periodKey(r.startAt, r.endAt)}`
        const d =
          accDemand.get(k) ??
          { poolKey, startAt: r.startAt, endAt: r.endAt, requested: 0, accessoryIds: new Set<number>() }
        d.requested += a.quantity
        d.accessoryIds.add(a.accessoryId)
        accDemand.set(k, d)
      }
    }
    for (const d of Array.from(accDemand.values())) {
      const firstId = Array.from(d.accessoryIds)[0]
      lines.push(
        makeStockLine({
          key: `acc:${d.poolKey}`,
          kind: 'accessory',
          label: accessoryById.get(firstId)?.name ?? '부속',
          total: poolTotal.get(d.poolKey) ?? 0, // 비활성 부속이면 0
          peakUsed: peakConcurrentUsage(approvedByPool.get(d.poolKey) ?? [], d.startAt, d.endAt),
          requested: d.requested,
          accessoryIds: Array.from(d.accessoryIds),
        }),
      )
    }

    result.set(group.key, summarizeStock(lines))
  }
  return result
}

export interface PendingClassroomRow {
  id: number
  classroomId: number
  startAt: Date
  endAt: Date
}

const fmt = (d: Date) => format(d, 'MM/dd HH:mm')

/**
 * 승인 대기 강의실 신청들의 충돌을 확인한다.
 * 같은 강의실의 승인된 예약과 기간이 겹치거나, 정규 수업 시간표와 겹치면 충돌.
 * 반환: 신청 id → 충돌 설명 목록 (비어 있으면 승인 가능)
 */
export async function checkClassroomConflicts(
  rows: PendingClassroomRow[],
  db: Db = prisma,
): Promise<Map<number, string[]>> {
  const result = new Map<number, string[]>()
  if (rows.length === 0) return result

  const windowStart = new Date(Math.min(...rows.map((r) => r.startAt.getTime())))
  const windowEnd = new Date(Math.max(...rows.map((r) => r.endAt.getTime())))
  const classroomIds = Array.from(new Set(rows.map((r) => r.classroomId)))
  const rowIds = rows.map((r) => r.id)

  const [approved, timetables] = await Promise.all([
    db.classroomRentalRequest.findMany({
      where: {
        classroomId: { in: classroomIds },
        status: 'approved',
        id: { notIn: rowIds },
        startAt: { lt: windowEnd },
        endAt: { gt: windowStart },
      },
      select: { classroomId: true, startAt: true, endAt: true, applicantName: true },
    }),
    db.classroomTimetable.findMany({ where: { classroomId: { in: classroomIds } } }),
  ])

  for (const row of rows) {
    const conflicts: string[] = []
    for (const a of approved) {
      if (a.classroomId !== row.classroomId) continue
      if (a.startAt < row.endAt && a.endAt > row.startAt) {
        conflicts.push(`이미 승인된 예약과 겹침 — ${a.applicantName} (${fmt(a.startAt)} ~ ${fmt(a.endAt)})`)
      }
    }
    const tt = findTimetableConflict(
      timetables.filter((t) => t.classroomId === row.classroomId),
      row.startAt,
      row.endAt,
    )
    if (tt) {
      const course = tt.entry.courseName ? `${tt.entry.courseName} ` : ''
      conflicts.push(
        `정규 수업과 겹침 — ${format(tt.date, 'MM/dd')} ${course}${tt.entry.startTime}~${tt.entry.endTime}`,
      )
    }
    result.set(row.id, conflicts)
  }
  return result
}
