/** 이름 마스킹: "홍길동" → "홍*동" */
export function maskName(name: string): string {
  if (!name) return ''
  const trimmed = name.trim()
  if (trimmed.length <= 1) return '*'
  if (trimmed.length === 2) return `${trimmed[0]}*`
  return `${trimmed[0]}${'*'.repeat(trimmed.length - 2)}${trimmed[trimmed.length - 1]}`
}
