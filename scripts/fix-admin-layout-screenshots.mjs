/**
 * 관리자 가이드 스크린샷 재캡쳐 — 전체 레이아웃(사이드바) 버전
 * 실행: node scripts/fix-admin-layout-screenshots.mjs
 *
 * 수정 대상 (원본이 모바일/좁은 뷰로 캡쳐된 파일):
 *   01-01-dashboard.png
 *   01-02-dashboard-requests.png
 *   03-01-classroom-requests.png
 *   04-01-equipment-list.png
 *   04-02-equipment-add.png
 *   04-03-equipment-edit.png
 *   04-04-equipment-accessory.png
 *   05-01-classrooms-list.png
 *   05-02-classrooms-add.png
 *   05-03-classrooms-timetable.png
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'http://localhost:3000';
const ADMIN_DIR = path.join(PROJECT_ROOT, 'public/guide/admin');

// Equipment: 소니 A7M4 = ID 2 (첫 번째 accessory link)
// Classroom: 402호 = ID 5 (첫 번째 timetable link)
const EQUIP_A7M4_ID = 2;
const CLASSROOM_402_ID = 5;

async function shot(page, filePath, waitFor = 1200) {
  await page.waitForTimeout(waitFor);
  await page.screenshot({
    path: filePath,
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log('  ✓', path.basename(filePath));
}

async function main() {
  await mkdir(ADMIN_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // ─── 관리자 로그인 ─────────────────────────────────────────
  console.log('\n🔑 관리자 로그인');
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin1234');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
  await page.waitForTimeout(800);
  console.log('  → 로그인 완료');

  // ─── 01-01: 대시보드 통계 카드 ────────────────────────────
  console.log('\n📸 [01-01] 대시보드');
  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
  await shot(page, path.join(ADMIN_DIR, '01-01-dashboard.png'));

  // ─── 01-02: 대시보드 기자재 수량 현황 (스크롤 다운) ────────
  console.log('\n📸 [01-02] 대시보드 하단 기자재 수량 현황');
  await page.evaluate(() => window.scrollTo(0, 500));
  await shot(page, path.join(ADMIN_DIR, '01-02-dashboard-requests.png'));

  // ─── 03-01: 강의실 신청 목록 ──────────────────────────────
  console.log('\n📸 [03-01] 강의실 신청 목록');
  await page.goto(`${BASE_URL}/admin/classroom`, { waitUntil: 'networkidle' });
  await shot(page, path.join(ADMIN_DIR, '03-01-classroom-requests.png'));

  // ─── 04-01: 기자재 목록 ───────────────────────────────────
  console.log('\n📸 [04-01] 기자재 목록');
  await page.goto(`${BASE_URL}/admin/equipment`, { waitUntil: 'networkidle' });
  await shot(page, path.join(ADMIN_DIR, '04-01-equipment-list.png'));

  // ─── 04-02: 기자재 추가 모달 ──────────────────────────────
  console.log('\n📸 [04-02] 기자재 추가 모달');
  const addBtn = page.locator('button:has-text("기자재 추가")').first();
  await addBtn.click();
  await page.waitForTimeout(600);
  await shot(page, path.join(ADMIN_DIR, '04-02-equipment-add.png'));
  // 모달 닫기
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // ─── 04-03: 기자재 수정 모달 (소니 A7M4) ──────────────────
  console.log('\n📸 [04-03] 기자재 수정 모달');
  // 소니 A7M4 행의 수정 버튼 클릭
  const a7m4Row = page.locator('tr, div').filter({ hasText: '소니 A7M4' }).first();
  const editBtn = a7m4Row.locator('button:has-text("수정")').first();
  const editBtnVisible = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (editBtnVisible) {
    await editBtn.click();
    await page.waitForTimeout(600);
    await shot(page, path.join(ADMIN_DIR, '04-03-equipment-edit.png'));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  } else {
    // 소니 A7M4 행 전체 탐색
    const allEditBtns = page.locator('button:has-text("수정")');
    const cnt = await allEditBtns.count();
    if (cnt > 0) {
      await allEditBtns.first().click();
      await page.waitForTimeout(600);
      await shot(page, path.join(ADMIN_DIR, '04-03-equipment-edit.png'));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    } else {
      console.log('  ! 수정 버튼 없음');
    }
  }

  // ─── 04-04: 부속 기자재 관리 (소니 A7M4) ──────────────────
  console.log('\n📸 [04-04] 부속 기자재 관리');
  await page.goto(`${BASE_URL}/admin/equipment/${EQUIP_A7M4_ID}/accessories`, { waitUntil: 'networkidle' });
  await shot(page, path.join(ADMIN_DIR, '04-04-equipment-accessory.png'));

  // ─── 05-01: 강의실 목록 ───────────────────────────────────
  console.log('\n📸 [05-01] 강의실 목록');
  await page.goto(`${BASE_URL}/admin/classrooms`, { waitUntil: 'networkidle' });
  await shot(page, path.join(ADMIN_DIR, '05-01-classrooms-list.png'));

  // ─── 05-02: 강의실 추가 모달 ──────────────────────────────
  console.log('\n📸 [05-02] 강의실 추가 모달');
  const addClassBtn = page.locator('button:has-text("강의실 추가")').first();
  await addClassBtn.click();
  await page.waitForTimeout(600);
  await shot(page, path.join(ADMIN_DIR, '05-02-classrooms-add.png'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // ─── 05-03: 강의실 시간표 설정 (402호) ────────────────────
  console.log('\n📸 [05-03] 강의실 시간표 설정');
  await page.goto(`${BASE_URL}/admin/classrooms/${CLASSROOM_402_ID}/timetable`, { waitUntil: 'networkidle' });
  await shot(page, path.join(ADMIN_DIR, '05-03-classrooms-timetable.png'));

  await ctx.close();
  await browser.close();

  console.log('\n✅ 관리자 레이아웃 스크린샷 재캡쳐 완료!');
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
