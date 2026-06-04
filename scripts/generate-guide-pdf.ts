/**
 * 발표용(PPT 스타일) 가이드 PDF 생성기
 * 실행: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-guide-pdf.ts
 *
 * 실제 캡쳐된 스크린샷(public/guide/student, public/guide/admin)과
 * guide-content.ts 의 설명을 결합해 16:9 슬라이드 PDF를 생성한다.
 *  - public/guide/연성대-기자재대여-학생가이드.pdf
 *  - public/guide/연성대-기자재대여-관리자가이드.pdf
 */

import { chromium } from 'playwright'
import { readFileSync, mkdirSync } from 'fs'
import path from 'path'
import { studentGuide, adminGuide, GuideSection } from '../src/lib/guide-content'

const PROJECT_ROOT = path.resolve(__dirname, '..')
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public')
const OUT_DIR = path.join(PUBLIC_DIR, 'guide')
const FONT_DIR = path.join(__dirname, '.fonts')

// ─── 브랜드 ───────────────────────────────────────────────────
const ROSE = '#e11d48'
const INDIGO = '#4f46e5'
const INK = '#1f2937'
const SUB = '#6b7280'
const FAINT = '#9ca3af'
const BG_SOFT = '#f9fafb'
const BORDER = '#e5e7eb'

/** 파일을 base64 data URI 로 변환 (없으면 빈 문자열) */
function dataUri(absPath: string): string {
  try {
    const buf = readFileSync(absPath)
    const ext = path.extname(absPath).slice(1).toLowerCase()
    const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return ''
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const logoUri = dataUri(path.join(PUBLIC_DIR, 'logo.png'))
const placeholderUri = dataUri(path.join(PUBLIC_DIR, 'guide', 'placeholder.svg'))

/** Pretendard woff2 → base64 data URI */
function fontUri(weightFile: string): string {
  return dataUri(path.join(FONT_DIR, weightFile))
}

/** Pretendard @font-face 정의 (PDF에 폰트 임베드) */
function fontFaceCSS(): string {
  const faces: Array<[string, number]> = [
    ['Pretendard-Regular.woff2', 400],
    ['Pretendard-Medium.woff2', 500],
    ['Pretendard-SemiBold.woff2', 600],
    ['Pretendard-Bold.woff2', 700],
    ['Pretendard-ExtraBold.woff2', 800],
    ['Pretendard-Black.woff2', 900],
  ]
  return faces
    .map(([file, weight]) => {
      const uri = fontUri(file)
      if (!uri) throw new Error(`폰트 파일 누락: ${file} — scripts/.fonts/ 확인 필요`)
      return `@font-face{font-family:'Pretendard';font-style:normal;font-weight:${weight};font-display:block;src:url(${uri}) format('woff2');}`
    })
    .join('\n')
}

/** 표지 슬라이드 */
function coverSlide(title: string, subtitle: string, accent: string, totalSlides: number): string {
  return `
  <section class="slide cover" style="--accent:${accent}">
    <div class="cover-inner">
      ${logoUri ? `<img class="cover-logo" src="${logoUri}" alt="logo" />` : ''}
      <div class="cover-kicker">연성대학교 영상콘텐츠과</div>
      <h1 class="cover-title">${esc(title)}</h1>
      <p class="cover-sub">${esc(subtitle)}</p>
      <div class="cover-meta">통합 대여 시스템 이용 안내 · 총 ${totalSlides}단계</div>
    </div>
    <div class="cover-bar"></div>
  </section>`
}

/** 섹션 구분 슬라이드 */
function sectionDivider(index: number, title: string, accent: string, count: number): string {
  return `
  <section class="slide divider" style="--accent:${accent}">
    <div class="divider-num">${String(index).padStart(2, '0')}</div>
    <h2 class="divider-title">${esc(title)}</h2>
    <div class="divider-rule"></div>
    <p class="divider-count">${count}개 단계</p>
  </section>`
}

/** 콘텐츠 슬라이드 (스크린샷 + 설명) */
function contentSlide(opts: {
  sectionTitle: string
  stepTitle: string
  description: string
  imgUri: string
  globalIndex: number
  total: number
  accent: string
}): string {
  const { sectionTitle, stepTitle, description, imgUri, globalIndex, total, accent } = opts
  const img = imgUri || placeholderUri
  return `
  <section class="slide content" style="--accent:${accent}">
    <div class="content-head">
      <span class="chip">${esc(sectionTitle)}</span>
      <span class="page-no">${globalIndex} / ${total}</span>
    </div>
    <div class="content-body">
      <div class="shot-wrap">
        <img class="shot" src="${img}" alt="${esc(stepTitle)}" />
      </div>
      <div class="text-col">
        <div class="step-badge">STEP ${globalIndex}</div>
        <h3 class="step-title">${esc(stepTitle)}</h3>
        <p class="step-desc">${esc(description)}</p>
      </div>
    </div>
    <div class="foot-bar"></div>
  </section>`
}

/** 가이드 → 슬라이드 HTML 배열 */
function buildSlides(sections: GuideSection[], dir: string, accent: string): string[] {
  const slides: string[] = []
  const total = sections.reduce((s, sec) => s + sec.steps.length, 0)
  let gi = 0
  sections.forEach((section, si) => {
    slides.push(sectionDivider(si + 1, section.title, accent, section.steps.length))
    section.steps.forEach((step) => {
      gi += 1
      const imgAbs = path.join(PUBLIC_DIR, step.imagePath.replace(/^\//, ''))
      slides.push(
        contentSlide({
          sectionTitle: section.title,
          stepTitle: step.title,
          description: step.description,
          imgUri: dataUri(imgAbs),
          globalIndex: gi,
          total,
          accent,
        }),
      )
    })
  })
  return slides
}

function pageCSS(): string {
  return `
  ${fontFaceCSS()}
  /* 모든 요소를 Pretendard로 강제. 숫자(tabular 영역 포함)도 동일 폰트 사용 */
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact;
      font-family:'Pretendard',sans-serif !important; }
  /* 자간: 본문 기준 -10 (=-0.010em), 제목류는 개별로 -25까지 */
  html,body { font-family:'Pretendard',sans-serif; color:${INK}; letter-spacing:-0.012em; }
  @page { size:1280px 720px; margin:0; }
  .slide {
    position:relative; width:1280px; height:720px; overflow:hidden;
    page-break-after:always; background:#ffffff;
    display:flex; flex-direction:column;
  }
  .slide:last-child { page-break-after:auto; }

  /* 표지 — 자간 -10~-25 범위 적용 */
  .cover { align-items:flex-start; justify-content:center; padding:0 96px; background:${BG_SOFT}; }
  .cover-inner { max-width:900px; }
  .cover-logo { width:84px; height:84px; object-fit:contain; margin-bottom:28px; }
  .cover-kicker { font-size:22px; font-weight:600; color:var(--accent); letter-spacing:-0.01em; margin-bottom:18px; }
  .cover-title { font-size:68px; font-weight:800; line-height:1.1; letter-spacing:-0.025em; }
  .cover-sub { font-size:26px; color:${SUB}; margin-top:24px; font-weight:400; letter-spacing:-0.02em; }
  .cover-meta { font-size:18px; color:${FAINT}; margin-top:40px; font-weight:500; letter-spacing:-0.012em; }
  .cover-bar { position:absolute; left:0; bottom:0; width:100%; height:16px; background:var(--accent); }

  /* 섹션 구분 */
  .divider { align-items:flex-start; justify-content:center; padding:0 96px; background:#fff; }
  .divider-num { font-size:120px; font-weight:800; color:var(--accent); opacity:.18; line-height:1; letter-spacing:-0.025em; }
  .divider-title { font-size:56px; font-weight:800; margin-top:8px; letter-spacing:-0.025em; }
  .divider-rule { width:120px; height:8px; background:var(--accent); border-radius:8px; margin-top:32px; }
  .divider-count { font-size:20px; color:${SUB}; margin-top:24px; font-weight:500; letter-spacing:-0.012em; }

  /* 콘텐츠 */
  .content { padding:48px 64px 0; }
  .content-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; }
  .chip {
    font-size:18px; font-weight:700; color:var(--accent);
    background:color-mix(in srgb, var(--accent) 10%, white);
    border:1.5px solid color-mix(in srgb, var(--accent) 28%, white);
    padding:8px 18px; border-radius:999px; letter-spacing:-0.015em;
  }
  .page-no { font-size:18px; font-weight:600; color:${FAINT}; font-variant-numeric:tabular-nums; letter-spacing:-0.01em; }
  .content-body { flex:1; display:flex; gap:48px; align-items:center; }
  .shot-wrap {
    flex:0 0 58%; height:430px; border-radius:20px; overflow:hidden;
    border:1px solid ${BORDER}; background:${BG_SOFT};
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 12px 32px rgba(0,0,0,.08);
  }
  .shot { width:100%; height:100%; object-fit:cover; object-position:top center; }
  .text-col { flex:1; }
  .step-badge {
    display:inline-block; font-size:16px; font-weight:700; color:#fff;
    background:var(--accent); padding:6px 16px; border-radius:8px; letter-spacing:-0.01em;
  }
  .step-title { font-size:40px; font-weight:800; line-height:1.2; margin-top:20px; letter-spacing:-0.025em; }
  .step-desc { font-size:23px; line-height:1.7; color:${SUB}; margin-top:24px; font-weight:400; letter-spacing:-0.018em; }
  .foot-bar { height:10px; background:var(--accent); margin:40px -64px 0; }
  `
}

function buildHTML(slidesHtml: string): string {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8" /><style>${pageCSS()}</style></head><body>${slidesHtml}</body></html>`
}

async function renderPDF(html: string, outPath: string) {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle' })
  // 임베드된 Pretendard 폰트 로딩 완료 대기 (async 변환 회피 위해 문자열 평가)
  await page.evaluate('document.fonts.ready')
  await page.pdf({
    path: outPath,
    width: '1280px',
    height: '720px',
    printBackground: true,
    pageRanges: '', // all
  })
  await browser.close()
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  // ── 학생 가이드 ──
  const studentTotal = studentGuide.reduce((s, sec) => s + sec.steps.length, 0)
  const studentSlides = [
    coverSlide('학생 이용 가이드', '기자재 · 강의실 대여 신청부터 조회까지', ROSE, studentTotal),
    ...buildSlides(studentGuide, 'student', ROSE),
  ].join('\n')
  const studentOut = path.join(OUT_DIR, '연성대-기자재대여-학생가이드.pdf')
  await renderPDF(buildHTML(studentSlides), studentOut)
  console.log('✓', path.basename(studentOut))

  // ── 관리자 가이드 ──
  const adminTotal = adminGuide.reduce((s, sec) => s + sec.steps.length, 0)
  const adminSlides = [
    coverSlide('관리자 이용 가이드', '신청 승인 · 기자재/강의실 관리 운영 안내', INDIGO, adminTotal),
    ...buildSlides(adminGuide, 'admin', INDIGO),
  ].join('\n')
  const adminOut = path.join(OUT_DIR, '연성대-기자재대여-관리자가이드.pdf')
  await renderPDF(buildHTML(adminSlides), adminOut)
  console.log('✓', path.basename(adminOut))

  console.log('\n✅ 발표용 PDF 생성 완료!')
}

main().catch((e) => {
  console.error('❌ 오류:', e)
  process.exit(1)
})
