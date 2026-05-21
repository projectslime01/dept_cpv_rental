import { test, expect } from '@playwright/test'

test.describe('기자재 목록', () => {
  test('메인 페이지에서 기자재 목록이 표시된다', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '기자재 대여 목록' })).toBeVisible()
    const cards = page.locator('a', { hasText: '상세 보기 / 신청' })
    await expect(cards.first()).toBeVisible()
  })

  test('카테고리 필터로 기자재를 걸러낼 수 있다', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('select[name="category"]')
    await page.selectOption('select[name="category"]', '카메라 바디')
    await page.getByRole('button', { name: '검색' }).click()
    await page.waitForURL('**/?**')
    const cards = page.locator('a', { hasText: '상세 보기 / 신청' })
    await expect(cards.first()).toBeVisible()
  })

  test('검색어로 기자재를 검색할 수 있다', async ({ page }) => {
    await page.goto('/')
    await page.locator('input[name="search"]').fill('소니')
    await page.getByRole('button', { name: '검색' }).click()
    const cards = page.locator('a', { hasText: '상세 보기 / 신청' })
    await expect(cards.first()).toBeVisible()
  })

  test('기자재 상세 페이지로 이동할 수 있다', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: '상세 보기 / 신청' }).first().click()
    await page.waitForURL('**/equipment/**')
    await expect(page.getByRole('button', { name: '재고 확인' })).toBeVisible()
  })

  test('헬스체크 API가 정상 응답한다', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.db).toBe('ok')
  })
})
