# 학생 명단 대조 기반 대여 자격 검증 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans 또는 superpowers:subagent-driven-development 로 태스크 단위 실행. 각 스텝은 체크박스(`- [ ]`)로 추적한다.

**Goal:** 학과 명단에 등재된 학생만 대여를 신청할 수 있게 하고, 학년을 명단 기준으로 판정해 기존의 학년 제한 무력화·제재 회피 구멍을 함께 막는다.

**Architecture:** `Student` 테이블을 대여 자격 원장으로 두고, 관리자가 엑셀/CSV 명단을 업로드하면 전체 교체 방식으로 동기화한다. 학생 신청 서버 액션 3곳에서 학번·이름을 명단과 대조하고, 통과 시 클라이언트가 보낸 학년 값을 폐기하고 명단의 학년으로 덮어쓴다. 순수 로직(정규화·매칭·diff)과 DB 접근, 파일 파싱을 별도 모듈로 분리해 단위 테스트한다.

**Tech Stack:** Next.js 14 App Router, Prisma 7 (PostgreSQL/Neon), vitest, exceljs (신규), Tailwind

**스펙:** `docs/superpowers/specs/2026-08-19-student-roster-verification-design.md`

---

## 작업 환경 주의사항 (반드시 먼저 읽을 것)

**1. worktree에서 git이 동작하지 않는다.**
`~/Documents` 접근이 macOS에 의해 차단되어 있고 이 worktree의 git 메타데이터가 그 아래 있다. `git status` 조차 실패한다. 따라서 **커밋은 별도 클론에서 수행한다.**

각 커밋 스텝은 다음 절차로 진행한다.

```bash
# 최초 1회: 접근 가능한 위치에 클론
SP="$SCRATCHPAD"   # 세션 스크래치패드 경로
git clone git@github.com:projectslime01/dept_cpv_rental.git "$SP/impl-clone"

# 매 커밋 시: 변경 파일을 클론으로 복사 후 커밋·푸시
WT="/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
cp "$WT/<변경파일>" "$SP/impl-clone/<같은경로>"
cd "$SP/impl-clone" && git add -A && git commit -m "..." && git push origin HEAD:main
```

`.env` / `.env.local` 은 **절대 클론에 커밋하지 않는다.** 클론에서 타입체크가 필요하면 env를 복사해 쓰되, 커밋 전 반드시 삭제한다.

**2. dev 서버는 프로덕션 DB(Neon)를 바라본다.**
`.env.local`의 `DATABASE_URL`이 Neon 프로덕션이다. 로컬에서 테스트 데이터를 만들면 실서비스 DB에 들어간다. 검증용 데이터는 반드시 정리한다.

**3. 스키마 반영은 `prisma db push`를 쓴다.**
이 프로젝트는 마이그레이션 파일이 stale하고 `db push` 방식으로 운영 중이다.

```bash
cd "$WT" && set -a && grep '^DATABASE_URL' .env.local > /tmp/dburl.env && source /tmp/dburl.env && set +a && rm /tmp/dburl.env
npx prisma db push && npx prisma generate
```

---

## 배포 순서 (중요)

명단이 비어 있는 상태로 검증이 켜지면 **모든 학생의 신청이 차단된다.** 반드시 아래 순서를 지킨다.

| 단계 | 내용 | 태스크 |
|---|---|---|
| Phase A | 스키마 + 명단 관리 기능만 배포 (검증 미적용, 기존 동작 그대로) | Task 1–6 |
| **체크포인트** | **관리자가 실제 명단 업로드 후 확인** | Task 7 |
| Phase B | 신청 검증 활성화 + 폼 변경 | Task 8–13 |

---

## 파일 구조

**신규 생성**

| 파일 | 책임 |
|---|---|
| `src/lib/roster.ts` | 순수 함수: 학번·이름 정규화, 이름 매칭, 명단 diff 계산. DB·파일 의존 없음 |
| `src/lib/rosterParse.ts` | 엑셀/CSV 버퍼 → `RosterRow[]` 파싱. 헤더 매핑과 행 검증 |
| `src/lib/roster.server.ts` | prisma 의존 학생 조회 (`findActiveStudent`) |
| `src/app/actions/students.ts` | 관리자 서버 액션: 업로드 미리보기·확정, 개별 추가, 활성/비활성 전환 |
| `src/app/admin/students/page.tsx` | 관리자 명단 관리 페이지 (서버 컴포넌트) |
| `src/components/admin/StudentRosterManager.tsx` | 명단 목록·업로드 2단계 UI·개별 추가 폼 (클라이언트) |
| `src/app/api/students/verify/route.ts` | 공개 자격 확인 API (POST, `{valid, grade?}`만 반환) |
| `src/lib/__tests__/roster.test.ts` | `roster.ts` 단위 테스트 |
| `src/lib/__tests__/rosterParse.test.ts` | 파서 단위 테스트 |

**수정**

| 파일 | 변경 |
|---|---|
| `prisma/schema.prisma` | `Student`, `StudentRosterUpload` 모델 추가 |
| `src/app/actions/rental.ts` | `createRentalRequest`, `createBatchRentalRequest`에 검증 + grade 덮어쓰기 |
| `src/app/actions/classroomRental.ts` | `createClassroomRentalRequest`에 검증 (강의실은 학년 미사용) |
| `src/components/rental/RentalForm.tsx` | 학년 선택 제거, 자격 확인 배지 추가 |
| `src/components/cart/CartPageClient.tsx` | 학년 선택 제거, 자격 확인 배지 추가 |
| `src/components/admin/AdminSidebar.tsx` | "학생 명단" 메뉴 추가 |

**삭제**

| 파일 | 이유 |
|---|---|
| `src/components/classroom/ClassroomForm.tsx` | 어느 페이지에서도 import되지 않는 죽은 코드 |
| `src/app/actions/classroom.ts`의 `createClassroomRequest` | 위 컴포넌트 전용. 검증 없는 신청 경로가 되살아나는 것을 방지 |

---

# Phase A — 명단 관리 기능 (검증 미적용)

## Task 1: Prisma 스키마 추가

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 모델 두 개 추가**

`prisma/schema.prisma` 파일 끝에 다음을 추가한다.

```prisma
model Student {
  studentId  String   @id
  name       String
  grade      Int
  className  String?
  status     String   @default("active")
  source     String   @default("upload")
  updatedAt  DateTime @updatedAt

  @@index([status])
}

model StudentRosterUpload {
  id          Int      @id @default(autoincrement())
  fileName    String
  totalRows   Int
  added       Int
  updated     Int
  deactivated Int
  uploadedBy  Int?
  createdAt   DateTime @default(now())
}
```

- [ ] **Step 2: DB에 반영하고 클라이언트 재생성**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
set -a && grep '^DATABASE_URL' .env.local > /tmp/dburl.env && source /tmp/dburl.env && set +a && rm /tmp/dburl.env
npx prisma db push && npx prisma generate
```

기대 출력: `Your database is now in sync with your Prisma schema.` 그리고 `Generated Prisma Client`

- [ ] **Step 3: 커밋** (작업 환경 주의사항의 클론 절차 사용)

```
docs/chore: Student 명단 스키마 추가
```

---

## Task 2: 정규화·매칭·diff 순수 함수 (TDD)

**Files:**
- Create: `src/lib/roster.ts`
- Test: `src/lib/__tests__/roster.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/__tests__/roster.test.ts`:

```ts
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
npx vitest run src/lib/__tests__/roster.test.ts
```

기대: `Cannot find module '../roster'` 로 실패

- [ ] **Step 3: 구현**

`src/lib/roster.ts`:

```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/lib/__tests__/roster.test.ts
```

기대: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```
feat: 학생 명단 정규화·매칭·diff 순수 함수
```

---

## Task 3: 엑셀/CSV 파서 (TDD)

**Files:**
- Create: `src/lib/rosterParse.ts`
- Test: `src/lib/__tests__/rosterParse.test.ts`
- Modify: `package.json` (exceljs 추가)

- [ ] **Step 1: exceljs 설치**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
npm install exceljs
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/lib/__tests__/rosterParse.test.ts`:

```ts
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
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

```bash
npx vitest run src/lib/__tests__/rosterParse.test.ts
```

기대: `Cannot find module '../rosterParse'`

- [ ] **Step 4: 구현**

`src/lib/rosterParse.ts`:

```ts
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
  } catch {
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
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx vitest run src/lib/__tests__/rosterParse.test.ts
```

기대: 모든 테스트 PASS

- [ ] **Step 6: 커밋**

```
feat: 명단 엑셀/CSV 파서 추가
```

---

## Task 4: 학생 조회 서버 모듈

**Files:**
- Create: `src/lib/roster.server.ts`

- [ ] **Step 1: 구현**

`src/lib/roster.server.ts`:

```ts
/**
 * 학생 명단 — 서버 전용 조회.
 * prisma 의존성을 격리해 클라이언트가 @/lib/roster(순수 모듈)만 가져가게 한다.
 * (restriction.server.ts 와 동일한 패턴)
 */
import { prisma } from '@/lib/prisma'
import { normalizeStudentId, namesMatch } from '@/lib/roster'

export type VerifyResult =
  | { ok: true; grade: number; name: string }
  | { ok: false; reason: 'not_found' | 'name_mismatch' }

/** 미등록·비활성 학생에 같은 메시지를 쓴다 — 재학 상태를 외부에 노출하지 않기 위함. */
export const NOT_IN_ROSTER_MESSAGE =
  '명단에 등록되지 않은 학번입니다. 학과 사무실에 문의해 주세요.'
export const NAME_MISMATCH_MESSAGE = '학번과 이름이 일치하지 않습니다.'

/**
 * 학번·이름이 활성 명단과 일치하는지 확인한다.
 * 일치하면 명단상의 학년을 함께 반환한다(신청 시 이 값으로 덮어쓴다).
 */
export async function verifyStudent(rawStudentId: string, rawName: string): Promise<VerifyResult> {
  const studentId = normalizeStudentId(rawStudentId)
  if (!studentId) return { ok: false, reason: 'not_found' }

  const student = await prisma.student.findFirst({
    where: { studentId, status: 'active' },
    select: { name: true, grade: true },
  })
  if (!student) return { ok: false, reason: 'not_found' }
  if (!namesMatch(rawName, student.name)) return { ok: false, reason: 'name_mismatch' }

  return { ok: true, grade: student.grade, name: student.name }
}

/** 검증 실패 사유를 사용자 노출용 메시지로 변환한다. */
export function verifyFailureMessage(reason: 'not_found' | 'name_mismatch'): string {
  return reason === 'name_mismatch' ? NAME_MISMATCH_MESSAGE : NOT_IN_ROSTER_MESSAGE
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

기대: 오류 없음

- [ ] **Step 3: 커밋**

```
feat: 학생 명단 조회 서버 모듈 추가
```

---

## Task 5: 관리자 명단 서버 액션

**Files:**
- Create: `src/app/actions/students.ts`

- [ ] **Step 1: 구현**

`src/app/actions/students.ts`:

```ts
'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { normalizeStudentId, computeRosterDiff, type RosterRow, type ExistingStudent } from '@/lib/roster'
import { parseRosterBuffer } from '@/lib/rosterParse'

/**
 * 비활성화 비율이 이 값을 넘으면 확정 전 재확인을 요구한다.
 * 'use server' 파일은 async 함수 외의 런타임 값을 export할 수 없으므로 로컬 상수로 둔다.
 */
const BULK_DEACTIVATION_THRESHOLD = 0.5

async function requireAdminId(): Promise<number> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error('Unauthorized')
  return parseInt(session.user.id)
}

export interface RosterPreview {
  fileName: string
  totalRows: number
  skipped: number
  addedCount: number
  updatedCount: number
  unchangedCount: number
  deactivated: { studentId: string; name: string; grade: number }[]
  activeBefore: number
  bulkWarning: boolean
  /** 확정 단계로 넘길 파싱 결과 */
  rows: RosterRow[]
}

export type PreviewResult = { success: true; preview: RosterPreview } | { success: false; error: string }

async function loadExisting(): Promise<ExistingStudent[]> {
  return prisma.student.findMany({
    select: { studentId: true, name: true, grade: true, className: true, status: true },
  })
}

/** 1단계: 파일을 파싱해 변경분만 계산한다. DB는 변경하지 않는다. */
export async function previewRosterUpload(formData: FormData): Promise<PreviewResult> {
  await requireAdminId()

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { success: false, error: '파일을 선택해 주세요.' }

  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = await parseRosterBuffer(buffer, file.name)
  if (!parsed.ok) return { success: false, error: parsed.error }

  const existing = await loadExisting()
  const diff = computeRosterDiff(parsed.rows, existing)
  const activeBefore = existing.filter((s) => s.status === 'active').length
  const bulkWarning =
    activeBefore > 0 && diff.deactivated.length / activeBefore > BULK_DEACTIVATION_THRESHOLD

  return {
    success: true,
    preview: {
      fileName: file.name,
      totalRows: parsed.rows.length,
      skipped: parsed.skipped,
      addedCount: diff.added.length,
      updatedCount: diff.updated.length,
      unchangedCount: diff.unchanged,
      deactivated: diff.deactivated.map((s) => ({ studentId: s.studentId, name: s.name, grade: s.grade })),
      activeBefore,
      bulkWarning,
      rows: parsed.rows,
    },
  }
}

export type CommitResult =
  | { success: true; added: number; updated: number; deactivated: number }
  | { success: false; error: string }

/** 2단계: 미리보기에서 확인한 rows를 실제로 반영한다(전체 교체). */
export async function commitRosterUpload(fileName: string, rows: RosterRow[]): Promise<CommitResult> {
  const adminId = await requireAdminId()
  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: false, error: '반영할 명단이 비어 있습니다.' }
  }

  const existing = await loadExisting()
  const diff = computeRosterDiff(rows, existing)

  await prisma.$transaction(async (tx) => {
    for (const r of [...diff.added, ...diff.updated]) {
      await tx.student.upsert({
        where: { studentId: r.studentId },
        create: {
          studentId: r.studentId,
          name: r.name,
          grade: r.grade,
          className: r.className,
          status: 'active',
          source: 'upload',
        },
        update: { name: r.name, grade: r.grade, className: r.className, status: 'active' },
      })
    }
    if (diff.deactivated.length > 0) {
      await tx.student.updateMany({
        where: { studentId: { in: diff.deactivated.map((s) => s.studentId) } },
        data: { status: 'inactive' },
      })
    }
    await tx.studentRosterUpload.create({
      data: {
        fileName,
        totalRows: rows.length,
        added: diff.added.length,
        updated: diff.updated.length,
        deactivated: diff.deactivated.length,
        uploadedBy: adminId,
      },
    })
  })

  revalidatePath('/admin/students')
  return {
    success: true,
    added: diff.added.length,
    updated: diff.updated.length,
    deactivated: diff.deactivated.length,
  }
}

export type StudentMutationResult = { success: true } | { success: false; error: string }

/** 편입·복학생 등 명단에 없는 학생을 관리자가 개별 추가한다. */
export async function addStudentManually(formData: FormData): Promise<StudentMutationResult> {
  await requireAdminId()

  const studentId = normalizeStudentId((formData.get('studentId') as string) ?? '')
  const name = ((formData.get('name') as string) ?? '').trim()
  const grade = parseInt((formData.get('grade') as string) ?? '')
  const className = ((formData.get('className') as string) ?? '').trim() || null

  if (!studentId) return { success: false, error: '학번을 입력해 주세요.' }
  if (!name) return { success: false, error: '이름을 입력해 주세요.' }
  if (![1, 2, 3].includes(grade)) return { success: false, error: '학년을 선택해 주세요.' }

  await prisma.student.upsert({
    where: { studentId },
    create: { studentId, name, grade, className, status: 'active', source: 'manual' },
    update: { name, grade, className, status: 'active', source: 'manual' },
  })

  revalidatePath('/admin/students')
  return { success: true }
}

/** 개별 학생을 활성/비활성 전환한다. */
export async function setStudentStatus(studentId: string, status: 'active' | 'inactive'): Promise<StudentMutationResult> {
  await requireAdminId()
  const exists = await prisma.student.findUnique({ where: { studentId }, select: { studentId: true } })
  if (!exists) return { success: false, error: '해당 학생을 찾을 수 없습니다.' }

  await prisma.student.update({ where: { studentId }, data: { status } })
  revalidatePath('/admin/students')
  return { success: true }
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

기대: 오류 없음

- [ ] **Step 3: 커밋**

```
feat: 관리자 명단 서버 액션 (업로드 미리보기·확정·개별 추가)
```

---

## Task 6: 관리자 명단 관리 화면

**Files:**
- Create: `src/app/admin/students/page.tsx`
- Create: `src/components/admin/StudentRosterManager.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: 사이드바에 메뉴 추가**

`src/components/admin/AdminSidebar.tsx` 의 import 줄에서 `GraduationCap` 을 추가하고, `NAV_ITEMS` 의 `'/admin/restrictions'` 항목 **바로 앞**에 다음 줄을 넣는다.

```tsx
  { href: '/admin/students',     label: '학생 명단',   icon: GraduationCap },
```

import 줄은 다음과 같이 된다.

```tsx
import { LayoutDashboard, ClipboardList, Package, Building2, DoorOpen, History, Users, TestTube2, BookOpen, Ban, GraduationCap } from 'lucide-react'
```

- [ ] **Step 2: 페이지 생성**

`src/app/admin/students/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma'
import { GraduationCap } from 'lucide-react'
import { StudentRosterManager } from '@/components/admin/StudentRosterManager'

export const dynamic = 'force-dynamic'

export default async function AdminStudentsPage() {
  const [students, lastUpload, activeCount] = await Promise.all([
    prisma.student.findMany({ orderBy: [{ grade: 'asc' }, { name: 'asc' }] }),
    prisma.studentRosterUpload.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.student.count({ where: { status: 'active' } }),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-rose-muted flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-brand-rose" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-base-primary">학생 명단</h1>
          <p className="text-sm text-base-secondary">
            명단에 등록된 학생만 대여를 신청할 수 있습니다. 현재 활성 {activeCount}명
            {lastUpload && ` · 최근 업로드 ${lastUpload.fileName}`}
          </p>
        </div>
      </div>

      <StudentRosterManager
        initialStudents={students.map((s) => ({
          studentId: s.studentId,
          name: s.name,
          grade: s.grade,
          className: s.className,
          status: s.status,
          source: s.source,
        }))}
      />
    </div>
  )
}
```

- [ ] **Step 3: 관리 컴포넌트 생성**

`src/components/admin/StudentRosterManager.tsx`:

```tsx
'use client'

import { useState, useTransition, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  previewRosterUpload,
  commitRosterUpload,
  addStudentManually,
  setStudentStatus,
  type RosterPreview,
} from '@/app/actions/students'
import { Upload, UserPlus, AlertTriangle, Search, Check, X } from 'lucide-react'

interface StudentRow {
  studentId: string
  name: string
  grade: number
  className: string | null
  status: string
  source: string
}

const inputCls =
  'w-full h-10 px-3.5 rounded-xl border border-base text-sm bg-surface-raised text-base-primary placeholder:text-base-muted/50 focus:outline-none focus:border-brand-rose transition-colors'

export function StudentRosterManager({ initialStudents }: { initialStudents: StudentRow[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const addFormRef = useRef<HTMLFormElement>(null)

  const [pending, startTransition] = useTransition()
  const [preview, setPreview] = useState<RosterPreview | null>(null)
  const [bulkConfirmed, setBulkConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.replace(/\s+/g, '').toLowerCase()
    if (!q) return initialStudents
    return initialStudents.filter(
      (s) => s.studentId.toLowerCase().includes(q) || s.name.replace(/\s+/g, '').toLowerCase().includes(q),
    )
  }, [initialStudents, query])

  function handlePreview(formData: FormData) {
    setError(null)
    setMessage(null)
    setBulkConfirmed(false)
    startTransition(async () => {
      const res = await previewRosterUpload(formData)
      if (!res.success) {
        setError(res.error)
        setPreview(null)
      } else {
        setPreview(res.preview)
      }
    })
  }

  function handleCommit() {
    if (!preview) return
    setError(null)
    startTransition(async () => {
      const res = await commitRosterUpload(preview.fileName, preview.rows)
      if (!res.success) {
        setError(res.error)
      } else {
        setMessage(`반영 완료 — 추가 ${res.added}명 · 갱신 ${res.updated}명 · 비활성화 ${res.deactivated}명`)
        setPreview(null)
        setBulkConfirmed(false)
        fileRef.current && (fileRef.current.value = '')
        router.refresh()
      }
    })
  }

  function handleAdd(formData: FormData) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const res = await addStudentManually(formData)
      if (!res.success) setError(res.error)
      else {
        setMessage('학생이 추가되었습니다.')
        addFormRef.current?.reset()
        router.refresh()
      }
    })
  }

  function handleToggle(studentId: string, next: 'active' | 'inactive') {
    startTransition(async () => {
      const res = await setStudentStatus(studentId, next)
      if (!res.success) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* 업로드 */}
      <div className="bg-surface-base rounded-2xl border border-base p-5 space-y-4">
        <h2 className="text-sm font-bold text-base-primary flex items-center gap-2">
          <Upload className="w-4 h-4" />
          명단 업로드
        </h2>
        <p className="text-xs text-base-muted leading-relaxed">
          엑셀(xlsx) 또는 CSV 파일을 올리면 <strong className="text-base-secondary">전체 교체</strong>됩니다.
          파일에 없는 학생은 자동으로 비활성 처리되며, 확정 전에 변경 내용을 먼저 확인할 수 있습니다.
          필수 컬럼은 학번·이름·학년이고 반은 선택입니다.
        </p>
        <form action={handlePreview} className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept=".xlsx,.csv"
            required
            className="text-sm text-base-secondary file:mr-3 file:h-10 file:px-4 file:rounded-xl file:border-0 file:bg-surface-raised file:text-base-secondary file:text-sm file:font-semibold"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-10 px-5 rounded-xl border border-base text-sm font-semibold text-base-secondary hover:bg-surface-raised disabled:opacity-50 transition-colors"
          >
            {pending ? '분석 중...' : '변경 내용 확인'}
          </button>
        </form>

        {preview && (
          <div className="rounded-xl border border-base bg-surface-raised p-4 space-y-3">
            <p className="text-sm font-semibold text-base-primary">{preview.fileName}</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">추가 {preview.addedCount}명</span>
              <span className="text-sky-600 dark:text-sky-400 font-semibold">갱신 {preview.updatedCount}명</span>
              <span className="text-base-muted">유지 {preview.unchangedCount}명</span>
              <span className="text-red-600 dark:text-red-400 font-semibold">비활성화 예정 {preview.deactivated.length}명</span>
              {preview.skipped > 0 && <span className="text-amber-600 dark:text-amber-400">건너뜀 {preview.skipped}행</span>}
            </div>

            {preview.deactivated.length > 0 && (
              <details className="text-xs text-base-secondary">
                <summary className="cursor-pointer hover:text-base-primary">비활성화 대상 보기</summary>
                <ul className="mt-2 space-y-0.5 max-h-40 overflow-y-auto">
                  {preview.deactivated.map((s) => (
                    <li key={s.studentId} className="font-mono">
                      {s.studentId} {s.name} ({s.grade}학년)
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {preview.bulkWarning && (
              <label className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkConfirmed}
                  onChange={(e) => setBulkConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  기존 활성 학생 {preview.activeBefore}명 중 {preview.deactivated.length}명이 비활성화됩니다.
                  파일이 올바른지 확인했다면 체크해 주세요.
                </span>
              </label>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPreview(null); setBulkConfirmed(false) }}
                className="h-10 px-4 rounded-xl border border-base text-sm font-semibold text-base-secondary hover:bg-surface-overlay transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCommit}
                disabled={pending || (preview.bulkWarning && !bulkConfirmed)}
                className="h-10 px-5 rounded-xl bg-rose-600 dark:bg-brand-rose hover:bg-rose-700 dark:hover:bg-rose-400 text-white dark:text-zinc-950 text-sm font-bold disabled:opacity-40 transition-colors"
              >
                {pending ? '반영 중...' : '이대로 반영'}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      {message && (
        <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      {/* 개별 추가 */}
      <div className="bg-surface-base rounded-2xl border border-base p-5">
        <h2 className="text-sm font-bold text-base-primary mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          학생 개별 추가
        </h2>
        <form ref={addFormRef} action={handleAdd} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-medium text-base-secondary">학번 *</label>
            <input name="studentId" required placeholder="2026102001" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-base-secondary">이름 *</label>
            <input name="name" required placeholder="홍길동" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-base-secondary">학년 *</label>
            <select name="grade" required defaultValue="" className={inputCls}>
              <option value="" disabled>선택</option>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-base-secondary">반</label>
            <div className="flex gap-2">
              <input name="className" placeholder="A" className={inputCls} />
              <button
                type="submit"
                disabled={pending}
                className="h-10 px-4 shrink-0 rounded-xl bg-rose-600 dark:bg-brand-rose hover:bg-rose-700 dark:hover:bg-rose-400 text-white dark:text-zinc-950 text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                추가
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 목록 */}
      <div className="bg-surface-base rounded-2xl border border-base overflow-hidden">
        <div className="px-5 py-3.5 border-b border-base flex items-center gap-2">
          <h2 className="text-sm font-bold text-base-primary">등록된 학생</h2>
          <span className="text-xs text-base-muted">{filtered.length}명</span>
          <div className="ml-auto relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-base-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="학번·이름 검색"
              className="h-9 pl-8 pr-3 rounded-xl border border-base text-sm bg-surface-raised text-base-primary placeholder:text-base-muted/50 focus:outline-none focus:border-brand-rose"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-surface-raised border-b border-base">
                <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider">학번</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider">이름</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider">학년</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider">반</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-base-secondary uppercase tracking-wider">상태</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-base-secondary uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-base-muted">등록된 학생이 없습니다.</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.studentId} className="hover:bg-surface-raised transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-base-secondary">{s.studentId}</td>
                  <td className="px-5 py-3 font-medium text-base-primary">{s.name}</td>
                  <td className="px-5 py-3 text-base-secondary">{s.grade}학년</td>
                  <td className="px-5 py-3 text-base-secondary">{s.className ?? '—'}</td>
                  <td className="px-5 py-3">
                    {s.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <Check className="w-3 h-3" />활성
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-overlay text-base-muted border border-base">
                        <X className="w-3 h-3" />비활성
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleToggle(s.studentId, s.status === 'active' ? 'inactive' : 'active')}
                      disabled={pending}
                      className="text-xs font-semibold text-base-muted hover:text-base-primary disabled:opacity-50 transition-colors"
                    >
                      {s.status === 'active' ? '비활성화' : '활성화'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 타입 체크 후 화면 확인**

```bash
npx tsc --noEmit
```

브라우저로 `/admin/students` 접속(admin / admin1234) 후 다음을 확인한다.
- 페이지가 렌더링되고 사이드바에 "학생 명단" 메뉴가 보인다
- 테스트용 xlsx를 만들어 업로드 → **미리보기 숫자가 표시되고, 이 단계에서는 목록이 변하지 않는다**
- "이대로 반영" 후 목록에 학생이 나타난다
- 개별 추가·비활성화 동작

검증에 사용한 테스트 학생은 반드시 삭제한다(프로덕션 DB이므로).

- [ ] **Step 5: 커밋**

```
feat: 관리자 학생 명단 관리 화면
```

---

## Task 7: Phase A 배포 및 실제 명단 등록 (체크포인트)

- [ ] **Step 1: Phase A 배포**

Task 1–6 커밋을 `main`에 푸시하면 Vercel이 자동 배포한다. 이 시점까지는 **검증이 적용되지 않아 기존 신청 흐름이 그대로 동작**한다.

- [ ] **Step 2: 배포 확인**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://dept-cpv-rental.vercel.app/admin/students
```

기대: `200` 또는 `307`(로그인 리다이렉트)

- [ ] **Step 3: 실제 명단 업로드 — 사용자 작업**

관리자가 `/admin/students`에서 실제 학과 명단을 업로드하고 인원수가 맞는지 확인한다.

**이 단계가 끝나기 전에는 Phase B를 배포하지 않는다.** 명단이 비어 있으면 모든 학생이 차단된다.

---

# Phase B — 신청 검증 활성화

## Task 8: 자격 확인 API

**Files:**
- Create: `src/app/api/students/verify/route.ts`

- [ ] **Step 1: 구현**

개인정보를 URL에 남기지 않기 위해 **POST**를 사용하고, 응답에 **이름을 포함하지 않는다.**

`src/app/api/students/verify/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyStudent, verifyFailureMessage } from '@/lib/roster.server'
import { checkRateLimit, recordFailedAttempt, resetAttempts } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * 대여 자격 사전 확인.
 * 학번과 이름이 모두 일치해야 응답하므로 학번 단독 조회 오라클이 되지 않는다.
 * 응답에는 유효 여부와 학년만 담고 이름은 절대 반환하지 않는다.
 */
export async function POST(request: NextRequest) {
  let body: { studentId?: string; name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ valid: false, error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const studentId = (body.studentId ?? '').trim()
  const name = (body.name ?? '').trim()
  if (!studentId || !name) {
    return NextResponse.json({ valid: false, error: '학번과 이름을 모두 입력해 주세요.' }, { status: 400 })
  }

  const key = `verify:${studentId}`
  const limit = await checkRateLimit(key)
  if (!limit.allowed) {
    return NextResponse.json(
      { valid: false, error: '확인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 429 },
    )
  }

  const result = await verifyStudent(studentId, name)
  if (!result.ok) {
    await recordFailedAttempt(key)
    return NextResponse.json({ valid: false, error: verifyFailureMessage(result.reason) })
  }

  await resetAttempts(key)
  return NextResponse.json({ valid: true, grade: result.grade })
}
```

- [ ] **Step 2: 동작 확인**

명단에 있는 학생과 없는 학생으로 각각 호출한다.

```bash
curl -s -X POST http://localhost:3000/api/students/verify \
  -H 'Content-Type: application/json' \
  -d '{"studentId":"<명단에 있는 학번>","name":"<해당 이름>"}'
```

기대: `{"valid":true,"grade":N}` — **응답에 이름이 없어야 한다.**

```bash
curl -s -X POST http://localhost:3000/api/students/verify \
  -H 'Content-Type: application/json' \
  -d '{"studentId":"00000000","name":"없는사람"}'
```

기대: `{"valid":false,"error":"명단에 등록되지 않은 학번입니다. 학과 사무실에 문의해 주세요."}`

- [ ] **Step 3: 커밋**

```
feat: 대여 자격 사전 확인 API
```

---

## Task 9: 기자재 신청 액션에 검증 적용

**Files:**
- Modify: `src/app/actions/rental.ts`

- [ ] **Step 1: import 추가**

`src/app/actions/rental.ts` 상단 import 블록에 다음을 추가한다.

```ts
import { verifyStudent, verifyFailureMessage } from '@/lib/roster.server'
```

- [ ] **Step 2: `createRentalRequest`에 검증 삽입**

`src/app/actions/rental.ts:67` 의 대여 제한자 검증 **바로 위**에 삽입한다. 존재하지 않는 학생에 대해 제한 조회를 할 이유가 없기 때문이다.

기존 코드:

```ts
  // 대여 제한자(패널티) 검증 — 제한 기간 내 학번은 신청 차단
  const restriction = await getActiveRestriction(studentId)
```

변경 후:

```ts
  // 학과 명단 대조 — 등재되지 않은 학번은 신청 차단
  const rosterCheck = await verifyStudent(studentId, applicantName)
  if (!rosterCheck.ok) {
    return { success: false, error: verifyFailureMessage(rosterCheck.reason) }
  }
  // 학년은 명단 값을 신뢰한다. 클라이언트가 보낸 값은 폐기한다.
  const verifiedGrade = rosterCheck.grade

  // 대여 제한자(패널티) 검증 — 제한 기간 내 학번은 신청 차단
  const restriction = await getActiveRestriction(studentId)
```

- [ ] **Step 3: `createRentalRequest`에서 grade 사용처 교체**

같은 함수 안에서 클라이언트 `grade`를 쓰는 두 곳을 `verifiedGrade`로 바꾼다.

학년 자격 검증 부분:

```ts
  if (grade < equipmentForLimit.minGrade) {
```

를

```ts
  if (verifiedGrade < equipmentForLimit.minGrade) {
```

로 바꾸고, `tx.rentalRequest.create` 의 `data` 에서

```ts
          grade,
```

를

```ts
          grade: verifiedGrade,
```

로 바꾼다.

`const grade = [1, 2, 3].includes(gradeRaw) ? gradeRaw : null` 과 `if (!grade) return ...` 검증은 **제거한다.** 학년은 더 이상 클라이언트 입력이 아니다. `gradeRaw` 파싱 줄도 함께 제거한다.

- [ ] **Step 4: `createBatchRentalRequest`에 동일 적용**

`src/app/actions/rental.ts:277` 의 제한자 검증 위에 같은 블록을 삽입한다.

```ts
  // 학과 명단 대조 — 등재되지 않은 학번은 신청 차단
  const rosterCheck = await verifyStudent(studentId, applicantName)
  if (!rosterCheck.ok) {
    return { success: false, error: verifyFailureMessage(rosterCheck.reason) }
  }
  const verifiedGrade = rosterCheck.grade

  // 대여 제한자(패널티) 검증 — 제한 기간 내 학번은 신청 차단
  const restriction = await getActiveRestriction(studentId)
```

이 함수에서도 `grade` 파싱·검증을 제거하고, 학년 비교부

```ts
      if (eq && grade < eq.minGrade) {
```

를

```ts
      if (eq && verifiedGrade < eq.minGrade) {
```

로, `create` 의 `data` 안 `grade,` 를 `grade: verifiedGrade,` 로 바꾼다.

- [ ] **Step 5: 타입 체크**

```bash
npx tsc --noEmit
```

기대: 오류 없음. 오류가 나면 `grade` 잔여 참조를 모두 `verifiedGrade`로 정리한다.

- [ ] **Step 6: 커밋**

```
feat: 기자재 신청에 명단 검증 적용 및 학년 서버 판정
```

---

## Task 10: 강의실 신청 액션에 검증 적용

**Files:**
- Modify: `src/app/actions/classroomRental.ts`

- [ ] **Step 1: import 추가**

```ts
import { verifyStudent, verifyFailureMessage } from '@/lib/roster.server'
```

- [ ] **Step 2: 검증 삽입**

`src/app/actions/classroomRental.ts:80` 의 제한자 검증 바로 위에 삽입한다. 강의실 신청에는 학년 개념이 없으므로 등재 여부만 확인한다.

```ts
  // 학과 명단 대조 — 등재되지 않은 학번은 신청 차단
  const rosterCheck = await verifyStudent(studentId, applicantName)
  if (!rosterCheck.ok) {
    return { success: false, error: verifyFailureMessage(rosterCheck.reason) }
  }

  // 대여 제한자(패널티) 검증 — 제한 기간 내 학번은 신청 차단
  const restriction = await getActiveRestriction(studentId)
```

- [ ] **Step 3: 타입 체크 후 커밋**

```bash
npx tsc --noEmit
```

```
feat: 강의실 신청에 명단 검증 적용
```

---

## Task 11: 기자재 단건 신청 폼 변경

**Files:**
- Modify: `src/components/rental/RentalForm.tsx`

- [ ] **Step 1: 상태 교체**

`const [grade, setGrade] = useState<number | null>(null)` 를 삭제하고 다음으로 대체한다.

```tsx
  const [verified, setVerified] = useState<{ grade: number } | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
```

`const gradeInsufficient = grade != null && grade < equipmentMinGrade` 를 다음으로 대체한다.

```tsx
  const gradeInsufficient = verified != null && verified.grade < equipmentMinGrade
```

- [ ] **Step 2: 확인 함수 추가**

컴포넌트 안에 추가한다.

```tsx
  async function verifyEligibility(studentId: string, name: string) {
    if (!studentId.trim() || !name.trim()) return
    setVerifying(true)
    setVerifyError(null)
    try {
      const res = await fetch('/api/students/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, name }),
      })
      const data = await res.json()
      if (data.valid) {
        setVerified({ grade: data.grade })
      } else {
        setVerified(null)
        setVerifyError(data.error ?? '확인에 실패했습니다.')
      }
    } catch {
      setVerified(null)
      setVerifyError('확인 중 오류가 발생했습니다.')
    } finally {
      setVerifying(false)
    }
  }
```

- [ ] **Step 3: 이름·학번 입력에 blur 확인 연결**

`src/components/rental/RentalForm.tsx:160`, `:164` 의 두 input을 다음으로 교체한다.

```tsx
            <input
              id="applicantName"
              name="applicantName"
              required
              className={inputCls}
              onBlur={(e) => {
                const sid = (document.getElementById('studentId') as HTMLInputElement | null)?.value ?? ''
                verifyEligibility(sid, e.target.value)
              }}
            />
```

```tsx
            <input
              id="studentId"
              name="studentId"
              required
              className={inputCls}
              onBlur={(e) => {
                const nm = (document.getElementById('applicantName') as HTMLInputElement | null)?.value ?? ''
                verifyEligibility(e.target.value, nm)
              }}
            />
```

- [ ] **Step 4: 학년 선택 블록을 확인 배지로 교체**

`{/* 학년 선택 (학년별 대여 자격 제한) */}` 로 시작하는 `<div className="space-y-1.5">` 블록 전체(학년 버튼 그리드와 `gradeInsufficient` 안내 포함)를 다음으로 교체한다.

```tsx
        {/* 대여 자격 확인 (명단 대조 · 학년은 명단 기준) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-base-secondary">
            대여 자격
            <span className="ml-1 text-base-muted">이 기자재는 {equipmentMinGrade}학년 이상 대여 가능</span>
          </label>
          {verifying && (
            <div className="text-xs text-base-muted bg-surface-raised border border-base rounded-xl px-3 py-2">
              확인 중...
            </div>
          )}
          {!verifying && verified && (
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/30 rounded-xl px-3 py-2">
              확인됨 · {verified.grade}학년
            </div>
          )}
          {!verifying && verifyError && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl px-3 py-2">
              {verifyError}
            </div>
          )}
          {!verifying && !verified && !verifyError && (
            <div className="text-xs text-base-muted bg-surface-raised border border-base rounded-xl px-3 py-2">
              이름과 학번을 입력하면 대여 자격을 확인합니다.
            </div>
          )}
          {gradeInsufficient && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl px-3 py-2 flex items-center gap-1.5 mt-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{equipmentMinGrade}학년 이상부터 대여 가능한 기자재입니다.</span>
            </div>
          )}
        </div>
```

- [ ] **Step 5: 제출 조건과 formData 정리**

제출 비활성화 조건에서 `grade == null` 를 `verified == null` 로 바꾼다.

```tsx
    verified == null ||
    gradeInsufficient ||
```

`handleSubmit` 안의 다음 줄은 삭제한다(학년은 서버가 명단에서 결정한다).

```tsx
    formData.set('grade', grade != null ? String(grade) : '')
```

- [ ] **Step 6: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: 커밋**

```
feat: 기자재 신청 폼 — 학년 선택 제거, 자격 확인 배지 추가
```

---

## Task 12: 장바구니 일괄 신청 폼 변경

**Files:**
- Modify: `src/components/cart/CartPageClient.tsx`

- [ ] **Step 1: 상태 교체**

`const [grade, setGrade] = useState<number | null>(null)` 를 다음으로 대체한다.

```tsx
  const [verified, setVerified] = useState<{ grade: number } | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
```

`gradeBlockedItems` 계산을 다음으로 바꾼다.

```tsx
  const gradeBlockedItems = verified != null && availability
    ? items.filter(i => (availability[i.equipmentId]?.minGrade ?? 1) > verified.grade)
    : []
```

제출 비활성화 조건의 `grade == null` 을 `verified == null` 로 바꾸고, `formData.set('grade', ...)` 줄을 삭제한다.

- [ ] **Step 2: 확인 함수 추가**

Task 11 Step 2와 동일한 `verifyEligibility` 함수를 이 컴포넌트에도 추가한다.

```tsx
  async function verifyEligibility(studentId: string, name: string) {
    if (!studentId.trim() || !name.trim()) return
    setVerifying(true)
    setVerifyError(null)
    try {
      const res = await fetch('/api/students/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, name }),
      })
      const data = await res.json()
      if (data.valid) {
        setVerified({ grade: data.grade })
      } else {
        setVerified(null)
        setVerifyError(data.error ?? '확인에 실패했습니다.')
      }
    } catch {
      setVerified(null)
      setVerifyError('확인 중 오류가 발생했습니다.')
    } finally {
      setVerifying(false)
    }
  }
```

- [ ] **Step 3: 이름·학번 input에 blur 연결**

이 컴포넌트의 이름 input에 `id="cartApplicantName"`, 학번 input에 `id="cartStudentId"` 를 부여하고 각각 `onBlur` 를 연결한다.

```tsx
            onBlur={(e) => {
              const sid = (document.getElementById('cartStudentId') as HTMLInputElement | null)?.value ?? ''
              verifyEligibility(sid, e.target.value)
            }}
```

```tsx
            onBlur={(e) => {
              const nm = (document.getElementById('cartApplicantName') as HTMLInputElement | null)?.value ?? ''
              verifyEligibility(e.target.value, nm)
            }}
```

- [ ] **Step 4: 학년 버튼 블록을 확인 배지로 교체**

학년 버튼 그리드(`grade === g` 스타일 분기를 포함한 블록)를 다음으로 교체한다. `gradeBlockedItems` 안내 블록은 그대로 둔다.

```tsx
          {verifying && (
            <div className="text-xs text-base-muted bg-surface-raised border border-base rounded-xl px-3 py-2">
              확인 중...
            </div>
          )}
          {!verifying && verified && (
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/30 rounded-xl px-3 py-2">
              확인됨 · {verified.grade}학년
            </div>
          )}
          {!verifying && verifyError && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl px-3 py-2">
              {verifyError}
            </div>
          )}
          {!verifying && !verified && !verifyError && (
            <div className="text-xs text-base-muted bg-surface-raised border border-base rounded-xl px-3 py-2">
              이름과 학번을 입력하면 대여 자격을 확인합니다.
            </div>
          )}
```

- [ ] **Step 5: 타입 체크 후 커밋**

```bash
npx tsc --noEmit
```

```
feat: 장바구니 신청 폼 — 학년 선택 제거, 자격 확인 배지 추가
```

---

## Task 13: 죽은 신청 경로 제거

**Files:**
- Delete: `src/components/classroom/ClassroomForm.tsx`
- Modify: `src/app/actions/classroom.ts`

- [ ] **Step 1: 도달 불가 재확인**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
grep -rn "ClassroomForm" src/ | grep -v "^src/components/classroom/ClassroomForm.tsx:" | grep -v "admin/ClassroomForm"
```

기대: **출력 없음**(어떤 페이지도 import하지 않음). 출력이 있으면 삭제하지 말고 대신 Task 10과 같은 검증을 추가한다.

- [ ] **Step 2: 삭제**

```bash
rm src/components/classroom/ClassroomForm.tsx
```

`src/app/actions/classroom.ts` 에서 `createClassroomRequest` 함수와 `ClassroomRequestResult` 타입, 그리고 그 함수에서만 쓰이는 `generateClassroomNumber` 헬퍼를 제거한다. 파일 내 다른 export가 남아 있으면 파일은 유지하고, 남는 export가 없으면 파일 자체를 삭제한다.

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

기대: 오류 없음

- [ ] **Step 4: 커밋**

```
chore: 검증되지 않는 죽은 강의실 신청 경로 제거
```

---

## Task 14: 전체 검증 및 Phase B 배포

- [ ] **Step 1: 전체 테스트 실행**

```bash
cd "/Users/jin-eunbeom/.config/superpowers/worktrees/기자재 대여 시스템/feat-implement"
npx vitest run && npx tsc --noEmit
```

기대: 전체 PASS, 타입 오류 없음

- [ ] **Step 2: 로컬 기능 검증**

dev 서버에서 다음을 순서대로 확인한다. **프로덕션 DB를 쓰므로 생성한 테스트 신청은 반드시 삭제한다.**

1. 명단에 있는 학생 → 이름·학번 입력 시 "확인됨 · N학년" 표시 → 신청 성공
2. DB에서 해당 신청의 `grade` 가 명단 값과 같은지 확인
3. 명단에 없는 학번 → "명단에 등록되지 않은 학번입니다." 표시, 제출 불가
4. 학번은 맞고 이름만 다르게 → "학번과 이름이 일치하지 않습니다."
5. **1학년 학생으로 3학년 전용 장비(소니 FX3) 신청 시도 → 차단** (기존 구멍이 막혔는지 확인하는 핵심 검증)
6. 장바구니 일괄 신청도 1–5 동일 확인
7. 강의실 신청 → 명단 대조가 걸리는지 확인

- [ ] **Step 3: Phase B 배포**

Task 8–13 커밋을 `main`에 푸시한다.

- [ ] **Step 4: 프로덕션 확인**

```bash
curl -s -X POST https://dept-cpv-rental.vercel.app/api/students/verify \
  -H 'Content-Type: application/json' \
  -d '{"studentId":"00000000","name":"없는사람"}'
```

기대: `{"valid":false,"error":"명단에 등록되지 않은 학번입니다. 학과 사무실에 문의해 주세요."}`

명단에 있는 실제 학생으로도 한 번 확인해 `{"valid":true,"grade":N}` 이 오는지, **응답에 이름이 없는지** 본다.

---

## 완료 기준

- [ ] 명단에 없는 학번으로는 기자재·강의실 신청이 모두 차단된다
- [ ] 학년이 명단 값으로 기록되며, 1학년이 3학년 전용 장비를 신청할 수 없다
- [ ] 관리자가 엑셀/CSV 명단을 업로드하면 미리보기 후 전체 교체된다
- [ ] 대량 비활성화 시 경고와 재확인이 동작한다
- [ ] 관리자가 학생을 개별 추가·비활성화할 수 있다
- [ ] 자격 확인 API가 이름을 반환하지 않는다
- [ ] `npx vitest run` 과 `npx tsc --noEmit` 이 모두 통과한다
