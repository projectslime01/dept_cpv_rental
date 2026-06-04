'use client'

import { useState } from 'react'
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
        <p className="text-xs font-medium text-base-muted uppercase tracking-wider">
          {sectionTitle}
        </p>
        <h2 className="text-xl font-bold text-base-primary leading-snug">
          {step.title}
        </h2>
        <p className="text-sm text-base-secondary leading-relaxed">
          {step.description}
        </p>
        <p className="text-xs text-base-faint font-mono">
          {stepIndex} / {totalSteps}
        </p>
      </div>
    </div>
  )
}
