/**
 * 명단 파일 파싱. 서버 전용.
 *
 * SheetJS를 쓰는 이유: 학사 시스템이 내려주는 명부가 구형 .xls(BIFF8)라
 * zip 기반인 .xlsx만 읽는 라이브러리로는 열리지 않는다. .xls / .xlsx / .csv를
 * 한 라이브러리로 처리한다.
 *
 * 컬럼은 순서가 아니라 헤더명으로 찾는다. 헤더 위쪽 제목·여백 행과
 * 비어 있는 선행 열(A열)이 있어도 동작한다.
 */
import * as XLSX from 'xlsx'
import { normalizeStudentId, normalizeMajor, type RosterRow } from './roster'

type Field = 'studentId' | 'name' | 'grade' | 'className' | 'major'

const HEADER_ALIASES: Record<Field, string[]> = {
  studentId: ['학번', '학번호', 'studentid', 'student_id'],
  name: ['이름', '성명', 'name'],
  grade: ['학년', 'grade'],
  className: ['반', '분반', 'class', 'classname'],
  major: ['학과', '전공', '학과명', '전공명', '학부', 'major', 'department'],
}

function canon(v: unknown): string {
  return String(v ?? '').replace(/\s+/g, '').toLowerCase()
}

/** 헤더 배열에서 해당 필드의 컬럼 인덱스를 찾는다. 없으면 -1. */
export function matchHeader(headers: unknown[], field: Field): number {
  const aliases = HEADER_ALIASES[field]
  return headers.findIndex((h) => aliases.includes(canon(h)))
}

/** "3", 3, "3학년" -> 3. 1~4 범위 밖이거나 해석 불가면 null. */
export function parseGrade(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  const m = String(raw).match(/\d+/)
  if (!m) return null
  const n = parseInt(m[0], 10)
  return n >= 1 && n <= 4 ? n : null
}

export type ParseResult =
  | { ok: true; rows: RosterRow[]; skipped: number; majors: string[] }
  | { ok: false; error: string }

/** 파일 전체를 문자열 셀 격자로 읽는다. 서식·수식은 표시값으로 평탄화한다. */
function readGrid(buffer: Buffer): string[][] | null {
  try {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false })
    const ws = wb.Sheets[wb.SheetNames[0]]
    if (!ws) return null
    return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: '' })
  } catch {
    return null
  }
}

export async function parseRosterBuffer(buffer: Buffer, fileName: string): Promise<ParseResult> {
  const grid = readGrid(buffer)
  if (!grid) {
    return { ok: false, error: `'${fileName}' 파일을 읽을 수 없습니다. xls, xlsx 또는 csv 파일인지 확인해 주세요.` }
  }

  // 헤더 행 탐색: 학번·이름·학년을 모두 찾을 수 있는 첫 행
  let headerRowIdx = -1
  let cols = { studentId: -1, name: -1, grade: -1, className: -1, major: -1 }
  for (let i = 0; i < Math.min(grid.length, 30); i++) {
    const headers = (grid[i] ?? []).map((c) => String(c ?? ''))
    const c = {
      studentId: matchHeader(headers, 'studentId'),
      name: matchHeader(headers, 'name'),
      grade: matchHeader(headers, 'grade'),
      className: matchHeader(headers, 'className'),
      major: matchHeader(headers, 'major'),
    }
    if (c.studentId >= 0 && c.name >= 0 && c.grade >= 0) {
      headerRowIdx = i
      cols = c
      break
    }
  }

  if (headerRowIdx === -1) {
    return {
      ok: false,
      error: `'${fileName}'에서 필수 컬럼(학번·이름·학년)을 찾을 수 없습니다. 헤더 행을 확인해 주세요.`,
    }
  }

  const byId = new Map<string, RosterRow>()
  let skipped = 0

  for (let i = headerRowIdx + 1; i < grid.length; i++) {
    const cells = (grid[i] ?? []).map((c) => String(c ?? ''))
    if (cells.every((c) => c.trim() === '')) continue

    const studentId = normalizeStudentId(cells[cols.studentId] ?? '')
    const name = (cells[cols.name] ?? '').trim()
    const grade = parseGrade(cells[cols.grade])
    const className = cols.className >= 0 ? (cells[cols.className] ?? '').trim() || null : null
    const major = cols.major >= 0 ? normalizeMajor(cells[cols.major] ?? '') : null

    if (!studentId || !name || grade === null) {
      skipped++
      continue
    }
    byId.set(studentId, { studentId, name, grade, className, major })
  }

  const rows = Array.from(byId.values())
  if (rows.length === 0) {
    return { ok: false, error: `'${fileName}'에 유효한 학생 데이터가 없습니다. 파일 내용을 확인해 주세요.` }
  }

  const majors = Array.from(new Set(rows.map((r) => r.major).filter((m): m is string => m != null)))
  return { ok: true, rows, skipped, majors }
}
