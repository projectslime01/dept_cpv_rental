import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseRosterBuffer, parseGrade, matchHeader } from '../rosterParse'

function sheetBuffer(rows: (string | number | null)[][], bookType: 'xlsx' | 'xls' = 'xlsx'): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '명단')
  return XLSX.write(wb, { type: 'buffer', bookType }) as Buffer
}

describe('parseGrade', () => {
  it('숫자와 "N학년" 표기를 모두 처리한다', () => {
    expect(parseGrade('3')).toBe(3)
    expect(parseGrade(2)).toBe(2)
    expect(parseGrade('1학년')).toBe(1)
    expect(parseGrade('1 ')).toBe(1) // 학사 시스템은 뒤에 공백을 붙여 내려준다
  })
  it('범위 밖이거나 해석 불가면 null', () => {
    expect(parseGrade('9')).toBeNull()
    expect(parseGrade('없음')).toBeNull()
    expect(parseGrade(null)).toBeNull()
  })
})

describe('matchHeader', () => {
  it('별칭과 공백을 무시하고 컬럼을 찾는다', () => {
    const headers = [' 학 번 ', '성명', '학년', '분반', '학과']
    expect(matchHeader(headers, 'studentId')).toBe(0)
    expect(matchHeader(headers, 'name')).toBe(1)
    expect(matchHeader(headers, 'grade')).toBe(2)
    expect(matchHeader(headers, 'className')).toBe(3)
    expect(matchHeader(headers, 'major')).toBe(4)
  })
  it('없으면 -1', () => {
    expect(matchHeader(['이름'], 'studentId')).toBe(-1)
  })
})

describe('parseRosterBuffer', () => {
  it('표준 명단을 파싱한다', async () => {
    const buf = sheetBuffer([
      ['학번', '이름', '학년', '반', '학과'],
      ['2022102048', '진은범', 3, 'A', '영상콘텐츠과'],
    ])
    const r = await parseRosterBuffer(buf, 'roster.xlsx')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.rows[0]).toEqual({
      studentId: '2022102048', name: '진은범', grade: 3, className: 'A', major: '영상콘텐츠과',
    })
    expect(r.majors).toEqual(['영상콘텐츠과'])
  })

  it('컬럼 순서가 달라도 헤더로 찾는다', async () => {
    const buf = sheetBuffer([
      ['이름', '학년', '학번'],
      ['김하나', '2학년', '2023102001'],
    ])
    const r = await parseRosterBuffer(buf, 'roster.xlsx')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.rows[0]).toEqual({ studentId: '2023102001', name: '김하나', grade: 2, className: null, major: null })
  })

  it('헤더 위 제목·여백 행과 빈 행, 선행 빈 열을 건너뛴다', async () => {
    const buf = sheetBuffer([
      ['', '재 학 생 명 부', '', '', ''],
      [],
      ['', '학번', '이름', '학년', '반'],
      ['', '2023102001', '김하나', 1, 'A'],
      [],
      ['', '2023102002', '이두리', 2, 'B'],
    ])
    const r = await parseRosterBuffer(buf, 'roster.xlsx')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.rows).toHaveLength(2)
  })

  it('필수 컬럼이 없으면 파일명과 함께 거부한다', async () => {
    const buf = sheetBuffer([['이름', '반'], ['김하나', 'A']])
    const r = await parseRosterBuffer(buf, '잘못된파일.xlsx')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('잘못된파일.xlsx')
    expect(r.error).toContain('컬럼')
  })

  it('유효 행이 0건이면 거부한다', async () => {
    const buf = sheetBuffer([['학번', '이름', '학년']])
    const r = await parseRosterBuffer(buf, 'roster.xlsx')
    expect(r.ok).toBe(false)
  })

  it('중복 학번은 뒤엣것으로 덮어쓴다', async () => {
    const buf = sheetBuffer([
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

  it('구형 .xls(BIFF8) 형식도 읽는다', async () => {
    const buf = sheetBuffer([
      ['학번', '이름', '학년', '학과'],
      ['2023102001', '김하나', 1, '영상콘텐츠과'],
    ], 'xls')
    const r = await parseRosterBuffer(buf, 'roster.xls')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.rows).toHaveLength(1)
  })

  // 학사 시스템이 내려주는 실제 명부와 같은 구조(구형 .xls, 4행 헤더,
  // 선행 빈 열, 값 뒤 공백)를 그대로 두고 개인정보만 익명화한 픽스처.
  it('학사 시스템 형식의 .xls 명부를 파싱한다', async () => {
    const buf = readFileSync(join(__dirname, 'fixtures', 'sample-roster.xls'))
    const r = await parseRosterBuffer(buf, 'sample-roster.xls')
    expect(r.ok).toBe(true)
    if (!r.ok) return

    expect(r.rows).toHaveLength(72)
    expect(r.skipped).toBe(0)
    expect(r.majors).toEqual(['영상콘텐츠과'])

    // 뒤 공백이 붙어 내려오는 값들이 정리되는지
    const first = r.rows[0]
    expect(first.studentId).toBe('2020000001')
    expect(first.name).toBe('학생01')
    expect(first.grade).toBe(1)
    expect(first.className).toBe('A')
    expect(first.major).toBe('영상콘텐츠과')

    expect(r.rows.every((x) => /^\d{10}$/.test(x.studentId))).toBe(true)
    expect(r.rows.every((x) => x.grade >= 1 && x.grade <= 4)).toBe(true)
  })
})
