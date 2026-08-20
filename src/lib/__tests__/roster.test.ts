import { describe, it, expect } from 'vitest'
import {
  normalizeStudentId,
  normalizeName,
  namesMatch,
  normalizeMajor,
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
    { studentId: 'A1', name: '김하나', grade: 1, className: 'A', major: '영상콘텐츠과', status: 'active' },
    { studentId: 'A2', name: '이두리', grade: 2, className: 'A', major: '영상콘텐츠과', status: 'active' },
    { studentId: 'A3', name: '박세찬', grade: 3, className: 'B', major: '영상콘텐츠과', status: 'inactive' },
  ]

  it('파일에만 있는 학생은 added', () => {
    const rows: RosterRow[] = [{ studentId: 'A9', name: '신입생', grade: 1, className: 'A', major: '영상콘텐츠과' }]
    const d = computeRosterDiff(rows, [])
    expect(d.added.map((r) => r.studentId)).toEqual(['A9'])
    expect(d.updated).toHaveLength(0)
    expect(d.deactivated).toHaveLength(0)
  })

  it('값이 달라지면 updated', () => {
    const rows: RosterRow[] = [{ studentId: 'A1', name: '김하나', grade: 2, className: 'A', major: '영상콘텐츠과' }]
    const d = computeRosterDiff(rows, existing)
    expect(d.updated.map((r) => r.studentId)).toEqual(['A1'])
  })

  it('값이 같으면 unchanged로 세고 updated에 넣지 않는다', () => {
    const rows: RosterRow[] = [{ studentId: 'A1', name: '김하나', grade: 1, className: 'A', major: '영상콘텐츠과' }]
    const d = computeRosterDiff(rows, existing)
    expect(d.updated).toHaveLength(0)
    expect(d.unchanged).toBe(1)
  })

  it('inactive 학생이 파일에 있으면 복원 대상이므로 updated', () => {
    const rows: RosterRow[] = [{ studentId: 'A3', name: '박세찬', grade: 3, className: 'B', major: '영상콘텐츠과' }]
    const d = computeRosterDiff(rows, existing)
    expect(d.updated.map((r) => r.studentId)).toEqual(['A3'])
  })

  it('파일에 없는 active 학생은 deactivated', () => {
    const rows: RosterRow[] = [{ studentId: 'A1', name: '김하나', grade: 1, className: 'A', major: '영상콘텐츠과' }]
    const d = computeRosterDiff(rows, existing)
    expect(d.deactivated.map((s) => s.studentId)).toEqual(['A2'])
  })

  it('이미 inactive인 학생은 deactivated에 넣지 않는다', () => {
    const d = computeRosterDiff([], existing)
    expect(d.deactivated.map((s) => s.studentId)).toEqual(['A1', 'A2'])
  })
})

describe('normalizeMajor', () => {
  it('앞뒤 공백을 없애고 연속 공백은 하나로 줄인다', () => {
    expect(normalizeMajor('  영상콘텐츠과  ')).toBe('영상콘텐츠과')
    expect(normalizeMajor('영상콘텐츠과   영상콘텐츠제작전공')).toBe('영상콘텐츠과 영상콘텐츠제작전공')
  })
  it('두 마디 전공명의 공백은 보존한다 (화면 가독성)', () => {
    expect(normalizeMajor('영상콘텐츠과 뉴미디어콘텐츠전공')).toBe('영상콘텐츠과 뉴미디어콘텐츠전공')
  })
  it('빈 값은 null', () => {
    expect(normalizeMajor('   ')).toBeNull()
    expect(normalizeMajor(null)).toBeNull()
  })
})

describe('전공별 교체 범위 (파일 여러 개 업로드)', () => {
  const 세전공: ExistingStudent[] = [
    { studentId: 'A1', name: '가', grade: 1, className: 'A', major: '영상콘텐츠과', status: 'active' },
    { studentId: 'B1', name: '나', grade: 1, className: 'A', major: '방송영상과', status: 'active' },
    { studentId: 'C1', name: '다', grade: 1, className: 'A', major: '광고영상과', status: 'active' },
  ]

  it('한 전공만 올리면 다른 전공은 건드리지 않는다', () => {
    const rows: RosterRow[] = [
      { studentId: 'A1', name: '가', grade: 1, className: 'A', major: '영상콘텐츠과' },
    ]
    const d = computeRosterDiff(rows, 세전공)
    expect(d.deactivated).toHaveLength(0)
    expect(d.scopeMajors).toEqual(['영상콘텐츠과'])
    expect(d.outOfScopeActive).toBe(2)
  })

  it('해당 전공에서 빠진 학생만 비활성화된다', () => {
    const rows: RosterRow[] = [
      { studentId: 'A9', name: '새학생', grade: 1, className: 'A', major: '영상콘텐츠과' },
    ]
    const d = computeRosterDiff(rows, 세전공)
    expect(d.deactivated.map((s) => s.studentId)).toEqual(['A1'])
    expect(d.outOfScopeActive).toBe(2)
  })

  it('두 전공만 올리면 나머지 한 전공은 범위 밖으로 유지된다', () => {
    const rows: RosterRow[] = [
      { studentId: 'A1', name: '가', grade: 1, className: 'A', major: '영상콘텐츠과' },
      { studentId: 'B1', name: '나', grade: 1, className: 'A', major: '방송영상과' },
    ]
    const d = computeRosterDiff(rows, 세전공)
    expect(d.deactivated).toHaveLength(0)
    expect(d.scopeMajors).toHaveLength(2)
    expect(d.outOfScopeActive).toBe(1) // 광고영상과 C1 유지
  })

  it('세 전공을 한 번에 올리면 전체가 범위가 되고 빠진 학생만 비활성화된다', () => {
    const rows: RosterRow[] = [
      { studentId: 'A1', name: '가', grade: 1, className: 'A', major: '영상콘텐츠과' },
      { studentId: 'B1', name: '나', grade: 1, className: 'A', major: '방송영상과' },
      { studentId: 'C9', name: '신입', grade: 1, className: 'A', major: '광고영상과' },
    ]
    const d = computeRosterDiff(rows, 세전공)
    expect(d.deactivated.map((s) => s.studentId)).toEqual(['C1']) // 광고영상과에서 빠짐
    expect(d.scopeMajors).toHaveLength(3)
    expect(d.outOfScopeActive).toBe(0)
  })

  it('순차 업로드해도 앞서 올린 전공이 사라지지 않는다 (기존 버그 재발 방지)', () => {
    let current: ExistingStudent[] = []
    const files: RosterRow[][] = [
      [{ studentId: 'A1', name: '가', grade: 1, className: 'A', major: '영상콘텐츠과' }],
      [{ studentId: 'B1', name: '나', grade: 1, className: 'A', major: '방송영상과' }],
      [{ studentId: 'C1', name: '다', grade: 1, className: 'A', major: '광고영상과' }],
    ]
    for (const rows of files) {
      const d = computeRosterDiff(rows, current)
      const deactivatedIds = new Set(d.deactivated.map((s) => s.studentId))
      current = [
        ...current.filter((s) => !deactivatedIds.has(s.studentId)),
        ...d.added.map((r) => ({ ...r, status: 'active' })),
      ]
    }
    expect(current.map((s) => s.studentId).sort()).toEqual(['A1', 'B1', 'C1'])
  })

  it('전공 정보가 없으면 기존처럼 전체 교체', () => {
    const noMajor: ExistingStudent[] = [
      { studentId: 'X1', name: '가', grade: 1, className: null, major: null, status: 'active' },
    ]
    const rows: RosterRow[] = [
      { studentId: 'X2', name: '나', grade: 1, className: null, major: null },
    ]
    const d = computeRosterDiff(rows, noMajor)
    expect(d.deactivated.map((s) => s.studentId)).toEqual(['X1'])
    expect(d.scopeMajors).toEqual([])
  })
})
