import { test, expect } from '@playwright/test'

// Minimal smoke checks that don’t rely on backend data or test IDs
test.describe('@smoke App smoke tests', () => {
  test('home page renders header', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header')).toBeVisible()
    await expect(page.locator('text=Claim Mapper')).toBeVisible()
  })

  test('search page loads', async ({ page }) => {
    await page.goto('/search')
    // Header is present and global search input exists
    await expect(page.locator('header')).toBeVisible()
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()
  })

  test('explore page loads and shows graph container', async ({ page }) => {
    await page.goto('/explore')
    await expect(page.locator('svg')).toBeVisible({ timeout: 5000 })
  })
})

