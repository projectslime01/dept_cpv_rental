/**
 * 규정 제5조 기준 기자재별 최소 학년(minGrade) 일괄 설정.
 *  미리보기: DATABASE_URL=... npx ts-node --compiler-options '{"module":"CommonJS","target":"ES2017"}' scripts/set-equipment-grades.ts
 *  실제반영: APPLY=1 DATABASE_URL=... npx ts-node ... scripts/set-equipment-grades.ts
 *
 * 매핑 규칙:
 *  - 카메라 바디: Z90→1(캠코더), A7M4→2, FX3→3
 *  - 렌즈: 24-105mm→2, 그 외 전체→3
 *  - 영상 장비: 짐벌→2, 그 외(드론/모니터/VR)→3
 *  - 필터(매트박스·ND·IRND·XLR탑핸들)→3
 *  - 조명·삼각대·저장매체·배터리·음향·기타→1 (보조 장비, 누구나)
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { neonConfig } from '@neondatabase/serverless'
;(neonConfig as any).poolQueryViaFetch = true

const APPLY = process.env.APPLY === '1'
const cs = process.env.DATABASE_URL || ''
const prisma = cs.startsWith('file:')
  ? new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: cs.replace('file:', '') }) })
  : new PrismaClient({ adapter: new PrismaNeon({ connectionString: cs }) })

function gradeFor(name: string, category: string): number {
  if (category === '카메라 바디') {
    if (name.includes('Z90')) return 1
    if (name.includes('A7M4')) return 2
    if (name.includes('FX3')) return 3
    return 2
  }
  if (category === '렌즈') {
    return name.includes('24-105') ? 2 : 3
  }
  if (category === '영상 장비') {
    if (name.includes('짐벌')) return 2
    return 3 // 드론, 모니터, VR 등
  }
  if (category === '필터') return 3 // 매트박스/ND/IRND/XLR탑핸들
  // 조명, 삼각대/지지대, 저장 매체, 배터리, 음향, 기타 → 1
  return 1
}

async function main() {
  const eq = await prisma.equipment.findMany({
    select: { id: true, name: true, category: true, minGrade: true },
    orderBy: { id: 'asc' },
  })

  console.log(`\n모드: ${APPLY ? '⚠️ APPLY (실제 쓰기)' : '🔍 DRY RUN'} / DB: ${cs.startsWith('file:') ? 'SQLite' : 'Neon(prod)'}`)
  console.log('='.repeat(64))
  const byGrade: Record<number, string[]> = { 1: [], 2: [], 3: [] }
  const updates: Array<{ id: number; g: number }> = []
  for (const e of eq) {
    const g = gradeFor(e.name, e.category)
    byGrade[g].push(`${e.name}[${e.category}]`)
    if (e.minGrade !== g) updates.push({ id: e.id, g })
  }
  for (const g of [1, 2, 3]) {
    console.log(`\n── ${g}학년 이상 (${byGrade[g].length}종) ──`)
    console.log('  ' + byGrade[g].join(', '))
  }
  console.log(`\n변경 필요: ${updates.length}종 / 전체 ${eq.length}종`)

  if (!APPLY) {
    console.log('\n✋ DRY RUN. 반영하려면 APPLY=1')
    await prisma.$disconnect()
    return
  }
  for (const u of updates) {
    await prisma.equipment.update({ where: { id: u.id }, data: { minGrade: u.g } })
  }
  console.log(`\n✅ ${updates.length}종 minGrade 반영 완료`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
