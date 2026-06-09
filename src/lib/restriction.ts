/**
 * 대여 제한자(패널티) 관리 (규정 제3조 6항 기준)
 *
 * 노쇼·손망실·연체 등 사유로 일정 기간 대여를 제한하는 학번을 관리한다.
 * 제한 기간(endAt) 내이고 수동 해제(releasedAt)되지 않은 제한은 "활성" 상태로,
 * 해당 학번의 기자재/강의실 대여 신청을 자동으로 차단한다.
 */

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export const RESTRICTION_REASONS = [
  { value: '노쇼', label: '노쇼(미수령)', defaultDays: 14 },
  { value: '손망실', label: '손·망실', defaultDays: 14 },
  { value: '연체', label: '반납 지연(연체)', defaultDays: 7 },
  { value: '기타', label: '기타', defaultDays: 7 },
] as const

export type RestrictionReason = (typeof RESTRICTION_REASONS)[number]['value']

/** 사유별 기본 제한 일수 (규정: 노쇼 14일) */
export function defaultRestrictionDays(reason: string): number {
  return RESTRICTION_REASONS.find((r) => r.value === reason)?.defaultDays ?? 14
}

/** 오늘 기준 N일 후의 그날 끝(23:59:59)을 제한 종료 시각으로 계산 */
export function computeEndDate(days: number, from: Date = new Date()): Date {
  const end = new Date(from)
  end.setDate(end.getDate() + days)
  end.setHours(23, 59, 59, 999)
  return end
}

/** 신청 차단 시 학생에게 보여줄 안내 메시지 */
export function restrictionBlockMessage(r: { reason: string; endAt: Date }): string {
  const until = format(new Date(r.endAt), 'yyyy년 M월 d일', { locale: ko })
  return `현재 대여가 제한된 학번입니다. (사유: ${r.reason}, 제한 해제일: ${until}) 자세한 사항은 학과 사무실로 문의해주세요.`
}
