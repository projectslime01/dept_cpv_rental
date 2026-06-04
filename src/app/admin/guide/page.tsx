import { Metadata } from 'next'
import { GuideViewer } from '@/components/guide/GuideViewer'
import { adminGuide } from '@/lib/guide-content'

export const metadata: Metadata = {
  title: '이용 가이드 | 관리자',
  description: '관리자 패널 기능별 사용 방법을 단계별로 안내합니다.',
}

export default function AdminGuidePage() {
  return (
    <GuideViewer
      sections={adminGuide}
      title="관리자 이용 가이드"
      subtitle="기자재·강의실 신청 관리, 기자재 관리, 테스트 신청 등 관리자 기능을 안내합니다."
      pdfPath="/guide/연성대-기자재대여-관리자가이드.pdf"
    />
  )
}
