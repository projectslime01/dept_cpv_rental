/**
 * 깨진 신청서 스크린샷 재캡쳐 (v5 — Date 모킹 포함)
 * 실행: node scripts/fix-apply-screenshots.mjs
 *
 * isSubmissionTimeValid 가 평일 09:00~17:00 KST 를 요구하므로
 * initScript 로 Date 를 목킹하여 제출 버튼을 활성화.
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'http://localhost:3000';
const STUDENT_DIR = path.join(PROJECT_ROOT, 'public/guide/student');

async function shot(page, filePath, waitFor = 1200) {
  await page.waitForTimeout(waitFor);
  await page.screenshot({
    path: filePath,
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log('  ✓', path.basename(filePath));
}

/** DateTimePicker 조작: 트리거 클릭 → 날짜 선택 → 확정 버튼 */
async function pickDate(page, triggerText, targetDay) {
  await page.click(`button:has-text("${triggerText}")`);
  await page.waitForTimeout(600);

  const dayLocator = page.locator('button').filter({ hasText: new RegExp(`^${targetDay}$`) });
  const count = await dayLocator.count();
  let clicked = false;
  for (let i = 0; i < count; i++) {
    const btn = dayLocator.nth(i);
    if (await btn.isEnabled()) {
      await btn.click();
      clicked = true;
      console.log(`    → ${triggerText}: ${targetDay}일 선택`);
      break;
    }
  }
  if (!clicked) console.log(`    ! ${triggerText}: ${targetDay}일 클릭 실패`);
  await page.waitForTimeout(400);

  // 확정 버튼
  const confirmBtn = page.locator('button').filter({ hasText: /확정$/ }).first();
  if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmBtn.click();
    console.log(`    → ${triggerText}: 확정 클릭`);
    await page.waitForTimeout(300);
  }
}

async function main() {
  await mkdir(STUDENT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // ─── 01-03, 01-04: 일반 컨텍스트 ────────────────────────
  const ctx1 = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page1 = await ctx1.newPage();

  console.log('\n📸 신청 관련 스크린샷 재캡쳐 시작');

  // 01-03: 장바구니 담기
  await page1.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page1.waitForTimeout(1000);
  await page1.click('button:has-text("선택")');
  await page1.waitForTimeout(800);
  console.log('  → 기자재 선택됨');
  await shot(page1, path.join(STUDENT_DIR, '01-03-add-to-cart.png'));

  // 01-04: 신청서 폼
  await page1.goto(`${BASE_URL}/cart`, { waitUntil: 'networkidle' });
  await page1.waitForTimeout(1000);
  await shot(page1, path.join(STUDENT_DIR, '01-04-apply-form.png'));

  await ctx1.close();

  // ─── 01-05: Date 모킹 컨텍스트 (평일 10:00 KST) ─────────
  // 2026-06-10 (수) 10:00 KST = 01:00 UTC
  const MOCK_TIMESTAMP = new Date('2026-06-10T01:00:00.000Z').getTime();

  const ctx2 = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  // Date 목킹: new Date() → 2026-06-10 10:00 KST
  await ctx2.addInitScript(`
    const _OriginalDate = globalThis.Date;
    const MOCK_TIME = ${MOCK_TIMESTAMP};
    let offset = MOCK_TIME - _OriginalDate.now();

    class MockDate extends _OriginalDate {
      constructor(...args) {
        if (args.length === 0) {
          super(_OriginalDate.now() + offset);
        } else {
          super(...args);
        }
      }
      static now() {
        return _OriginalDate.now() + offset;
      }
    }
    // static 메서드 복사
    Object.getOwnPropertyNames(_OriginalDate).forEach(k => {
      if (!(k in MockDate)) {
        try { MockDate[k] = _OriginalDate[k]; } catch (_) {}
      }
    });
    globalThis.Date = MockDate;
  `);

  const page2 = await ctx2.newPage();

  console.log('\n  [01-05] Date 모킹 (2026-06-10 10:00 KST) 적용');

  // 기자재 선택
  await page2.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page2.waitForTimeout(1000);
  await page2.click('button:has-text("선택")');
  await page2.waitForTimeout(600);

  // /cart 이동
  await page2.goto(`${BASE_URL}/cart`, { waitUntil: 'networkidle' });
  await page2.waitForTimeout(1000);

  // 날짜 선택 — 모킹 기준 June 10 (수) → 최소 June 12 이후
  // June 16 (화) ~ June 18 (목): 평일 3일, 주말 없음 → needsApproval 없음
  await pickDate(page2, '대여 시작', 16); // June 16 (화)
  await pickDate(page2, '반납 예정', 18); // June 18 (목)

  // 텍스트 필드
  await page2.fill('#applicantName', '홍길동');
  await page2.fill('#studentId', '20241234');
  await page2.fill('#phone', '010-9876-5432');
  await page2.fill('#password', '1234');
  console.log('  → 텍스트 필드 채움');
  await page2.waitForTimeout(500);

  // 제출 버튼 확인
  const submitBtn = page2.locator('button:has-text("일괄 신청")');
  const enabled = await submitBtn.isEnabled({ timeout: 2000 }).catch(() => false);
  console.log(`  → 제출 버튼 활성화: ${enabled}`);

  if (enabled) {
    await submitBtn.click();
    console.log('  → 제출 완료, 신청 완료 화면 대기...');
    await page2.waitForSelector('text=신청 완료', { timeout: 10000 }).catch(() => {
      console.log('  ! 성공 화면 로딩 대기 종료');
    });
  } else {
    // 현재까지 작성된 상태 그대로 캡쳐 (폼 채워진 화면)
    console.log('  ! 제출 버튼 여전히 비활성 → 현재 화면 캡쳐');
  }

  await shot(page2, path.join(STUDENT_DIR, '01-05-apply-complete.png'), 1000);

  await ctx2.close();
  await browser.close();

  console.log('\n✅ 재캡쳐 완료!');
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
