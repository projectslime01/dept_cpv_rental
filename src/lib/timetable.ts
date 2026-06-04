// src/lib/timetable.ts
// 수업 시간표 충돌 검사 유틸리티
// dayOfWeek 규칙: 0=월 1=화 2=수 3=목 4=금 5=토 6=일

export const DOW_LABELS = ['월', '화', '수', '목', '금', '토', '일']

/** JS Date.getDay() (0=Sun~6=Sat) → 우리 규칙 (0=Mon~6=Sun) */
export function jsDowToMyDow(jsDay: number): number {
  return (jsDay + 6) % 7
}

export interface TimetableEntry {
  id: number
  classroomId: number
  dayOfWeek: number
  startTime: string
  endTime: string
  courseName: string | null
  semesterStart: Date
  semesterEnd: Date
}

/**
 * 대여 기간이 시간표와 충돌하는지 검사.
 * 충돌하는 항목과 해당 날짜를 반환하거나 null 반환.
 */
export function findTimetableConflict(
  timetables: TimetableEntry[],
  startAt: Date,
  endAt: Date,
): { entry: TimetableEntry; date: Date } | null {
  if (!timetables.length) return null

  const startDate = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate())
  const endDate   = new Date(endAt.getFullYear(),   endAt.getMonth(),   endAt.getDate())

  for (
    let d = new Date(startDate);
    d <= endDate;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  ) {
    const myDow = jsDowToMyDow(d.getDay())

    for (const entry of timetables) {
      if (entry.dayOfWeek !== myDow) continue

      // 학기 범위 체크
      const semStart = new Date(
        entry.semesterStart.getFullYear(),
        entry.semesterStart.getMonth(),
        entry.semesterStart.getDate(),
      )
      const semEnd = new Date(
        entry.semesterEnd.getFullYear(),
        entry.semesterEnd.getMonth(),
        entry.semesterEnd.getDate(),
      )
      if (d < semStart || d > semEnd) continue

      // 해당 날의 수업 시작/종료 datetime 구성
      const [sh, sm] = entry.startTime.split(':').map(Number)
      const [eh, em] = entry.endTime.split(':').map(Number)
      const classStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm)
      const classEnd   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em)

      // 겹침 검사: [startAt, endAt) ∩ [classStart, classEnd) ≠ ∅
      if (startAt < classEnd && endAt > classStart) {
        return { entry, date: new Date(d) }
      }
    }
  }
  return null
}

export interface TimetableOccurrence {
  dayStr: string   // "YYYY-MM-DD"
  startTime: string
  endTime: string
  courseName: string | null
  timetableId: number
}

/**
 * 해당 월에 실제로 발생하는 수업 시간표 슬롯 목록 반환
 */
export function getTimetableOccurrencesForMonth(
  timetables: TimetableEntry[],
  year: number,
  month: number, // 1-indexed
): TimetableOccurrence[] {
  const results: TimetableOccurrence[] = []
  const daysInMonth = new Date(year, month, 0).getDate()

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day)
    const myDow = jsDowToMyDow(d.getDay())
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    for (const entry of timetables) {
      if (entry.dayOfWeek !== myDow) continue

      const semStart = new Date(
        entry.semesterStart.getFullYear(),
        entry.semesterStart.getMonth(),
        entry.semesterStart.getDate(),
      )
      const semEnd = new Date(
        entry.semesterEnd.getFullYear(),
        entry.semesterEnd.getMonth(),
        entry.semesterEnd.getDate(),
      )
      if (d < semStart || d > semEnd) continue

      results.push({
        dayStr,
        startTime: entry.startTime,
        endTime: entry.endTime,
        courseName: entry.courseName,
        timetableId: entry.id,
      })
    }
  }
  return results
}
