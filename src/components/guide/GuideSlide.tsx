'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { GuideStep } from '@/lib/guide-content'

interface Props {
  step: GuideStep
  sectionTitle: string
  stepIndex: number   // 1-based 전체 슬라이드 번호
  totalSteps: number
}

export function GuideSlide({ step, sectionTitle, stepIndex, totalSteps }: Props) {
  const [imgSrc, setImgSrc] = useState(step.imagePath)

  // 슬라이드 전환 시 동일 인스턴스의 step prop만 바뀌므로
  // imgSrc state를 새 이미지 경로로 동기화한다.
  useEffect(() => {
    setImgSrc(step.imagePath)
  }, [step.imagePath])

  return (
    <div className="flex flex-col md:flex-row gap-8 items-center w-full">
      {/* 스크린샷 */}
      <div className="w-full md:w-3/5 relative aspect-video rounded-2xl overflow-hidden border border-base bg-surface-raised shrink-0">
        <Image
          src={imgSrc}
          alt={step.imageAlt}
          fill
          className="object-cover"
          onError={() => setImgSrc('/guide/placeholder.svg')}
          unoptimized
        />
      </div>

      {/* 텍스트 */}
      <div className="w-full md:w-2/5 space-y-3">
        <p className="text-sm font-medium text-base-muted uppercase tracking-wider">
          {sectionTitle}
        </p>
        <h2 className="text-2xl font-bold text-base-primary leading-snug break-keep">
          {step.title}
        </h2>
        <p className="text-[17px] text-base-secondary leading-[1.85] break-keep">
          {step.description}
        </p>
        <p className="text-xs text-base-faint font-mono">
          {stepIndex} / {totalSteps}
        </p>
      </div>
    </div>
  )
}
