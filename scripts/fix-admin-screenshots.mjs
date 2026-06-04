/**
 * 관리자 가이드 스크린샷 재캡쳐
 * 실행: node scripts/fix-admin-screenshots.mjs
 *
 * 수정 대상:
 *   02-01 ~ 02-04  기자재 신청 관리 (빈 목록 → 실제 신청 데이터)
 *   03-02          강의실 승인 모달 (목록만 보임 → 모달 열린 상태)
 *   06-01 ~ 06-02  대여 이력 (0건 → 실제 이력, 필터 적용)
 *   07-02          테스트 신청 (빈 폼 → 데이터 입력된 상태)
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'http://localhost:3000';
const ADMIN_DIR = path.join(PROJECT_ROOT, 'public/guide/admin');

async function shot(page, filePath, waitFor = 1000) {
  await page.waitForTimeout(waitFor);
  await page.screenshot({
    path: filePath,
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log('  ✓', path.basename(filePath));
}

/** DateTimePicker 조작: 트리거 클릭 → 날짜 선택 → 확정 */
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

  // 확정 버튼
  const confirmBtn = page.locator('button').filter({ hasText: /확정$/ }).first();
  if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmBtn.click();
    console.log(`    → ${placeholder}: 확정 클릭`);
    await page.waitForTimeout(300);
  }
}

/** 관리자 로그인 */
async function adminLogin(page) {
  // 관리자 로그인 페이지는 /admin
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 로그인 폼 채우기 (#username, #password)
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin1234');
  await page.click('button[type="submit"]');

  // /admin/dashboard 로 리디렉션될 때까지 대기
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 }).catch(() => {
    console.log('  ! dashboard 리디렉션 대기 타임아웃 — 계속 진행');
  });
  await page.waitForTimeout(1000);
  console.log('  → 관리자 로그인 완료, URL:', page.url());
}

/** 테스트 기자재 신청 생성 → 신청번호 반환 */
async function createTestEquipmentRequest(page) {
  await page.goto(`${BASE_URL}/admin/test-request`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 기자재 탭이 기본값이므로 바로 진행
  // 날짜 선택 (June 10, June 13)
  await pickDateTime(page, '대여 시작', 10);
  await pickDateTime(page, '대여 종료', 13);

  // 텍스트 필드
  await page.fill('input[placeholder="홍길동"]', '홍길동');
  await page.fill('input[placeholder="20240001"]', '20241234');
  await page.fill('input[placeholder="010-0000-0000"]', '010-9876-5432');
  await page.fill('input[type="password"]', '1234');
  console.log('  → 기자재 신청 폼 입력 완료');

  // 제출
  await page.click('button:has-text("테스트 신청 생성")');
  await page.waitForTimeout(2000);

  // 결과 확인
  const resultText = await page.locator('[class*="emerald"]').first().textContent().catch(() => '');
  console.log('  → 기자재 신청 결과:', resultText.trim().substring(0, 60));
  return resultText;
}

/** 테스트 강의실 신청 생성 */
async function createTestClassroomRequest(page) {
  await page.goto(`${BASE_URL}/admin/test-request`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 강의실 탭 클릭
  await page.click('button:has-text("강의실")');
  await page.waitForTimeout(500);

  // 날짜 선택 (June 10, June 11)
  await pickDateTime(page, '대여 시작', 10);
  await pickDateTime(page, '대여 종료', 11);

  // 텍스트 필드
  await page.fill('input[placeholder="홍길동"]', '홍길동');
  await page.fill('input[placeholder="20240001"]', '20241234');
  await page.fill('input[placeholder="010-0000-0000"]', '010-9876-5432');
  await page.fill('input[type="password"]', '1234');
  console.log('  → 강의실 신청 폼 입력 완료');

  // 제출
  await page.click('button:has-text("테스트 신청 생성")');
  await page.waitForTimeout(2000);
  const resultText = await page.locator('[class*="emerald"]').first().textContent().catch(() => '');
  console.log('  → 강의실 신청 결과:', resultText.trim().substring(0, 60));
}

async function main() {
  await mkdir(ADMIN_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  console.log('\n🔑 관리자 로그인');
  await adminLogin(page);

  // ─── 테스트 신청 생성 ────────────────────────────────────────
  console.log('\n📋 테스트 기자재 신청 생성');
  await createTestEquipmentRequest(page);

  console.log('\n🏫 테스트 강의실 신청 생성');
  await createTestClassroomRequest(page);

  // ─── 07-02: 테스트 신청 폼 (기자재 데이터 입력 상태) ─────────
  console.log('\n📸 [07-02] 기자재 테스트 신청 폼 (데이터 입력 상태)');
  await page.goto(`${BASE_URL}/admin/test-request`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 폼에 데이터 입력 (제출하지 않음)
  await pickDateTime(page, '대여 시작', 16);
  await pickDateTime(page, '대여 종료', 18);
  await page.fill('input[placeholder="홍길동"]', '홍길동');
  await page.fill('input[placeholder="20240001"]', '20241234');
  await page.fill('input[placeholder="010-0000-0000"]', '010-9876-5432');
  await page.fill('input[type="password"]', '1234');
  await shot(page, path.join(ADMIN_DIR, '07-02-test-equipment.png'));

  // ─── 02-01: 기자재 신청 목록 ─────────────────────────────────
  console.log('\n📸 [02-01] 기자재 신청 목록');
  await page.goto(`${BASE_URL}/admin/requests?type=equipment`, { waitUntil: 'networkidle' });
  await shot(page, path.join(ADMIN_DIR, '02-01-requests-list.png'));

  // ─── 02-02: 신청 상세 (테이블 행이 곧 상세 내용) ─────────────
  console.log('\n📸 [02-02] 기자재 신청 상세 (대기 상태 필터)');
  await page.goto(`${BASE_URL}/admin/requests?type=equipment&status=pending`, { waitUntil: 'networkidle' });
  await shot(page, path.join(ADMIN_DIR, '02-02-requests-detail.png'));

  // ─── 02-03: 승인 모달 ────────────────────────────────────────
  console.log('\n📸 [02-03] 기자재 승인 모달');
  // 승인 버튼 클릭 (테이블 내 첫 번째 승인 버튼)
  const approveBtn = page.locator('td button:has-text("승인")').first();
  const approveBtnVisible = await approveBtn.isVisible({ timeout: 5000 }).catch(() => false);
  if (approveBtnVisible) {
    await approveBtn.click();
    await page.waitForTimeout(800);
    await shot(page, path.join(ADMIN_DIR, '02-03-requests-approve.png'));
    // 모달 닫기 (취소 버튼 또는 ESC)
    const cancelBtn = page.locator('button:has-text("취소")').first();
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(400);
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
  } else {
    console.log('  ! 승인 버튼 없음 — 기존 스크린샷 유지');
  }

  // ─── 02-04: 거절 모달 ────────────────────────────────────────
  console.log('\n📸 [02-04] 기자재 거절 모달');
  const rejectBtn = page.locator('td button:has-text("거절")').first();
  const rejectBtnVisible = await rejectBtn.isVisible({ timeout: 5000 }).catch(() => false);
  if (rejectBtnVisible) {
    await rejectBtn.click();
    await page.waitForTimeout(800);
    // 거절 사유 입력 (버튼 활성화를 위해)
    const noteArea = page.locator('textarea').last();
    if (await noteArea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noteArea.fill('재고 부족으로 인해 반려됩니다.');
    }
    await shot(page, path.join(ADMIN_DIR, '02-04-requests-reject.png'));
    // 모달 닫기
    const cancelBtn2 = page.locator('button:has-text("취소")').first();
    if (await cancelBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn2.click();
      await page.waitForTimeout(400);
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
  } else {
    console.log('  ! 거절 버튼 없음 — 기존 스크린샷 유지');
  }

  // ─── 03-02: 강의실 승인 모달 ─────────────────────────────────
  console.log('\n📸 [03-02] 강의실 승인 모달');
  await page.goto(`${BASE_URL}/admin/classroom`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 강의실 승인 버튼 (첫 번째 pending 신청)
  const classroomApproveBtn = page.locator('button:has-text("승인")').first();
  const classroomApproveBtnVisible = await classroomApproveBtn.isVisible({ timeout: 5000 }).catch(() => false);
  if (classroomApproveBtnVisible) {
    await classroomApproveBtn.click();
    await page.waitForTimeout(800);
    await shot(page, path.join(ADMIN_DIR, '03-02-classroom-approve.png'));
    // 닫기 (취소 또는 배경 클릭)
    const cancelBtn3 = page.locator('button:has-text("취소")').first();
    if (await cancelBtn3.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn3.click();
      await page.waitForTimeout(400);
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
  } else {
    console.log('  ! 강의실 승인 버튼 없음 — 기존 스크린샷 유지');
  }

  // ─── 06-01: 대여 이력 목록 ───────────────────────────────────
  console.log('\n📸 [06-01] 대여 이력 목록');
  await page.goto(`${BASE_URL}/admin/history`, { waitUntil: 'networkidle' });
  await shot(page, path.join(ADMIN_DIR, '06-01-history-list.png'));

  // ─── 06-02: 대여 이력 필터 적용 ──────────────────────────────
  console.log('\n📸 [06-02] 대여 이력 필터 (날짜 범위)');
  await page.goto(`${BASE_URL}/admin/history`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // 날짜 범위 입력 (오늘 날짜 기준)
  const dateInputs = page.locator('input[type="date"]');
  const dateCount = await dateInputs.count();
  if (dateCount >= 2) {
    await dateInputs.nth(0).fill('2026-06-01');
    await dateInputs.nth(1).fill('2026-06-30');
    console.log('  → 날짜 범위: 2026-06-01 ~ 2026-06-30');
    // 검색 버튼 클릭
    const searchBtn = page.locator('button:has-text("검색")').first();
    if (await searchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchBtn.click();
      await page.waitForTimeout(1200);
    }
  } else {
    console.log('  ! 날짜 입력 필드를 찾지 못함');
  }
  await shot(page, path.join(ADMIN_DIR, '06-02-history-filter.png'));

  await ctx.close();
  await browser.close();

  console.log('\n✅ 관리자 스크린샷 재캡쳐 완료!');
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
