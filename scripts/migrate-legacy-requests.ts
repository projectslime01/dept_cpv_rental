/**
 * 시트("영상콘텐츠과의 모든것" → 대여 현황 탭)의 기존 신청 건을
 * 시스템 DB(RentalRequest / ClassroomRentalRequest)로 이전.
 *
 * 기본은 DRY RUN(미리보기, 쓰기 없음).
 *   미리보기: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-legacy-requests.ts
 *   실제반영: DATABASE_URL=... APPLY=1 npx ts-node ... scripts/migrate-legacy-requests.ts
 *
 * 정책:
 *  - 품목별 분리 생성: 기자재 신청 1건의 여러 품목 → 품목당 RentalRequest 1건 (groupNumber 공유)
 *  - 누락 필드 플레이스홀더: 학번 00000000, 연락처 000-0000-0000, 비밀번호 0000(해시)
 *  - 상태: endAt <= now → returned(returnedAt=endAt), 아니면 approved
 *  - DB에 없는 품목(충전기/홀리랜드/웨건 등)은 생성하지 않고 purpose에 "(미매핑: ...)"로 보존
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { neonConfig } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

;(neonConfig as any).poolQueryViaFetch = true

const APPLY = process.env.APPLY === '1'
const cs = process.env.DATABASE_URL || ''
const prisma = cs.startsWith('file:')
  ? new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: cs.replace('file:', '') }) })
  : new PrismaClient({ adapter: new PrismaNeon({ connectionString: cs }) })

const YEAR = 2026

// ─── 기자재 별칭 → DB equipment id ───────────────────────────
const EQ: Record<string, number> = {
  '소니 FX3': 1, FX3: 1,
  '소니 A7M4': 2, A7M4: 2,
  '소니 Z90': 3, Z90: 3,
  '24-70': 4, '소니 24-70': 4,
  '16-35': 5,
  '12-24': 6,
  '24-105': 7,
  '70-200': 8,
  '35': 9,
  '50': 10,
  '85': 11,
  '100': 12,
  '100-400': 13,
  '짐벌': 14,
  '드론': 15,
  'LCD모니터': 16, 'LCD 모니터': 16,
  VR: 17,
  '5.5인치모니터': 18, '5.5인치 모니터': 18, '5.5인치 모니터 세트': 18,
  '조명배터리': 19, '조명 배터리': 19,
  '조명': 20, '조명세트': 20, '조명 세트': 20,
  'SD카드': 21, sd카드: 21, 'SD 카드': 21,
  'CF카드': 22, 'CF 카드': 22, '소니 CF카드': 22,
  'CF카드 리더기': 23, 'CF 카드 리더기': 23, 'CF 리더기': 23,
  'CF type-C': 24, 'CF type C': 24, 'CF Type C': 24,
  '리더기': 25, 'SD카드 리더기': 25, sd카드_리더기: 25, 'SD 리더기': 25,
  '셔틀러 삼각대': 26, '서틀리 삼각대': 26, '셔틀러': 26,
  '스몰리그 삼각대': 27,
  '매직암': 28,
  '매트박스': 29, '매트박스/가변 ND': 29, '매트박스&가변 ND': 29, '가변 ND': 29, 'ND필터': 29,
  'XLR탑핸들': 30, 'XLR 탑핸들': 30, 'XLR 핸들': 30,
  'FX3/A7M4 배터리': 41, '대응 배터리': 41, 'A7M4 대응 배터리': 41, 'A7M4 배터리': 41,
  'FX3 대응 배터리': 41, '카메라 배터리': 41, '카메라 대응 배터리': 41,
  '스몰리그 모니터 배터리': 42, '모니터배터리': 42, '모니터 배터리': 42,
  'Z90 배터리': 43, z90_배터리: 43,
  '무선 마이크 세트': 44, '무선마이크 세트': 44,
  '무선 마이크 선 3.5mm': 45, '무선마이크선': 45, '무선 마이크 선': 45, '3.5mm 마이크선': 45,
  '젠하이저 붐마이크': 46, '붐마이크': 46,
  '헤드셋': 47,
  '이어폰': 48,
  'XLR 케이블': 49, 'XLR케이블': 49,
  '에어브러쉬': 50,
  '소니 Z90 가방': 51, Z90가방: 51, z90_가방: 51,
  'HDMI 케이블': 52, 'HDMI케이블': 52, HDMI: 52,
  '릴선': 53,
}

type Item = [string, number] // [별칭, 수량]
interface EqReq { name: string; start: string; end: string; items: Item[] }
interface RoomReq { name: string; room: string; start: string; end: string }

// ─── 기자재 신청 (대여 현황 탭) ──────────────────────────────
const EQUIP: EqReq[] = [
  { name: '서용준', start: '6.1 16:04', end: '6.5 10:30', items: [['SD카드', 1], ['SD카드 리더기', 1]] },
  { name: '김승우', start: '6.4 13:10', end: '6.5 10:00', items: [['A7M4', 2], ['24-105', 2], ['셔틀러 삼각대', 2], ['무선 마이크 세트', 2], ['3.5mm 마이크선', 2], ['대응 배터리', 4], ['sd카드', 3], ['리더기', 2], ['이어폰', 2]] },
  { name: '김시우', start: '6.4 17:40', end: '6.5 13:20', items: [['A7M4', 1], ['24-70', 1], ['70-200', 1], ['스몰리그 삼각대', 1], ['조명', 2], ['A7M4 배터리', 2], ['매트박스', 1]] },
  { name: '심하은', start: '6.4 14:00', end: '6.8 13:30', items: [['A7M4', 1], ['FX3', 1], ['24-105', 2], ['50', 1], ['스몰리그 삼각대', 2], ['sd카드', 2], ['5.5인치모니터', 2], ['모니터배터리', 4], ['카메라 배터리', 6], ['에어브러쉬', 1], ['HDMI케이블', 2], ['XLR탑핸들', 1], ['XLR케이블', 1], ['카메라 배터리 충전기', 2], ['젠하이저 붐마이크', 1], ['무선마이크 세트', 1], ['리더기', 1], ['짐벌', 1], ['무선 마이크 선', 1]] },
  { name: '유희종', start: '6.5 9:30', end: '6.8 14:30', items: [['FX3', 1], ['24-105', 1], ['스몰리그 삼각대', 1], ['XLR 핸들', 1], ['5.5인치 모니터 세트', 1], ['스몰리그 모니터 배터리', 2], ['FX3 대응 배터리', 3], ['HDMI', 1], ['젠하이저 붐마이크', 1], ['CF카드', 1], ['CF 리더기', 1], ['이어폰', 1], ['매트박스', 1], ['짐벌', 1], ['매직암', 1], ['헤드셋', 1]] },
  { name: '이아영', start: '6.5 10:20', end: '6.8 13:40', items: [['A7M4', 1], ['24-105', 1], ['셔틀러 삼각대', 1], ['카메라 배터리', 2], ['무선 마이크 세트', 4], ['CF Express type A', 2], ['CF Express type A 리더기', 1], ['홀리랜드 M1', 1], ['모니터 배터리', 2], ['HDMI 케이블', 1], ['에어브러쉬', 1]] },
  { name: '김혜림', start: '6.5 10:50', end: '6.5 17:20', items: [['FX3', 1], ['A7M4', 1], ['24-105', 2], ['50', 2], ['스몰리그 삼각대', 2], ['XLR 탑핸들', 2], ['5.5인치 모니터', 1], ['모니터 배터리', 2], ['카메라 대응 배터리', 3], ['HDMI 케이블', 1], ['매트박스/가변 ND', 2], ['CF카드', 2], ['CF 리더기', 1], ['SD카드 리더기', 2], ['카메라 배터리 충전기', 1], ['CF type-C', 2], ['에어브러쉬', 1], ['붐마이크', 1], ['릴선', 1], ['이어폰', 2], ['헤드셋', 1], ['조명세트', 2], ['조명배터리', 2], ['웨건', 1]] },
  { name: '권태서', start: '6.5 13:30', end: '6.8 13:30', items: [['Z90', 1], ['스몰리그 삼각대', 1], ['Z90가방', 1], ['SD 카드', 2], ['Z90 배터리', 2], ['SD 리더기', 1]] },
  { name: '이경주', start: '6.5 17:00', end: '6.8 10:00', items: [['A7M4', 1], ['24-70', 1], ['16-35', 1], ['셔틀러 삼각대', 1], ['A7M4 대응 배터리', 3], ['5.5인치 모니터', 1], ['매직암', 1], ['모니터 배터리', 2], ['CF 카드', 1], ['CF 카드 리더기', 1], ['매트박스', 1], ['HDMI', 1], ['ND필터', 1]] },
  { name: '김연서', start: '6.8 15:30', end: '6.10 10:20', items: [['A7M4', 1], ['24-70', 1], ['85', 1], ['16-35', 1], ['셔틀러 삼각대', 1], ['A7M4 대응 배터리', 3], ['카메라 배터리 충전기', 1], ['sd카드', 1], ['SD카드 리더기', 1], ['매트박스&가변 ND', 1], ['홀리랜드', 1], ['모니터 배터리', 2], ['HDMI 케이블', 1], ['매직암', 1]] },
  { name: '김연우', start: '6.8 13:30', end: '6.9 10:00', items: [['FX3', 1], ['50', 1], ['CF카드', 1], ['CF 카드 리더기', 1], ['카메라 배터리', 2], ['무선 마이크 세트', 1], ['무선마이크선', 1]] },
  { name: '임수민', start: '6.9 13:00', end: '6.9 17:30', items: [['Z90', 1], ['스몰리그 삼각대', 1], ['Z90 배터리', 2], ['SD카드', 1], ['리더기', 1], ['이어폰', 1]] },
  { name: '패디과', start: '6.15 10:00', end: '6.15 13:00', items: [['A7M4', 1], ['24-105', 1], ['SD카드', 1], ['A7M4 배터리', 1], ['셔틀러 삼각대', 1]] },
]

// ─── 강의실 신청 (대여 현황 탭) ──────────────────────────────
const ROOMS: RoomReq[] = [
  { name: '채다빈', room: '507-1호', start: '6.5 17:30', end: '6.5 22:00' },
  { name: '김다현', room: '507-2호', start: '6.5 17:30', end: '6.5 22:00' },
  { name: '김연우', room: '507-4호', start: '6.5 17:30', end: '6.5 22:00' },
  { name: '최준식', room: '507-5호', start: '6.5 17:30', end: '6.5 22:30' },
  { name: '이소희', room: '507-6호', start: '6.5 17:30', end: '6.5 23:00' },
  { name: '김보민', room: '507-1호', start: '6.8 13:30', end: '6.8 17:20' },
  { name: '김시우', room: '507-1호', start: '6.8 17:40', end: '6.9 7:00' },
  { name: '김채은', room: '507-4호', start: '6.8 15:00', end: '6.8 22:00' },
  { name: '장서안', room: '503호', start: '6.9 12:30', end: '6.9 13:00' },
  { name: '문지현', room: '507-2호', start: '6.9 13:00', end: '6.9 22:00' },
  { name: '임태성', room: '507-3호', start: '6.9 17:30', end: '6.10 7:00' },
  { name: '박나리', room: '507-4호', start: '6.9 15:30', end: '6.9 23:30' },
  { name: '이경주', room: '507-5호', start: '6.9 12:30', end: '6.9 17:00' },
  { name: '김보민', room: '507-6호', start: '6.9 14:30', end: '6.9 22:00' },
  { name: '장미', room: '507-2호', start: '6.10 14:30', end: '6.10 22:00' },
  { name: '박재우', room: '507-3호', start: '6.10 14:30', end: '6.11 7:00' },
  { name: '김보민', room: '507-6호', start: '6.10 13:30', end: '6.10 23:00' },
]

// "6.4 13:10" → Date (KST). DB는 UTC 저장이지만 기존 코드와 동일하게 로컬 해석.
function parse(dt: string): Date {
  const [d, t] = dt.trim().split(/\s+/)
  const [mo, da] = d.split('.').map(Number)
  const [hh, mm] = t.split(':').map(Number)
  // KST(+09:00) 기준 시각을 UTC로 변환
  return new Date(Date.UTC(YEAR, mo - 1, da, hh - 9, mm, 0))
}

async function main() {
  const now = new Date()
  const passwordHash = await bcrypt.hash('0000', 10)

  // 강의실 roomNumber → id
  const classrooms = await prisma.classroom.findMany({ select: { id: true, roomNumber: true } })
  const ROOM: Record<string, number> = {}
  classrooms.forEach((c) => (ROOM[c.roomNumber] = c.id))

  console.log(`\n${'='.repeat(60)}`)
  console.log(`모드: ${APPLY ? '⚠️  APPLY (실제 쓰기)' : '🔍 DRY RUN (미리보기, 쓰기 없음)'}`)
  console.log(`DB: ${cs.startsWith('file:') ? 'SQLite(local)' : 'Neon(prod)'}`)
  console.log('='.repeat(60))

  // ── 기자재 ──
  const unmappedSet = new Map<string, number>()
  let eqRecordCount = 0
  const eqPlan: Array<{ group: string; name: string; eqId: number; qty: number; start: Date; end: Date; status: string; purpose: string | null }> = []

  EQUIP.forEach((req, i) => {
    const group = `MIG-E-${String(i + 1).padStart(3, '0')}`
    const start = parse(req.start)
    const end = parse(req.end)
    const status = end <= now ? 'returned' : 'approved'
    const unmappedHere: string[] = []
    req.items.forEach(([alias, qty]) => {
      const eqId = EQ[alias]
      if (!eqId) {
        unmappedHere.push(`${alias} ${qty}`)
        unmappedSet.set(alias, (unmappedSet.get(alias) ?? 0) + 1)
        return
      }
      eqPlan.push({ group, name: req.name, eqId, qty, start, end, status, purpose: null })
      eqRecordCount++
    })
    // 미매핑 품목을 이 그룹 첫 레코드의 purpose에 보존
    if (unmappedHere.length) {
      const firstOfGroup = eqPlan.find((p) => p.group === group)
      const note = `(미매핑 품목: ${unmappedHere.join(', ')})`
      if (firstOfGroup) firstOfGroup.purpose = note
      else {
        // 모든 품목이 미매핑이면 레코드가 없음 — 경고만
        console.log(`  ⚠️ ${req.name}: 전 품목 미매핑 → 레코드 없음 ${note}`)
      }
    }
  })

  console.log(`\n[기자재] 원본 ${EQUIP.length}건 → 분리 생성 ${eqRecordCount}개 레코드`)
  console.log(`[강의실] 원본 ${ROOMS.length}건 → ${ROOMS.length}개 레코드`)

  console.log(`\n── DB에 없는 미매핑 품목 (생성 제외, purpose에 기록) ──`)
  if (unmappedSet.size === 0) console.log('  없음')
  else Array.from(unmappedSet.entries()).forEach(([k, v]) => console.log(`  • ${k} (${v}건의 신청에서 등장)`))

  // 강의실 미매핑 체크
  const roomUnmapped = ROOMS.filter((r) => !ROOM[r.room]).map((r) => r.room)
  if (roomUnmapped.length) console.log(`\n  ⚠️ 미매핑 강의실: ${Array.from(new Set(roomUnmapped)).join(', ')}`)

  // 상태 분포
  const eqReturned = eqPlan.filter((p) => p.status === 'returned').length
  console.log(`\n── 상태 분포 (기준 now=${now.toISOString()}) ──`)
  console.log(`  기자재: returned ${eqReturned} / approved ${eqPlan.length - eqReturned}`)

  if (!APPLY) {
    console.log(`\n미리보기 샘플 (기자재 앞 8개):`)
    eqPlan.slice(0, 8).forEach((p) =>
      console.log(`  ${p.group} ${p.name} | eq#${p.eqId} x${p.qty} | ${p.start.toISOString().slice(0, 16)}~${p.end.toISOString().slice(0, 16)} | ${p.status}${p.purpose ? ' | ' + p.purpose : ''}`),
    )
    console.log(`\n✋ DRY RUN 종료. 실제 반영하려면 APPLY=1 로 다시 실행.`)
    await prisma.$disconnect()
    return
  }

  // ── 실제 쓰기 ──
  console.log(`\n쓰기 시작...`)
  let seq = 0
  for (const p of eqPlan) {
    seq++
    const ymd = `${p.start.getUTCFullYear()}${String(p.start.getUTCMonth() + 1).padStart(2, '0')}${String(p.start.getUTCDate()).padStart(2, '0')}`
    const requestNumber = `REQ-${ymd}-M${String(seq).padStart(4, '0')}`
    await prisma.rentalRequest.create({
      data: {
        requestNumber,
        groupNumber: p.group,
        passwordHash,
        applicantName: p.name,
        studentId: '00000000',
        phone: '000-0000-0000',
        equipmentId: p.eqId,
        quantity: p.qty,
        startAt: p.start,
        endAt: p.end,
        purpose: p.purpose,
        status: p.status,
        returnedAt: p.status === 'returned' ? p.end : null,
      },
    })
  }
  let rseq = 0
  for (const r of ROOMS) {
    const roomId = ROOM[r.room]
    if (!roomId) { console.log(`  ⚠️ 강의실 미매핑 스킵: ${r.name} ${r.room}`); continue }
    rseq++
    const start = parse(r.start)
    const end = parse(r.end)
    const status = end <= now ? 'returned' : 'approved'
    const ymd = `${start.getUTCFullYear()}${String(start.getUTCMonth() + 1).padStart(2, '0')}${String(start.getUTCDate()).padStart(2, '0')}`
    const requestNumber = `ROOM-${ymd}-M${String(rseq).padStart(4, '0')}`
    await prisma.classroomRentalRequest.create({
      data: {
        requestNumber,
        passwordHash,
        applicantName: r.name,
        studentId: '00000000',
        phone: '000-0000-0000',
        classroomId: roomId,
        startAt: start,
        endAt: end,
        status,
        returnedAt: status === 'returned' ? end : null,
      },
    })
  }
  console.log(`\n✅ 완료: 기자재 ${eqPlan.length}건 + 강의실 ${rseq}건 생성`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
