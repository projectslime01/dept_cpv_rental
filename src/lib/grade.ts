/**
 * 학년 기반 기자재 대여 자격 (규정 제5조 기준)
 *
 * 규정 등급 → 학년 매핑:
 *  - 1학년: 촬영기초 — 캠코더(Z90), 삼각대, LED 조명 + 보조 액세서리
 *  - 2학년: 촬영심화 — + A7M4, 24-105mm, 짐벌, ND(원형)
 *  - 3학년: 콘텐츠창작 — + FX3, 전체 렌즈, 매트박스, 4x5.6 ND, 모니터, 드론 등 일체
 */

export const GRADE_OPTIONS = [1, 2, 3] as const
export type Grade = (typeof GRADE_OPTIONS)[number]

export function gradeLabel(grade: number | null | undefined): string {
  if (grade == null) return '-'
  return `${grade}학년`
}

/** 학년이 해당 기자재(minGrade)를 대여할 자격이 되는지 */
export function canRentByGrade(grade: number | null | undefined, minGrade: number): boolean {
  if (grade == null) return false
  return grade >= minGrade
}

export function isValidGrade(grade: unknown): grade is Grade {
  return grade === 1 || grade === 2 || grade === 3
}
