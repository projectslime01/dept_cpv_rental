/**
 * 학생 명단 — 순수 로직 (DB·파일 의존 없음).
 * 정규화 / 이름 매칭 / 업로드 diff 계산.
 */

export interface RosterRow {
  studentId: string
  name: string
  grade: number
  className: string | null
}

export interface ExistingStudent {
  studentId: string
  name: string
  grade: number
  className: string | null
  status: string
}

export interface RosterDiff {
  added: RosterRow[]
  updated: RosterRow[]
  deactivated: ExistingStudent[]
  unchanged: number
}

/** 학번 정규화: 앞뒤 공백만 제거한다(학번 체계 변경 대비해 문자 변환은 하지 않음). */
export function normalizeStudentId(raw: string): string {
  return raw.trim()
}

/** 이름 비교용 정규화: 모든 공백 제거. 저장은 원본 표기를 유지한다. */
export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, '')
}

/** 공백 차이를 무시한 이름 일치 여부. 빈 이름은 항상 불일치. */
export function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a)
  if (na.length === 0) return false
  return na === normalizeName(b)
}

/**
 * 업로드 파일(rows)과 현재 DB 상태(existing)를 비교해 변경분을 계산한다.
 * 전체 교체 정책: 파일에 없는 active 학생은 비활성화 대상이 된다.
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
      prev.status === 'active'
    if (same) unchanged++
    else updated.push(row)
  }

  const deactivated = existing.filter((s) => s.status === 'active' && !rowIds.has(s.studentId))

  return { added, updated, deactivated, unchanged }
}
