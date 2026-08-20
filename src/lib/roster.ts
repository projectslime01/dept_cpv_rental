/**
 * 학생 명단 — 순수 로직 (DB·파일 의존 없음).
 * 정규화 / 이름 매칭 / 업로드 diff 계산.
 */

export interface RosterRow {
  studentId: string
  name: string
  grade: number
  className: string | null
  /** 학과·전공. 업로드 교체 범위를 가르는 기준이 된다. */
  major: string | null
}

export interface ExistingStudent {
  studentId: string
  name: string
  grade: number
  className: string | null
  major: string | null
  status: string
}

export interface RosterDiff {
  added: RosterRow[]
  updated: RosterRow[]
  deactivated: ExistingStudent[]
  unchanged: number
  /** 이번 업로드가 교체를 책임지는 전공 목록 */
  scopeMajors: string[]
  /** 범위 밖이라 손대지 않은 활성 학생 수 */
  outOfScopeActive: number
}

/** 학번 정규화: 앞뒤 공백만 제거한다(학번 체계 변경 대비해 문자 변환은 하지 않음). */
export function normalizeStudentId(raw: string): string {
  return raw.trim()
}

/** 이름 비교용 정규화: 모든 공백 제거. 저장은 원본 표기를 유지한다. */
export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, '')
}

/**
 * 전공명 정규화: 앞뒤 공백을 없애고 연속 공백을 하나로 줄인다. 빈 값은 null.
 *
 * 공백을 전부 지우지 않는 이유는 학사 명부의 학과 값이
 * "영상콘텐츠과 영상콘텐츠제작전공"처럼 두 마디로 오기 때문이다.
 * 전부 지우면 화면에 "영상콘텐츠과영상콘텐츠제작전공"으로 붙어 읽기 어렵다.
 */
export function normalizeMajor(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const v = raw.replace(/\s+/g, ' ').trim()
  return v.length > 0 ? v : null
}

/** 공백 차이를 무시한 이름 일치 여부. 빈 이름은 항상 불일치. */
export function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a)
  if (na.length === 0) return false
  return na === normalizeName(b)
}

/**
 * 업로드 파일(rows)과 현재 DB 상태(existing)를 비교해 변경분을 계산한다.
 *
 * 교체 범위는 업로드에 등장한 전공으로 한정한다. 전공이 여러 개인 학과에서
 * 파일을 나눠 올려도, 이번에 올리지 않은 전공 학생은 건드리지 않는다.
 * 업로드에 전공 정보가 전혀 없으면(단일 명단) 전체를 교체 범위로 본다.
 */
export function computeRosterDiff(rows: RosterRow[], existing: ExistingStudent[]): RosterDiff {
  const existingMap = new Map(existing.map((s) => [s.studentId, s]))
  const rowIds = new Set(rows.map((r) => r.studentId))

  const added: RosterRow[] = []
  const updated: RosterRow[] = []
  let unchanged = 0

  for (const row of rows) {
    const prev = existingMap.get(row.studentId)
    if (!prev) {
      added.push(row)
      continue
    }
    const same =
      prev.name === row.name &&
      prev.grade === row.grade &&
      (prev.className ?? null) === (row.className ?? null) &&
      (prev.major ?? null) === (row.major ?? null) &&
      prev.status === 'active'
    if (same) unchanged++
    else updated.push(row)
  }

  const scopeMajors = Array.from(new Set(rows.map((r) => r.major).filter((m): m is string => m != null)))
  const scopeAll = scopeMajors.length === 0
  const inScope = (s: ExistingStudent) =>
    scopeAll || (s.major != null && scopeMajors.includes(s.major))

  const activeNotInFile = existing.filter((s) => s.status === 'active' && !rowIds.has(s.studentId))
  const deactivated = activeNotInFile.filter(inScope)
  const outOfScopeActive = activeNotInFile.length - deactivated.length

  return { added, updated, deactivated, unchanged, scopeMajors, outOfScopeActive }
}
