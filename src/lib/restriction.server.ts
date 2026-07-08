/**
 * 대여 제한자(패널티) — 서버 전용 쿼리.
 *
 * prisma 의존성을 격리해 클라이언트 컴포넌트가 @/lib/restriction(순수 모듈)만
 * 가져갈 수 있도록 분리한다.
 */

import { prisma } from '@/lib/prisma'
import { nowKST } from '@/lib/rentalUtils'

export type ActiveRestriction = {
  id: number
  studentId: string
  reason: string
  endAt: Date
}

/**
 * 해당 학번에 현재 활성화된 대여 제한이 있으면 반환, 없으면 null.
 * 활성 = 수동 해제되지 않았고(releasedAt == null) 제한 종료 시각이 아직 지나지 않음.
 */
export async function getActiveRestriction(
  studentId: string,
  at: Date = nowKST(),
): Promise<ActiveRestriction | null> {
  const id = studentId.trim()
  if (!id) return null
  return prisma.rentalRestriction.findFirst({
    where: {
      studentId: id,
      releasedAt: null,
      startAt: { lte: at },
      endAt: { gt: at },
    },
    orderBy: { endAt: 'desc' },
    select: { id: true, studentId: true, reason: true, endAt: true },
  })
}
