import { test, expect } from '@playwright/test'

test.describe('Search Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should perform basic search and display results', async ({ page }) => {
    // Navigate to search page
    await page.click('text=Search')
    await expect(page).toHaveURL('/search')

    // Enter search query
    const searchInput = page.locator('input[placeholder*="Search claims"]')
    await searchInput.fill('climate change')

    // Submit search
    await searchInput.press('Enter')

    // Wait for results to load
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 })

    // Verify results are displayed
    const results = page.locator('[data-testid="search-result-item"]')
    await expect(results).toHaveCount({ greaterThan: 0 })

    // Verify search query is preserved
    await expect(searchInput).toHaveValue('climate change')
  })

  test('should show search suggestions while typing', async ({ page }) => {
    await page.click('text=Search')
    
    const searchInput = page.locator('input[placeholder*="Search claims"]')
    await searchInput.click()
    
    // Start typing to trigger suggestions
    await searchInput.type('climate', { delay: 100 })
    
    // Wait for suggestions to appear
    await page.waitForSelector('[data-testid="search-suggestions"]', { timeout: 5000 })
    
    // Verify suggestions are displayed
    const suggestions = page.locator('[data-testid="suggestion-item"]')
    await expect(suggestions).toHaveCount({ greaterThan: 0 })
    
    // Click on a suggestion
    await suggestions.first().click()
    
    // Verify search is performed with selected suggestion
    await page.waitForSelector('[data-testid="search-results"]')
  })

  test('should filter search results by content type', async ({ page }) => {
    await page.click('text=Search')
    
    // Perform initial search
    const searchInput = page.locator('input[placeholder*="Search claims"]')
    await searchInput.fill('climate change')
    await searchInput.press('Enter')
    
    // Wait for initial results
    await page.waitForSelector('[data-testid="search-results"]')
    
    // Open filters
    await page.click('button[aria-label*="Advanced search"]')
    
    // Wait for filter panel
    await page.waitForSelector('[data-testid="search-filters"]')
    
    // Select only claims filter
    await page.uncheck('input[value="evidence"]')
    await page.uncheck('input[value="reasoning"]')
    await page.check('input[value="claim"]')
    
    // Apply filters
    await page.click('button:has-text("Apply Filters")')
    
    // Wait for filtered results
    await page.waitForSelector('[data-testid="search-results"]')
    
    // Verify only claims are shown
    const resultTypes = page.locator('[data-testid="result-type"]')
    const count = await resultTypes.count()
    
    for (let i = 0; i < count; i++) {
      await expect(resultTypes.nth(i)).toHaveText('claim')
    }
  })

  test('should enable semantic search and show different results', async ({ page }) => {
    await page.click('text=Search')
    
    const searchInput = page.locator('input[placeholder*="Search claims"]')
    await searchInput.fill('global warming')
    
    // Perform regular search first
    await searchInput.press('Enter')
    await page.waitForSelector('[data-testid="search-results"]')
    
    // Store initial results count
    const initialResults = page.locator('[data-testid="search-result-item"]')
    const initialCount = await initialResults.count()
    
    // Enable semantic search
    await page.click('button[aria-label*="Semantic search"]')
    
    // Verify semantic search is enabled
    await expect(page.locator('button[aria-label*="Semantic search enabled"]')).toBeVisible()
    
    // Perform semantic search
    await searchInput.press('Enter')
    await page.waitForSelector('[data-testid="search-results"]')
    
    // Verify results may be different (semantic search can return different relevance)
    const semanticResults = page.locator('[data-testid="search-result-item"]')
    await expect(semanticResults).toHaveCount({ greaterThan: 0 })
  })

  test('should save and load search queries', async ({ page }) => {
    await page.click('text=Search')
    
    // Perform a search
    const searchInput = page.locator('input[placeholder*="Search claims"]')
    await searchInput.fill('renewable energy')
    await searchInput.press('Enter')
    
    // Wait for results
    await page.waitForSelector('[data-testid="search-results"]')
    
    // Save the search
    await page.click('button[aria-label*="Save search"]')
    
    // Fill in save dialog
    await page.fill('input[placeholder*="Search name"]', 'Renewable Energy Research')
    await page.fill('textarea[placeholder*="Description"]', 'Research on renewable energy sources')
    await page.click('button:has-text("Save")')
    
    // Verify success message
    await expect(page.locator('text=Search saved successfully')).toBeVisible()
    
    // Navigate to saved searches
    await page.click('button[aria-label*="Saved searches"]')
    
    // Verify saved search appears
    await expect(page.locator('text=Renewable Energy Research')).toBeVisible()
    
    // Load saved search
    await page.click('text=Renewable Energy Research')
    
    // Verify search is loaded
    await expect(searchInput).toHaveValue('renewable energy')
    await page.waitForSelector('[data-testid="search-results"]')
  })

  test('should handle empty search results gracefully', async ({ page }) => {
    await page.click('text=Search')
    
    // Search for something that likely won't have results
    const searchInput = page.locator('input[placeholder*="Search claims"]')
    await searchInput.fill('xyzunlikelyquerythatshouldhavenoResults123')
    await searchInput.press('Enter')
    
    // Wait for search to complete
    await page.waitForTimeout(2000)
    
    // Verify empty state is shown
    await expect(page.locator('text=No results found')).toBeVisible()
    await expect(page.locator('text=Try adjusting your search terms')).toBeVisible()
    
    // Verify suggestions for improving search
    await expect(page.locator('[data-testid="search-suggestions-empty"]')).toBeVisible()
  })

  test('should show search history', async ({ page }) => {
    await page.click('text=Search')
    
    const searchInput = page.locator('input[placeholder*="Search claims"]')
    
    // Perform several searches to build history
    const searchTerms = ['climate change', 'renewable energy', 'carbon emissions']
    
    for (const term of searchTerms) {
      await searchInput.fill(term)
      await searchInput.press('Enter')
      await page.waitForTimeout(1000)
      await searchInput.clear()
    }
    
    // Click in search input to show suggestions
    await searchInput.click()
    
    // Wait for suggestions/history to appear
    await page.waitForSelector('[data-testid="search-suggestions"]')
    
    // Verify recent searches are shown
    await expect(page.locator('text=Recent')).toBeVisible()
    
    // Check that our search terms appear in history
    for (const term of searchTerms.slice(-3)) { // Last 3 searches
      await expect(page.locator(`text=${term}`)).toBeVisible()
    }
    
    // Click on a recent search
    await page.click(`text=${searchTerms[0]}`)
    
    // Verify search is performed
    await expect(searchInput).toHaveValue(searchTerms[0])
  })

  test('should handle search errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/search**', route => {
      route.abort('failed')
    })
    
    await page.click('text=Search')
    
    const searchInput = page.locator('input[placeholder*="Search claims"]')
    await searchInput.fill('test query')
    await searchInput.press('Enter')
    
    // Wait for error state
    await page.waitForTimeout(2000)
    
    // Verify error message is shown
    await expect(page.locator('text=Search failed')).toBeVisible()
    await expect(page.locator('text=Please try again')).toBeVisible()
    
    // Verify retry button is available
    await expect(page.locator('button:has-text("Retry")')).toBeVisible()
  })

  test('should be accessible with keyboard navigation', async ({ page }) => {
    await page.click('text=Search')
    
    const searchInput = page.locator('input[placeholder*="Search claims"]')
    
    // Focus search input with Tab
    await page.keyboard.press('Tab')
    await expect(searchInput).toBeFocused()
    
    // Type search query
    await page.keyboard.type('climate change')
    
    // Navigate suggestions with arrow keys
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowUp')
    
    // Select suggestion with Enter
    await page.keyboard.press('Enter')
    
    // Verify search was performed
    await page.waitForSelector('[data-testid="search-results"]')
  })

  test('should work correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.click('text=Search')
    
    // Search input should be responsive
    const searchInput = page.locator('input[placeholder*="Search claims"]')
    await expect(searchInput).toBeVisible()
    
    // Perform search
    await searchInput.fill('climate change')
    await searchInput.press('Enter')
    
    // Wait for results
    await page.waitForSelector('[data-testid="search-results"]')
    
    // Verify results are displayed properly on mobile
    const results = page.locator('[data-testid="search-result-item"]')
    await expect(results.first()).toBeVisible()
    
    // Test mobile-specific interactions
    await page.click('button[aria-label*="Filter"]')
    
    // Mobile filter panel should open
    await expect(page.locator('[data-testid="mobile-filter-panel"]')).toBeVisible()
  })
})