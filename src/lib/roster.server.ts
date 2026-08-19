/**
 * 학생 명단 — 서버 전용 조회.
 * prisma 의존성을 격리해 클라이언트가 @/lib/roster(순수 모듈)만 가져가게 한다.
 * (restriction.server.ts 와 동일한 패턴)
 */
import { prisma } from '@/lib/prisma'
import { normalizeStudentId, namesMatch } from '@/lib/roster'

export type VerifyResult =
  | { ok: true; grade: number; name: string }
  | { ok: false; reason: 'not_found' | 'name_mismatch' }

/** 미등록·비활성 학생에 같은 메시지를 쓴다 — 재학 상태를 외부에 노출하지 않기 위함. */
export const NOT_IN_ROSTER_MESSAGE =
  '명단에 등록되지 않은 학번입니다. 학과 사무실에 문의해 주세요.'
export const NAME_MISMATCH_MESSAGE = '학번과 이름이 일치하지 않습니다.'

/**
 * 학번·이름이 활성 명단과 일치하는지 확인한다.
 * 일치하면 명단상의 학년을 함께 반환한다(신청 시 이 값으로 덮어쓴다).
 */
export async function verifyStudent(rawStudentId: string, rawName: string): Promise<VerifyResult> {
  const studentId = normalizeStudentId(rawStudentId)
  if (!studentId) return { ok: false, reason: 'not_found' }

  const student = await prisma.student.findFirst({
    where: { studentId, status: 'active' },
    select: { name: true, grade: true },
  })
  if (!student) return { ok: false, reason: 'not_found' }
  if (!namesMatch(rawName, student.name)) return { ok: false, reason: 'name_mismatch' }

  return { ok: true, grade: student.grade, name: student.name }
}

/** 검증 실패 사유를 사용자 노출용 메시지로 변환한다. */
export function verifyFailureMessage(reason: 'not_found' | 'name_mismatch'): string {
  return reason === 'name_mismatch' ? NAME_MISMATCH_MESSAGE : NOT_IN_ROSTER_MESSAGE
}
