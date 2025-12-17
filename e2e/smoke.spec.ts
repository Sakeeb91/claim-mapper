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
    // Use first() to handle multiple search inputs on the page
    await expect(page.locator('input[placeholder*="Search"]').first()).toBeVisible()
  })

  test('@smoke explore page loads and shows graph container', async ({ page }) => {
    await page.goto('/explore')
    await page.waitForSelector('svg', { timeout: 20000 })
    // Page may have multiple SVGs (graph + icons), just verify at least one exists
    const svgCount = await page.locator('svg').count()
    expect(svgCount).toBeGreaterThan(0)
  })
})
