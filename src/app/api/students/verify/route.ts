import { NextRequest, NextResponse } from 'next/server'
import { verifyStudent, verifyFailureMessage } from '@/lib/roster.server'
import { checkRateLimit, recordFailedAttempt, resetAttempts } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * 대여 자격 사전 확인.
 * 학번과 이름이 모두 일치해야 응답하므로 학번 단독 조회 오라클이 되지 않는다.
 * 응답에는 유효 여부와 학년만 담고 이름은 절대 반환하지 않는다.
 */
export async function POST(request: NextRequest) {
  let body: { studentId?: string; name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ valid: false, error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const studentId = (body.studentId ?? '').trim()
  const name = (body.name ?? '').trim()
  if (!studentId || !name) {
    return NextResponse.json({ valid: false, error: '학번과 이름을 모두 입력해 주세요.' }, { status: 400 })
  }

  const key = `verify:${studentId}`
  const limit = await checkRateLimit(key)
  if (!limit.allowed) {
    return NextResponse.json(
      { valid: false, error: '확인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 429 },
    )
  }

  const result = await verifyStudent(studentId, name)
  if (!result.ok) {
    await recordFailedAttempt(key)
    return NextResponse.json({ valid: false, error: verifyFailureMessage(result.reason) })
  }

  await resetAttempts(key)
  return NextResponse.json({ valid: true, grade: result.grade })
}
