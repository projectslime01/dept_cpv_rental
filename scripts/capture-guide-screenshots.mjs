/**
 * 가이드 스크린샷 자동 캡쳐 스크립트
 * 실행: node scripts/capture-guide-screenshots.mjs
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'http://localhost:3000';

const STUDENT_DIR = path.join(PROJECT_ROOT, 'public/guide/student');
const ADMIN_DIR = path.join(PROJECT_ROOT, 'public/guide/admin');

async function shot(page, filePath, options = {}) {
  const { waitFor = 1500, fullPage = false } = options;
  await page.waitForTimeout(waitFor);
  await page.screenshot({
    path: filePath,
    fullPage,
    clip: fullPage ? undefined : { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log('  ✓', path.basename(filePath));
}

async function main() {
  await mkdir(STUDENT_DIR, { recursive: true });
  await mkdir(ADMIN_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    // ═══════════════════════════════════════════════════════
    // 학생용 스크린샷
    // ═══════════════════════════════════════════════════════
    console.log('\n📸 학생용 스크린샷 캡쳐 시작');

    // 01-01: 기자재 목록
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await shot(page, path.join(STUDENT_DIR, '01-01-equipment-list.png'));

    // 기자재 상세 페이지 링크 가져오기
    const equipmentLinks = await page.$$eval('a[href^="/equipment/"]', links =>
      links.slice(0, 1).map(a => a.href)
    );
    // "상세 / 단건 신청" 버튼에서 링크 추출
    const equipDetailLinks = await page.$$eval('a[href*="/equipment/"]', links =>
      [...new Set(links.map(a => a.href).filter(h => h.includes('/equipment/') && !h.includes('/apply')))].slice(0, 1)
    );
    const equipUrl = equipDetailLinks[0] || `${BASE_URL}/equipment/1`;

    // 01-02: 기자재 상세
    await page.goto(equipUrl, { waitUntil: 'networkidle' });
    await shot(page, path.join(STUDENT_DIR, '01-02-equipment-detail.png'));

    // 01-03: 장바구니 담기 (기자재 목록으로 돌아가서 선택 → 장바구니)
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    // '선택' 버튼 클릭
    const selectBtn = await page.$('button:has-text("선택")');
    if (selectBtn) {
      await selectBtn.click();
      await page.waitForTimeout(500);
    }
    await shot(page, path.join(STUDENT_DIR, '01-03-add-to-cart.png'));

    // 01-04: 신청서 작성 페이지
    await page.goto(`${BASE_URL}/apply`, { waitUntil: 'networkidle' });
    await shot(page, path.join(STUDENT_DIR, '01-04-apply-form.png'));

    // 01-05: 신청 완료 (apply 페이지를 전체 화면으로 캡쳐 - 완료 상태 시뮬레이션은 어려워 apply 페이지 하단 표시)
    await page.goto(`${BASE_URL}/apply`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await shot(page, path.join(STUDENT_DIR, '01-05-apply-complete.png'), { waitFor: 800 });

    // 02-01: 강의실 목록
    await page.goto(`${BASE_URL}/classrooms`, { waitUntil: 'networkidle' });
    await shot(page, path.join(STUDENT_DIR, '02-01-classroom-list.png'));

    // 강의실 상세 링크
    const classroomLinks = await page.$$eval('a[href*="/classrooms/"]', links =>
      [...new Set(links.map(a => a.href).filter(h => /\/classrooms\/\d+$/.test(h)))].slice(0, 1)
    );
    const classroomUrl = classroomLinks[0] || `${BASE_URL}/classrooms/1`;

    // 02-02: 강의실 상세
    await page.goto(classroomUrl, { waitUntil: 'networkidle' });
    await shot(page, path.join(STUDENT_DIR, '02-02-classroom-detail.png'));

    // 02-03: 강의실 신청서
    const classroomApplyUrl = classroomUrl.replace(/\/$/, '') + '/apply';
    await page.goto(classroomApplyUrl, { waitUntil: 'networkidle' });
    await shot(page, path.join(STUDENT_DIR, '02-03-classroom-apply.png'));

    // 02-04: 강의실 신청 완료 (신청서 하단 표시)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await shot(page, path.join(STUDENT_DIR, '02-04-classroom-complete.png'), { waitFor: 800 });

    // 03-01: 신청 조회 페이지
    await page.goto(`${BASE_URL}/status`, { waitUntil: 'networkidle' });
    await shot(page, path.join(STUDENT_DIR, '03-01-status-page.png'));

    // 03-02: 신청번호 입력 화면 (폼이 있는 상태)
    await shot(page, path.join(STUDENT_DIR, '03-02-status-input.png'), { waitFor: 500 });

    // 03-03: 신청 결과 (빈 결과 또는 에러 상태)
    const searchBtn = await page.$('button[type="submit"]');
    if (searchBtn) {
      const input = await page.$('input[name="requestNumber"], input[placeholder*="신청번호"]');
      if (input) {
        await input.fill('TEST-0000');
        await searchBtn.click();
        await page.waitForTimeout(1000);
      }
    }
    await shot(page, path.join(STUDENT_DIR, '03-03-status-result.png'), { waitFor: 800 });

    // 04-01: 전체 대여 현황
    await page.goto(`${BASE_URL}/rental-status`, { waitUntil: 'networkidle' });
    await shot(page, path.join(STUDENT_DIR, '04-01-rental-status.png'), { waitFor: 2000 });

    // 04-02: 캘린더 날짜 선택 후
    const dayCell = await page.$('button[aria-label], td[data-date], .calendar-day, [class*="day"]');
    if (dayCell) {
      await dayCell.click();
      await page.waitForTimeout(500);
    }
    await shot(page, path.join(STUDENT_DIR, '04-02-rental-calendar.png'), { waitFor: 800 });

    // ═══════════════════════════════════════════════════════
    // 관리자용 스크린샷 — 로그인 필요
    // ═══════════════════════════════════════════════════════
    console.log('\n📸 관리자 로그인 후 스크린샷 캡쳐');

    // 관리자 로그인
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // 로그인 폼 채우기
    const emailInput = await page.$('input[name="email"], input[type="email"]');
    const passwordInput = await page.$('input[name="password"], input[type="password"]');

    if (emailInput && passwordInput) {
      await emailInput.fill('admin@yeonsung.ac.kr');
      await passwordInput.fill('admin1234');
      const loginBtn = await page.$('button[type="submit"]');
      if (loginBtn) {
        await loginBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    console.log('  로그인 완료');

    // 01-01: 관리자 대시보드 통계
    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
    await shot(page, path.join(ADMIN_DIR, '01-01-dashboard.png'), { waitFor: 1500 });

    // 01-02: 대시보드 하단 (최근 신청)
    await page.evaluate(() => window.scrollTo(0, 400));
    await shot(page, path.join(ADMIN_DIR, '01-02-dashboard-requests.png'), { waitFor: 800 });

    // 02-01: 기자재 신청 목록
    await page.goto(`${BASE_URL}/admin/requests`, { waitUntil: 'networkidle' });
    await shot(page, path.join(ADMIN_DIR, '02-01-requests-list.png'), { waitFor: 1000 });

    // 02-02: 신청 상세 (첫 번째 항목 펼치기 시도)
    const expandBtn = await page.$('[data-state="closed"], button[aria-expanded="false"], .accordion-trigger');
    if (expandBtn) {
      await expandBtn.click();
      await page.waitForTimeout(500);
    }
    await shot(page, path.join(ADMIN_DIR, '02-02-requests-detail.png'), { waitFor: 800 });

    // 02-03, 02-04: 승인/반려 버튼이 있는 상태
    await shot(page, path.join(ADMIN_DIR, '02-03-requests-approve.png'), { waitFor: 500 });
    await shot(page, path.join(ADMIN_DIR, '02-04-requests-reject.png'), { waitFor: 500 });

    // 03-01: 강의실 신청 목록
    await page.goto(`${BASE_URL}/admin/classroom`, { waitUntil: 'networkidle' });
    await shot(page, path.join(ADMIN_DIR, '03-01-classroom-requests.png'), { waitFor: 1000 });

    // 03-02: 강의실 승인 처리 화면
    await shot(page, path.join(ADMIN_DIR, '03-02-classroom-approve.png'), { waitFor: 500 });

    // 04-01: 기자재 목록
    await page.goto(`${BASE_URL}/admin/equipment`, { waitUntil: 'networkidle' });
    await shot(page, path.join(ADMIN_DIR, '04-01-equipment-list.png'), { waitFor: 1000 });

    // 04-02: 기자재 추가 폼 (폼이 있으면 열기)
    const addEquipBtn = await page.$('button:has-text("추가"), button:has-text("등록"), button:has-text("기자재 추가")');
    if (addEquipBtn) {
      await addEquipBtn.click();
      await page.waitForTimeout(500);
    }
    await shot(page, path.join(ADMIN_DIR, '04-02-equipment-add.png'), { waitFor: 800 });

    // 04-03: 기자재 수정 폼
    await page.goto(`${BASE_URL}/admin/equipment`, { waitUntil: 'networkidle' });
    const editBtn = await page.$('button:has-text("수정"), button:has-text("편집")');
    if (editBtn) {
      await editBtn.click();
      await page.waitForTimeout(500);
    }
    await shot(page, path.join(ADMIN_DIR, '04-03-equipment-edit.png'), { waitFor: 800 });

    // 04-04: 부속 기자재 관리 (첫 번째 기자재의 부속 페이지)
    const accessoryLinks = await page.$$eval('a[href*="/accessories"]', links =>
      links.slice(0, 1).map(a => a.href)
    );
    if (accessoryLinks[0]) {
      await page.goto(accessoryLinks[0], { waitUntil: 'networkidle' });
    } else {
      await page.goto(`${BASE_URL}/admin/equipment/1/accessories`, { waitUntil: 'networkidle' });
    }
    await shot(page, path.join(ADMIN_DIR, '04-04-equipment-accessory.png'), { waitFor: 1000 });

    // 05-01: 강의실 목록
    await page.goto(`${BASE_URL}/admin/classrooms`, { waitUntil: 'networkidle' });
    await shot(page, path.join(ADMIN_DIR, '05-01-classrooms-list.png'), { waitFor: 1000 });

    // 05-02: 강의실 추가 폼
    const addClassroomBtn = await page.$('button:has-text("추가"), button:has-text("강의실 추가"), button:has-text("등록")');
    if (addClassroomBtn) {
      await addClassroomBtn.click();
      await page.waitForTimeout(500);
    }
    await shot(page, path.join(ADMIN_DIR, '05-02-classrooms-add.png'), { waitFor: 800 });

    // 05-03: 시간표 설정
    const timetableLinks = await page.$$eval('a[href*="/timetable"]', links =>
      links.slice(0, 1).map(a => a.href)
    );
    if (timetableLinks[0]) {
      await page.goto(timetableLinks[0], { waitUntil: 'networkidle' });
    } else {
      await page.goto(`${BASE_URL}/admin/classrooms/1/timetable`, { waitUntil: 'networkidle' });
    }
    await shot(page, path.join(ADMIN_DIR, '05-03-classrooms-timetable.png'), { waitFor: 1000 });

    // 06-01: 대여 이력
    await page.goto(`${BASE_URL}/admin/history`, { waitUntil: 'networkidle' });
    await shot(page, path.join(ADMIN_DIR, '06-01-history-list.png'), { waitFor: 1000 });

    // 06-02: 이력 필터 (필터 UI 표시)
    await shot(page, path.join(ADMIN_DIR, '06-02-history-filter.png'), { waitFor: 500 });

    // 07-01: 테스트 신청 페이지
    await page.goto(`${BASE_URL}/admin/test-request`, { waitUntil: 'networkidle' });
    await shot(page, path.join(ADMIN_DIR, '07-01-test-request.png'), { waitFor: 1000 });

    // 07-02: 기자재 탭 (기본 탭)
    await shot(page, path.join(ADMIN_DIR, '07-02-test-equipment.png'), { waitFor: 500 });

    // 07-03: 강의실 탭
    const classroomTab = await page.$('button:has-text("강의실")');
    if (classroomTab) {
      await classroomTab.click();
      await page.waitForTimeout(500);
    }
    await shot(page, path.join(ADMIN_DIR, '07-03-test-classroom.png'), { waitFor: 800 });

    console.log('\n✅ 스크린샷 캡쳐 완료!');
    console.log(`  학생용: ${STUDENT_DIR}`);
    console.log(`  관리자용: ${ADMIN_DIR}`);

  } catch (error) {
    console.error('❌ 오류:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
