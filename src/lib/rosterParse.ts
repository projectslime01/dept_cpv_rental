/**
 * 명단 파일(xlsx/csv) 파싱. 서버 전용.
 * 컬럼 순서에 의존하지 않고 헤더명으로 매핑한다.
 */
import ExcelJS from 'exceljs'
import { normalizeStudentId, type RosterRow } from './roster'

type Field = 'studentId' | 'name' | 'grade' | 'className'

const HEADER_ALIASES: Record<Field, string[]> = {
  studentId: ['학번', '학번호', 'studentid', 'student_id', 'id'],
  name: ['이름', '성명', 'name'],
  grade: ['학년', 'grade'],
  className: ['반', '분반', 'class', 'classname'],
}

function canon(v: unknown): string {
  return String(v ?? '').replace(/\s+/g, '').toLowerCase()
}

/** 헤더 배열에서 해당 필드의 컬럼 인덱스를 찾는다. 없으면 -1. */
export function matchHeader(headers: unknown[], field: Field): number {
  const aliases = HEADER_ALIASES[field]
  return headers.findIndex((h) => aliases.includes(canon(h)))
}

/** "3", 3, "3학년" -> 3. 1~3 범위 밖이거나 해석 불가면 null. */
export function parseGrade(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  const m = String(raw).match(/\d+/)
  if (!m) return null
  const n = parseInt(m[0], 10)
  return n >= 1 && n <= 3 ? n : null
}

export type ParseResult =
  | { ok: true; rows: RosterRow[]; skipped: number }
  | { ok: false; error: string }

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object' && 'text' in v) return String((v as { text: unknown }).text ?? '')
  if (typeof v === 'object' && 'result' in v) return String((v as { result: unknown }).result ?? '')
  return String(v)
}

export async function parseRosterBuffer(buffer: Buffer, fileName: string): Promise<ParseResult> {
  const wb = new ExcelJS.Workbook()
  try {
    if (fileName.toLowerCase().endsWith('.csv')) {
      const { Readable } = await import('stream')
      await wb.csv.read(Readable.from(buffer.toString('utf8')))
    } else {
      await wb.xlsx.load(buffer as unknown as ArrayBuffer)
    }
  } catch (err) {
    console.error('parseRosterBuffer: 파일 로드 실패', err)
    return { ok: false, error: '파일을 읽을 수 없습니다. xlsx 또는 csv 파일인지 확인해 주세요.' }
  }

  const ws = wb.worksheets[0]
  if (!ws) return { ok: false, error: '시트를 찾을 수 없습니다.' }

  // 헤더 행 탐색: 학번·이름·학년을 모두 찾을 수 있는 첫 행
  let headerRowIdx = -1
  let cols = { studentId: -1, name: -1, grade: -1, className: -1 }
  for (let i = 1; i <= Math.min(ws.rowCount, 20); i++) {
    const values = ws.getRow(i).values as ExcelJS.CellValue[]
    const headers = Array.isArray(values) ? values.slice(1).map(cellText) : []
    const c = {
      studentId: matchHeader(headers, 'studentId'),
      name: matchHeader(headers, 'name'),
      grade: matchHeader(headers, 'grade'),
      className: matchHeader(headers, 'className'),
    }
    if (c.studentId >= 0 && c.name >= 0 && c.grade >= 0) {
      headerRowIdx = i
      cols = c
      break
    }
  }

  if (headerRowIdx === -1) {
    return { ok: false, error: '필수 컬럼(학번·이름·학년)을 찾을 수 없습니다. 헤더 행을 확인해 주세요.' }
  }

  const byId = new Map<string, RosterRow>()
  let skipped = 0

  for (let i = headerRowIdx + 1; i <= ws.rowCount; i++) {
    const values = ws.getRow(i).values as ExcelJS.CellValue[]
    const cells = Array.isArray(values) ? values.slice(1).map(cellText) : []
    if (cells.every((c) => c.trim() === '')) continue

    const studentId = normalizeStudentId(cells[cols.studentId] ?? '')
    const name = (cells[cols.name] ?? '').trim()
    const grade = parseGrade(cells[cols.grade])
    const className = cols.className >= 0 ? (cells[cols.className] ?? '').trim() || null : null

    if (!studentId || !name || grade === null) {
      skipped++
      continue
    }
    byId.set(studentId, { studentId, name, grade, className })
  }

  const rows = Array.from(byId.values())
  if (rows.length === 0) {
    return { ok: false, error: '유효한 학생 데이터가 없습니다. 파일 내용을 확인해 주세요.' }
  }

  return { ok: true, rows, skipped }
}
