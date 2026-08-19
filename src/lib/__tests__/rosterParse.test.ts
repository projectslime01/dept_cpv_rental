import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { parseRosterBuffer, parseGrade, matchHeader } from '../rosterParse'

async function xlsxBuffer(rows: (string | number | null)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('명단')
  rows.forEach((r) => ws.addRow(r))
  return Buffer.from(await wb.xlsx.writeBuffer())
}

describe('parseGrade', () => {
  it('숫자와 "N학년" 표기를 모두 처리한다', () => {
    expect(parseGrade('3')).toBe(3)
    expect(parseGrade(2)).toBe(2)
    expect(parseGrade('1학년')).toBe(1)
  })
  it('범위 밖이거나 해석 불가면 null', () => {
    expect(parseGrade('4')).toBeNull()
    expect(parseGrade('없음')).toBeNull()
    expect(parseGrade(null)).toBeNull()
  })
})

describe('matchHeader', () => {
  it('별칭과 공백을 무시하고 컬럼을 찾는다', () => {
    const headers = [' 학 번 ', '성명', '학년', '분반']
    expect(matchHeader(headers, 'studentId')).toBe(0)
    expect(matchHeader(headers, 'name')).toBe(1)
    expect(matchHeader(headers, 'grade')).toBe(2)
    expect(matchHeader(headers, 'className')).toBe(3)
  })
  it('없으면 -1', () => {
    expect(matchHeader(['이름'], 'studentId')).toBe(-1)
  })
})

describe('parseRosterBuffer', () => {
  it('표준 명단을 파싱한다', async () => {
    const buf = await xlsxBuffer([
      ['학번', '이름', '학년', '반'],
      ['2022102048', '진은범', 3, 'A'],
      ['2023102001', '김하나', 1, 'B'],
    ])
    const r = await parseRosterBuffer(buf, 'roster.xlsx')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.rows).toEqual([
      { studentId: '2022102048', name: '진은범', grade: 3, className: 'A' },
      { studentId: '2023102001', name: '김하나', grade: 1, className: 'B' },
    ])
  })

  it('컬럼 순서가 달라도 헤더로 찾는다', async () => {
    const buf = await xlsxBuffer([
      ['이름', '학년', '학번'],
      ['김하나', '2학년', '2023102001'],
    ])
    const r = await parseRosterBuffer(buf, 'roster.xlsx')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.rows[0]).toEqual({ studentId: '2023102001', name: '김하나', grade: 2, className: null })
  })

  it('헤더 위 여백 행과 빈 행을 건너뛴다', async () => {
    const buf = await xlsxBuffer([
      ['영상콘텐츠과 재학생 명단'],
      [],
      ['학번', '이름', '학년'],
      ['2023102001', '김하나', 1],
      [],
      ['2023102002', '이두리', 2],
    ])
    const r = await parseRosterBuffer(buf, 'roster.xlsx')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.rows).toHaveLength(2)
  })

  it('필수 컬럼이 없으면 거부한다', async () => {
    const buf = await xlsxBuffer([['이름', '반'], ['김하나', 'A']])
    const r = await parseRosterBuffer(buf, 'roster.xlsx')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('컬럼')
  })

  it('유효 행이 0건이면 거부한다', async () => {
    const buf = await xlsxBuffer([['학번', '이름', '학년']])
    const r = await parseRosterBuffer(buf, 'roster.xlsx')
    expect(r.ok).toBe(false)
  })

  it('중복 학번은 뒤엣것으로 덮어쓴다', async () => {
    const buf = await xlsxBuffer([
      ['학번', '이름', '학년'],
      ['A1', '김하나', 1],
      ['A1', '김하나', 2],
    ])
    const r = await parseRosterBuffer(buf, 'roster.xlsx')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0].grade).toBe(2)
  })
})
