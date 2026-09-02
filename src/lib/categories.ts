// 기자재 카테고리 표시 순서 (앱 전역 공용 소스).
// 카메라 바디 → 렌즈 → 삼각대/지지대 → 영상 장비 → 배터리 → 저장 매체 → 음향
// → 조명 → 필터 → 기타. 목록/필터 칩/드롭다운이 모두 이 순서를 따른다.
export const CATEGORY_ORDER = [
  '카메라 바디',
  '렌즈',
  '삼각대/지지대',
  '영상 장비',
  '배터리',
  '저장 매체',
  '음향',
  '조명',
  '필터',
  '기타',
]

export function categoryIndex(category: string): number {
  const i = CATEGORY_ORDER.indexOf(category)
  return i === -1 ? CATEGORY_ORDER.length : i
}

export function sortByCategory<T extends { category: string; name?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const diff = categoryIndex(a.category) - categoryIndex(b.category)
    if (diff !== 0) return diff
    return (a.name ?? '').localeCompare(b.name ?? '', 'ko')
  })
}

export interface CategoryGroup<T> {
  category: string
  items: T[]
}

/**
 * 카테고리별로 묶어 CATEGORY_ORDER 순서로 정렬한다. 그룹 내부는 이름(한글)순.
 * (드롭다운 optgroup 등 그룹 렌더용 — sortByCategory 와 동일한 순서 기준)
 */
export function groupByCategory<T extends { category: string; name?: string }>(
  items: T[],
): CategoryGroup<T>[] {
  const map = new Map<string, T[]>()
  for (const it of items) {
    const arr = map.get(it.category) ?? []
    arr.push(it)
    map.set(it.category, arr)
  }
  return Array.from(map.entries())
    .map(([category, arr]) => ({
      category,
      items: [...arr].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ko')),
    }))
    .sort((a, b) => {
      const diff = categoryIndex(a.category) - categoryIndex(b.category)
      if (diff !== 0) return diff
      return a.category.localeCompare(b.category, 'ko')
    })
}
