/**
 * 기자재 카테고리 표시 순서 유틸 (DB 의존성 없음 — 클라이언트/서버 공용).
 * 목록을 카메라 바디 → 렌즈 → 삼각대/지지대 → 영상 장비 → 배터리 →
 * 저장 매체 → 음향 순으로 묶어 보여준다.
 */

// 명시 순서. 여기 없는 카테고리(필터·조명 등)는 이 뒤·'기타' 앞에 이름순으로,
// '기타'는 항상 맨 뒤에 배치한다.
export const CATEGORY_ORDER: string[] = [
  '카메라 바디',
  '렌즈',
  '삼각대/지지대',
  '영상 장비',
  '배터리',
  '저장 매체',
  '음향',
]

const ETC_RANK = 1000
const UNLISTED_RANK = 500

export function categoryRank(category: string): number {
  const i = CATEGORY_ORDER.indexOf(category)
  if (i !== -1) return i
  if (category === '기타') return ETC_RANK
  return UNLISTED_RANK
}

export interface Categorizable {
  category: string
  name: string
}

export interface CategoryGroup<T> {
  category: string
  items: T[]
}

/**
 * 카테고리별로 묶어 지정 순서로 정렬한다. 그룹 내부는 이름(한글) 오름차순.
 */
export function groupByCategory<T extends Categorizable>(items: T[]): CategoryGroup<T>[] {
  const map = new Map<string, T[]>()
  for (const it of items) {
    const arr = map.get(it.category) ?? []
    arr.push(it)
    map.set(it.category, arr)
  }
  return Array.from(map.entries())
    .map(([category, arr]) => ({
      category,
      items: [...arr].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    }))
    .sort((a, b) => {
      const ra = categoryRank(a.category)
      const rb = categoryRank(b.category)
      if (ra !== rb) return ra - rb
      return a.category.localeCompare(b.category, 'ko')
    })
}
