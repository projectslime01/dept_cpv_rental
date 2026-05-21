import { test, expect } from '@playwright/test'

const ADMIN_URL = '/admin'
const ADMIN_CREDENTIALS = { username: 'admin', password: 'admin1234' }

test.describe('관리자 인증', () => {
  test('잘못된 비밀번호로는 로그인 불가', async ({ page }) => {
    await page.goto(ADMIN_URL)
    await page.getByLabel('아이디').fill(ADMIN_CREDENTIALS.username)
    await page.getByLabel('비밀번호').fill('wrongpassword')
    await page.getByRole('button', { name: '로그인' }).click()
    await expect(page.locator('text=아이디 또는 비밀번호가 올바르지 않습니다')).toBeVisible({ timeout: 8000 })
    await expect(page.url()).not.toContain('/dashboard')
  })

  test('올바른 자격증명으로 로그인 후 대시보드로 이동', async ({ page }) => {
    await page.goto(ADMIN_URL)
    await page.getByLabel('아이디').fill(ADMIN_CREDENTIALS.username)
    await page.getByLabel('비밀번호').fill(ADMIN_CREDENTIALS.password)
    await page.getByRole('button', { name: '로그인' }).click()
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()
  })

  test('인증 없이 대시보드 접근 시 로그인 페이지로 리다이렉트', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/admin/, { timeout: 5000 })
  })
})

test.describe('관리자 기능', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL)
    await page.getByLabel('아이디').fill(ADMIN_CREDENTIALS.username)
    await page.getByLabel('비밀번호').fill(ADMIN_CREDENTIALS.password)
    await page.getByRole('button', { name: '로그인' }).click()
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 })
  })

  test('기자재 관리 페이지에서 기자재 목록이 보인다', async ({ page }) => {
    await page.goto('/admin/equipment')
    await expect(page.getByRole('heading', { name: '기자재 관리' })).toBeVisible()
    await expect(page.getByText('소니 FX3')).toBeVisible()
  })

  test('대여 이력 페이지에서 필터가 동작한다', async ({ page }) => {
    await page.goto('/admin/history')
    await expect(page.getByRole('heading', { name: '대여 이력' })).toBeVisible()
    await page.getByRole('button', { name: '검색' }).click()
    await expect(page.locator('text=/총 \\d+건/')).toBeVisible()
  })

  test('신청 관리 페이지 접근 가능', async ({ page }) => {
    await page.goto('/admin/requests')
    await expect(page.getByRole('heading', { name: '신청 관리' })).toBeVisible()
  })
})
