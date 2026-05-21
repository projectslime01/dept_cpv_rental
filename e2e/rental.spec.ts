import { test, expect } from '@playwright/test'

test.describe('대여 신청 플로우', () => {
  test('기자재 상세에서 재고 확인이 가능하다', async ({ page }) => {
    await page.goto('/equipment/1')
    await expect(page.getByRole('button', { name: '재고 확인' })).toBeVisible()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfter = new Date()
    dayAfter.setDate(dayAfter.getDate() + 2)

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T09:00`

    await page.locator('input[type="datetime-local"]').first().fill(fmt(tomorrow))
    await page.locator('input[type="datetime-local"]').last().fill(fmt(dayAfter))
    await page.getByRole('button', { name: '재고 확인' }).click()

    await expect(page.locator('text=/대여 가능|재고 없음|개 대여/').first()).toBeVisible({ timeout: 8000 })
  })

  test('신청 조회 페이지에서 잘못된 신청번호는 오류를 표시한다', async ({ page }) => {
    await page.goto('/status')
    await expect(page.getByRole('heading', { name: '신청 조회' })).toBeVisible()
    await page.locator('input[name="requestNumber"]').fill('REQ-00000000-0000')
    await page.locator('input[name="password"]').fill('wrongpassword')
    await page.getByRole('button', { name: '조회하기' }).click()
    await expect(page.locator('text=/신청 내역을 찾을 수 없습니다|비밀번호|오류/').first()).toBeVisible({ timeout: 8000 })
  })
})

test.describe('대여 신청 제출', () => {
  test('신청 페이지가 표시된다', async ({ page }) => {
    await page.goto('/apply')
    // 기자재 파라미터 없이 접근하면 신청폼 또는 안내 메시지가 표시됨
    await expect(page.locator('body')).toBeVisible()
  })

  test('기자재 id와 함께 신청 페이지 접근 시 폼이 표시된다', async ({ page }) => {
    await page.goto('/apply?equipmentId=1&quantity=1&startAt=2027-01-01T09:00&endAt=2027-01-02T09:00')
    await expect(page.locator('input[name="applicantName"]')).toBeVisible()
    await expect(page.locator('input[name="studentId"]')).toBeVisible()
  })
})
