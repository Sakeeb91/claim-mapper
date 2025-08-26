import { test, expect } from '@playwright/test'

// Minimal smoke checks that don’t rely on backend data or test IDs
test.describe('@smoke App smoke tests', () => {
  test('@smoke home page renders header', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('header', { timeout: 15000 })
    await expect(page.getByText('Claim Mapper')).toBeVisible()
  })

  test('@smoke search page loads', async ({ page }) => {
    await page.goto('/search')
    await page.waitForSelector('header', { timeout: 15000 })
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()
  })

  test('@smoke explore page loads and shows graph container', async ({ page }) => {
    await page.goto('/explore')
    await page.waitForSelector('svg', { timeout: 20000 })
    await expect(page.locator('svg')).toHaveCount(1)
  })
})
