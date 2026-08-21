'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Package, Building2, Search, CalendarDays, LayoutDashboard, ClipboardList, DoorOpen, History, Users, TestTube2, BookOpen, Presentation, X, ChevronLeft, ChevronRight, Printer, Download, AlertTriangle } from 'lucide-react'
import type { ComponentType } from 'react'
import { GuideSlide } from './GuideSlide'
import type { GuideSection, GuideStep } from '@/lib/guide-content'

// ─── 아이콘 이름 → 컴포넌트 매핑 ───────────────────────────
const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Package,
  Building2,
  Search,
  CalendarDays,
  LayoutDashboard,
  ClipboardList,
  DoorOpen,
  History,
  Users,
  TestTube2,
  BookOpen,
  AlertTriangle,
}

// ─── 전체 슬라이드 평탄화 ────────────────────────────────────
interface FlatSlide {
  sectionTitle: string
  step: GuideStep
  globalIndex: number  // 1-based
}

function flattenSlides(sections: GuideSection[]): FlatSlide[] {
  const result: FlatSlide[] = []
  let idx = 1
  for (const section of sections) {
    for (const step of section.steps) {
      result.push({ sectionTitle: section.title, step, globalIndex: idx++ })
    }
  }
  return result
}

// ─── 내부 StepCard (일반 모드용) ─────────────────────────────
function StepCard({ step, stepNumber }: { step: GuideStep; stepNumber: number }) {
  const [imgSrc, setImgSrc] = useState(step.imagePath)

  return (
    <div className="rounded-2xl border border-base bg-surface-raised overflow-hidden">
      {/* 제목 행 */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-base">
        <span className="w-6 h-6 rounded-full bg-brand-rose text-white text-xs font-bold flex items-center justify-center shrink-0">
          {stepNumber}
        </span>
        <span className="text-sm font-semibold text-base-primary">{step.title}</span>
      </div>
      {/* 이미지 + 설명 */}
      <div className="flex flex-col md:flex-row">
        <div className="md:w-1/2 relative aspect-video bg-surface-overlay">
          <Image
            src={imgSrc}
            alt={step.imageAlt}
            fill
            className="object-cover"
            onError={() => setImgSrc('/guide/placeholder.svg')}
            unoptimized
          />
        </div>
        <div className="md:w-1/2 px-5 py-4 flex items-center">
          <p className="text-[15px] text-base-secondary leading-[1.85] break-keep">{step.description}</p>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────
interface Props {
  sections: GuideSection[]
  title: string
  subtitle: string
  pdfPath?: string  // 발표용 PDF 다운로드 경로 (예: /guide/연성대-...학생가이드.pdf)
}

export function GuideViewer({ sections, title, subtitle, pdfPath }: Props) {
  const [slideMode, setSlideMode] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const allSlides = flattenSlides(sections)
  const totalSlides = allSlides.length
  const currentSlide = allSlides[currentIndex]

  const goNext = useCallback(() => {
    setCurrentIndex(i => Math.min(i + 1, totalSlides - 1))
  }, [totalSlides])

  const goPrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0))
  }, [])

  const closeSlide = useCallback(() => setSlideMode(false), [])

  const openSlide = useCallback(() => {
    setCurrentIndex(0)
    setSlideMode(true)
  }, [])

  // 키보드 이벤트 — 슬라이드 모드일 때만
  useEffect(() => {
    if (!slideMode) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'Escape') closeSlide()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slideMode, goNext, goPrev, closeSlide])

  return (
    <div>
      {/* ─── 페이지 헤더 ─── */}
      <div className="border-b border-base pb-6 mb-8 no-print">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-brand-rose-muted border border-brand-rose flex items-center justify-center text-brand-rose shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-base-primary tracking-tight break-keep">
                {title}
              </h1>
              <p className="text-sm text-base-secondary mt-0.5 break-keep">{subtitle}</p>
            </div>
          </div>
          {/* 액션 버튼 */}
          <div className="flex items-center gap-2 shrink-0">
            {pdfPath && (
              <a
                href={pdfPath}
                download
                className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2 rounded-xl bg-surface-raised border border-base text-base-secondary text-sm font-medium hover:bg-surface-overlay hover:text-base-primary transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4 shrink-0" />
                PDF 다운로드
              </a>
            )}
            <button
              onClick={openSlide}
              className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-rose text-white text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Presentation className="w-4 h-4 shrink-0" />
              슬라이드 모드
            </button>
          </div>
        </div>
      </div>

      {/* ─── 일반 모드: 모든 섹션 ─── */}
      <div className="space-y-14 no-print">
        {sections.map(section => {
          const Icon = ICON_MAP[section.iconName] ?? BookOpen
          return (
            <div key={section.id} className="space-y-5">
              {/* 섹션 헤더 */}
              <div className="flex items-center gap-3 pb-3 border-b border-base">
                <div className="w-9 h-9 rounded-xl bg-brand-rose-muted border border-brand-rose flex items-center justify-center text-brand-rose shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-base-primary">{section.title}</h2>
              </div>
              {/* Step 카드 목록 */}
              <div className="space-y-4">
                {section.steps.map((step, stepIdx) => (
                  <StepCard key={stepIdx} step={step} stepNumber={stepIdx + 1} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── 슬라이드 모드 오버레이 ─── */}
      {slideMode && currentSlide && (
        <div className="fixed inset-0 z-50 bg-surface flex flex-col no-print">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-base shrink-0">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-base-muted truncate">{currentSlide.sectionTitle}</span>
              <span className="text-base-faint shrink-0">›</span>
              <span className="font-semibold text-base-primary truncate">
                {currentSlide.step.title}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <span className="text-sm text-base-muted font-mono">
                {currentIndex + 1} / {totalSlides}
              </span>
              <button
                onClick={closeSlide}
                className="p-1.5 rounded-lg hover:bg-surface-raised text-base-muted hover:text-base-primary transition-colors"
                aria-label="슬라이드 모드 닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 슬라이드 내용 */}
          <div className="flex-1 flex items-center justify-center px-8 py-6 overflow-hidden">
            <div className="w-full max-w-5xl">
              <GuideSlide
                step={currentSlide.step}
                sectionTitle={currentSlide.sectionTitle}
                stepIndex={currentIndex + 1}
                totalSteps={totalSlides}
              />
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-base shrink-0">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-base text-sm font-medium text-base-secondary hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-raised border border-base text-sm font-medium text-base-secondary hover:bg-surface-overlay transition-colors"
            >
              <Printer className="w-4 h-4" />
              PDF로 저장
            </button>

            <button
              onClick={goNext}
              disabled={currentIndex === totalSlides - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-base text-sm font-medium text-base-secondary hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── 인쇄 전용 컨테이너 (평소에는 숨김) ─── */}
      <div className="guide-print-container" style={{ display: 'none' }}>
        {allSlides.map((slide, i) => (
          <div key={i} className="guide-print-slide">
            <div className="guide-print-section-label">
              {slide.sectionTitle} — {slide.step.title}
            </div>
            <GuideSlide
              step={slide.step}
              sectionTitle={slide.sectionTitle}
              stepIndex={slide.globalIndex}
              totalSteps={totalSlides}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
