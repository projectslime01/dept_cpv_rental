import { redirect } from 'next/navigation'

// 구 단독 신청 양식 경로 → 강의실 목록으로 리다이렉트
export default function ClassroomRedirectPage() {
  redirect('/classrooms')
}
