import { describe, it, expect } from 'vitest'
import {
  normalizeStudentId,
  normalizeName,
  namesMatch,
  computeRosterDiff,
  type RosterRow,
  type ExistingStudent,
} from '../roster'

describe('normalizeStudentId', () => {
  it('앞뒤 공백을 제거한다', () => {
    expect(normalizeStudentId('  2022102048 ')).toBe('2022102048')
  })
  it('내부 문자는 보존한다', () => {
    expect(normalizeStudentId('2022-102048')).toBe('2022-102048')
  })
})

describe('normalizeName', () => {
  it('모든 공백을 제거한다', () => {
    expect(normalizeName('홍 길동')).toBe('홍길동')
    expect(normalizeName(' 홍  길 동 ')).toBe('홍길동')
  })
})

describe('namesMatch', () => {
  it('공백 차이를 무시하고 일치로 본다', () => {
    expect(namesMatch('홍 길동', '홍길동')).toBe(true)
  })
  it('다른 이름은 불일치', () => {
    expect(namesMatch('홍길동', '김길동')).toBe(false)
  })
  it('빈 문자열은 일치로 보지 않는다', () => {
    expect(namesMatch('', '')).toBe(false)
    expect(namesMatch('   ', '')).toBe(false)
  })
})

describe('computeRosterDiff', () => {
  const existing: ExistingStudent[] = [
    { studentId: 'A1', name: '김하나', grade: 1, className: 'A', status: 'active' },
    { studentId: 'A2', name: '이두리', grade: 2, className: 'A', status: 'active' },
    { studentId: 'A3', name: '박세찬', grade: 3, className: 'B', status: 'inactive' },
  ]

  it('파일에만 있는 학생은 added', () => {
    const rows: RosterRow[] = [{ studentId: 'A9', name: '신입생', grade: 1, className: 'A' }]
    const d = computeRosterDiff(rows, [])
    expect(d.added.map((r) => r.studentId)).toEqual(['A9'])
    expect(d.updated).toHaveLength(0)
    expect(d.deactivated).toHaveLength(0)
  })

  it('값이 달라지면 updated', () => {
    const rows: RosterRow[] = [{ studentId: 'A1', name: '김하나', grade: 2, className: 'A' }]
    const d = computeRosterDiff(rows, existing)
    expect(d.updated.map((r) => r.studentId)).toEqual(['A1'])
  })

  it('값이 같으면 unchanged로 세고 updated에 넣지 않는다', () => {
    const rows: RosterRow[] = [{ studentId: 'A1', name: '김하나', grade: 1, className: 'A' }]
    const d = computeRosterDiff(rows, existing)
    expect(d.updated).toHaveLength(0)
    expect(d.unchanged).toBe(1)
  })

  it('inactive 학생이 파일에 있으면 복원 대상이므로 updated', () => {
    const rows: RosterRow[] = [{ studentId: 'A3', name: '박세찬', grade: 3, className: 'B' }]
    const d = computeRosterDiff(rows, existing)
    expect(d.updated.map((r) => r.studentId)).toEqual(['A3'])
  })

  it('파일에 없는 active 학생은 deactivated', () => {
    const rows: RosterRow[] = [{ studentId: 'A1', name: '김하나', grade: 1, className: 'A' }]
    const d = computeRosterDiff(rows, existing)
    expect(d.deactivated.map((s) => s.studentId)).toEqual(['A2'])
  })

  it('이미 inactive인 학생은 deactivated에 넣지 않는다', () => {
    const d = computeRosterDiff([], existing)
    expect(d.deactivated.map((s) => s.studentId)).toEqual(['A1', 'A2'])
  })
})
