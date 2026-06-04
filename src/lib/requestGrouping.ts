/**
 * 대여 신청 묶음(groupNumber) 표시용 순수 유틸.
 * - 같은 groupNumber 를 가진 RentalRequest 들을 하나의 신청으로 묶음
 * - 품목 리스트를 "소니 FX3 1대, 소니 24-105 1개 …" 형태 문자열/배열로 변환
 */

/** 카테고리에 따른 수량 단위 (카메라 바디만 '대', 그 외 '개') */
export function unitFor(category: string | null | undefined): string {
  return category === '카메라 바디' ? '대' : '개'
}

export interface ItemLike {
  name: string
  category?: string | null
  quantity: number
}

/** 품목 배열 → "소니 FX3 1대, 소니 24-105 1개" 단일 문자열 */
export function formatItemList(items: ItemLike[]): string {
  return items.map((it) => `${it.name} ${it.quantity}${unitFor(it.category)}`).join(', ')
}

/** groupNumber 가 없으면 단건으로 취급할 키 생성 */
export function groupKeyOf<T extends { id: number; groupNumber?: string | null }>(row: T): string {
  return row.groupNumber && row.groupNumber.trim() !== '' ? `g:${row.groupNumber}` : `s:${row.id}`
}

export interface GroupedRequest<T> {
  key: string
  groupNumber: string | null
  rows: T[]
  ids: number[]
}

/**
 * groupNumber 기준으로 묶기. 입력 순서를 보존(첫 등장 순).
 */
export function groupRequests<T extends { id: number; groupNumber?: string | null }>(
  rows: T[],
): GroupedRequest<T>[] {
  const map = new Map<string, GroupedRequest<T>>()
  for (const row of rows) {
    const key = groupKeyOf(row)
    let g = map.get(key)
    if (!g) {
      g = { key, groupNumber: row.groupNumber ?? null, rows: [], ids: [] }
      map.set(key, g)
    }
    g.rows.push(row)
    g.ids.push(row.id)
  }
  return Array.from(map.values())
}
