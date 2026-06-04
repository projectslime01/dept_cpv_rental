import { Metadata } from 'next'
import { GuideViewer } from '@/components/guide/GuideViewer'
import { studentGuide } from '@/lib/guide-content'

export const metadata: Metadata = {
  title: '이용 가이드 | 연성대학교 영상콘텐츠과 기자재 대여',
  description: '기자재 및 강의실 대여 시스템 이용 방법을 단계별로 안내합니다.',
}

export default function GuidePage() {
  return (
    <GuideViewer
      sections={studentGuide}
      title="이용 가이드"
      subtitle="기자재 및 강의실 대여 시스템 사용 방법을 단계별로 안내합니다."
    />
  )
}
