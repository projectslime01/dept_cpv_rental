/**
 * 학생 가이드 스크린샷 수정 (프리뷰 검토 후 발견된 문제 3건)
 * 실행: node scripts/fix-student-screenshots.mjs
 *
 * 수정 대상:
 *   03-03-status-result.png  — "Please fill out this field" 에러 → 실제 조회 결과 화면
 *   02-04-classroom-complete — 신청 폼 하단 → 신청 완료 화면
 *   04-02-rental-calendar    — 04-01과 동일 → 날짜 선택 후 예약 현황 표시 상태
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'http://localhost:3000';
const STUDENT_DIR = path.join(PROJECT_ROOT, 'public/guide/student');

// 2026-06-10 (수) 10:00 KST = 01:00 UTC — 업무시간 내, 2일 전 신청 가능
const MOCK_TIMESTAMP = new Date('2026-06-10T01:00:00.000Z').getTime();

const DATE_MOCK_SCRIPT = `
  const _OriginalDate = globalThis.Date;
  const MOCK_TIME = ${MOCK_TIMESTAMP};
  let offset = MOCK_TIME - _OriginalDate.now();
  class MockDate extends _OriginalDate {
    constructor(...args) {
      if (args.length === 0) { super(_OriginalDate.now() + offset); }
      else { super(...args); }
    }
    static now() { return _OriginalDate.now() + offset; }
  }
  Object.getOwnPropertyNames(_OriginalDate).forEach(k => {
    if (!(k in MockDate)) { try { MockDate[k] = _OriginalDate[k]; } catch(_) {} }
  });
  globalThis.Date = MockDate;
`;

async function shot(page, filePath, waitFor = 1200) {
  await page.waitForTimeout(waitFor);
  await page.screenshot({
    path: filePath,
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log('  ✓', path.basename(filePath));
}

/** DateTimePicker 조작 */
async function pickDateTime(page, placeholder, targetDay) {
  await page.click(`button:has-text("${placeholder}")`);
  await page.waitForTimeout(700);

  const dayLocator = page.locator('button').filter({ hasText: new RegExp(`^${targetDay}$`) });
  const count = await dayLocator.count();
  let clicked = false;
  for (let i = 0; i < count; i++) {
    const btn = dayLocator.nth(i);
    if (await btn.isEnabled()) {
      await btn.click();
      clicked = true;
      console.log(`    → ${placeholder}: ${targetDay}일 선택`);
      break;
    }
  }
  if (!clicked) console.log(`    ! ${placeholder}: ${targetDay}일 클릭 실패`);
  await page.waitForTimeout(400);

  const confirmBtn = page.locator('button').filter({ hasText: /확정$/ }).first();
  if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmBtn.click();
    console.log(`    → ${placeholder}: 확정 클릭`);
    await page.waitForTimeout(300);
  }
}

async function main() {
  await mkdir(STUDENT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  // ─── 03-03: 신청 조회 결과 ─────────────────────────────────
  console.log('\n📸 [03-03] 신청 조회 결과 화면');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/status`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // 신청번호 입력 (id="requestNumber")
    await page.fill('#requestNumber', 'REQ-20260604-0001');
    // 비밀번호 입력 (id="password")
    await page.fill('#password', '1234');
    console.log('  → 신청번호: REQ-20260604-0001, 비밀번호: 1234');

    // 조회 버튼 클릭
    await page.click('button:has-text("조회하기")');
    await page.waitForTimeout(2000);

    // 결과 화면 확인
    const resultText = await page.locator('body').textContent();
    if (resultText.includes('소니 A7M4') || resultText.includes('대기') || resultText.includes('승인')) {
      console.log('  → 조회 결과 표시됨');
    } else {
      console.log('  ! 조회 결과 없음, 현재 화면 캡쳐');
    }
    await shot(page, path.join(STUDENT_DIR, '03-03-status-result.png'));
    await ctx.close();
  }

  // ─── 02-04: 강의실 신청 완료 ───────────────────────────────
  console.log('\n📸 [02-04] 강의실 신청 완료 화면');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(DATE_MOCK_SCRIPT);
    const page = await ctx.newPage();

    // 강의실 신청 페이지 (402호 = id 5)
    await page.goto(`${BASE_URL}/classrooms/5/apply`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // 신청자 정보 먼저 입력
    await page.fill('input[name="applicantName"]', '홍길동');
    await page.fill('input[name="studentId"]', '20241234');
    await page.fill('input[name="phone"]', '010-9876-5432');
    console.log('  → 신청자 정보 입력');

    // 날짜 선택: June 12 (금) → June 15 (월) — 금요일반출/월요일반납 유효 범위
    await pickDateTime(page, '대여 시작', 12);
    await pickDateTime(page, '반납 예정', 15);

    // 신청 유형 선택 (개인)
    const individualBtn = page.locator('button:has-text("개인")').first();
    if (await individualBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await individualBtn.click();
      console.log('  → 개인 사용 선택');
      await page.waitForTimeout(400);
    } else {
      console.log('  ! 개인 버튼 없음 — 스크롤해서 재탐색');
      await page.evaluate(() => window.scrollBy(0, 300));
      await page.waitForTimeout(400);
      const btn2 = page.locator('button:has-text("개인")').first();
      if (await btn2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn2.click();
        await page.waitForTimeout(400);
      }
    }

    // 모니터 사용 여부 (미사용)
    const notUsedBtn = page.locator('button:has-text("미사용")').first();
    if (await notUsedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await notUsedBtn.click();
      console.log('  → 모니터 미사용 선택');
      await page.waitForTimeout(300);
    }

    // 목적 입력
    const purposeArea = page.locator('textarea[name="purpose"]').first();
    if (await purposeArea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await purposeArea.fill('팀 프로젝트 촬영 준비 및 편집');
      console.log('  → 목적 입력');
    }

    // 비밀번호 (id="password")
    await page.fill('#password', '1234');
    console.log('  → 비밀번호 입력');

    // 제출 버튼
    const submitBtn = page.locator('button[type="submit"]').first();
    const isEnabled = await submitBtn.isEnabled({ timeout: 3000 }).catch(() => false);
    console.log('  → 제출 버튼 활성화:', isEnabled);

    if (isEnabled) {
      await submitBtn.click();
      console.log('  → 신청 제출...');
      // 완료 화면 대기 (신청번호 ROOM-... 표시)
      await page.waitForSelector('text=ROOM-', { timeout: 10000 }).catch(() => {
        console.log('  ! ROOM- 번호 대기 타임아웃');
      });
      await page.waitForTimeout(1000);
    } else {
      console.log('  ! 버튼 비활성 — 현재 화면 캡쳐');
    }

    await shot(page, path.join(STUDENT_DIR, '02-04-classroom-complete.png'));
    await ctx.close();
  }

  // ─── 04-02: 전체 대여 현황 날짜 선택 ──────────────────────
  console.log('\n📸 [04-02] 전체 대여 현황 — 날짜 선택 상태');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/rental-status`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // June 10 (화) 클릭 — 신청 데이터가 있는 날짜
    const dayBtn = page.locator('button, td, div').filter({ hasText: /^10$/ }).first();
    if (await dayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dayBtn.click();
      console.log('  → 10일 클릭');
      await page.waitForTimeout(800);
    } else {
      // 캘린더 셀 직접 클릭
      const allDayElems = page.locator('text=10');
      const cnt = await allDayElems.count();
      console.log(`  → "10" 요소 ${cnt}개 발견`);
      if (cnt > 0) {
        await allDayElems.first().click();
        await page.waitForTimeout(800);
      }
    }
    await shot(page, path.join(STUDENT_DIR, '04-02-rental-calendar.png'));
    await ctx.close();
  }

  await browser.close();
  console.log('\n✅ 학생 스크린샷 수정 완료!');
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
