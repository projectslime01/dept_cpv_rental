/** 평일 기준 N일 후 날짜 반환 (토·일 제외) */
export function addWeekdays(date: Date, count: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < count) {
    result.setDate(result.getDate() + 1)
    const day = result.getDay()
    if (day !== 0 && day !== 6) added++
  }
  return result
}
