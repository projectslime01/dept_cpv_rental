export const CATEGORY_ORDER = [
  '카메라 바디',
  '렌즈',
  '삼각대/지지대',
  '저장 매체',
  '배터리',
  '필터',
  '음향',
  '조명',
  '영상 장비',
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
