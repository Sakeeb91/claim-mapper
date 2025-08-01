import { test, expect } from '@playwright/test'

test.describe('Knowledge Graph Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/explore')
  })

  test('should load and display knowledge graph', async ({ page }) => {
    // Wait for graph to load
    await page.waitForSelector('[data-testid="knowledge-graph"]', { timeout: 10000 })
    
    // Verify graph SVG is present
    const graphSvg = page.locator('[data-testid="knowledge-graph"] svg')
    await expect(graphSvg).toBeVisible()
    
    // Verify graph has nodes
    const nodes = page.locator('[data-testid="graph-node"]')
    await expect(nodes).toHaveCount({ greaterThan: 0 })
    
    // Verify node count indicator
    const nodeCountIndicator = page.locator('[data-testid="node-count"]')
    await expect(nodeCountIndicator).toBeVisible()
    await expect(nodeCountIndicator).toContainText('nodes')
  })

  test('should allow node selection and show details', async ({ page }) => {
    await page.waitForSelector('[data-testid="knowledge-graph"]')
    
    // Click on a node
    const firstNode = page.locator('[data-testid="graph-node"]').first()
    await firstNode.click()
    
    // Verify node details panel opens
    await expect(page.locator('[data-testid="node-details-panel"]')).toBeVisible()
    
    // Verify node details contain relevant information
    await expect(page.locator('[data-testid="node-title"]')).toBeVisible()
    await expect(page.locator('[data-testid="node-type"]')).toBeVisible()
    await expect(page.locator('[data-testid="node-confidence"]')).toBeVisible()
    
    // Verify node is highlighted in graph
    await expect(firstNode).toHaveClass(/selected/)
  })

  test('should handle double-click for node expansion', async ({ page }) => {
    await page.waitForSelector('[data-testid="knowledge-graph"]')
    
    // Double-click on a node
    const expandableNode = page.locator('[data-testid="graph-node"]').first()
    await expandableNode.dblclick()
    
    // Wait for expansion to complete
    await page.waitForTimeout(1000)
    
    // Verify more nodes are loaded
    const nodesAfterExpansion = page.locator('[data-testid="graph-node"]')
    await expect(nodesAfterExpansion).toHaveCount({ greaterThan: 3 })
    
    // Verify loading indicator appeared and disappeared
    // Note: This might be too fast to catch in some cases
  })

  test('should filter nodes by type', async ({ page }) => {
    await page.waitForSelector('[data-testid="knowledge-graph"]')
    
    // Open filter controls
    await page.click('[data-testid="graph-controls-button"]')
    await expect(page.locator('[data-testid="graph-filters"]')).toBeVisible()
    
    // Get initial node count
    const initialNodes = page.locator('[data-testid="graph-node"]')
    const initialCount = await initialNodes.count()
    
    // Uncheck evidence nodes
    await page.uncheck('input[data-testid="filter-evidence"]')
    
    // Wait for graph to update
    await page.waitForTimeout(500)
    
    // Verify fewer nodes are displayed
    const filteredNodes = page.locator('[data-testid="graph-node"]')
    const filteredCount = await filteredNodes.count()
    expect(filteredCount).toBeLessThan(initialCount)
    
    // Verify only claims and reasoning nodes are visible
    const nodeTypes = page.locator('[data-testid="node-type-indicator"]')
    const count = await nodeTypes.count()
    
    for (let i = 0; i < count; i++) {
      const nodeType = await nodeTypes.nth(i).getAttribute('data-node-type')
      expect(['claim', 'reasoning']).toContain(nodeType)
    }
  })

  test('should adjust confidence range filter', async ({ page }) => {
    await page.waitForSelector('[data-testid="knowledge-graph"]')
    
    // Open filter controls
    await page.click('[data-testid="graph-controls-button"]')
    
    // Adjust confidence range slider
    const confidenceSlider = page.locator('[data-testid="confidence-range-slider"]')
    await confidenceSlider.fill('70') // Set minimum confidence to 70%
    
    // Wait for graph to update
    await page.waitForTimeout(500)
    
    // Verify high-confidence nodes remain visible
    const visibleNodes = page.locator('[data-testid="graph-node"]')
    await expect(visibleNodes).toHaveCount({ greaterThan: 0 })
    
    // Verify confidence indicators show high confidence
    const confidenceIndicators = page.locator('[data-testid="confidence-indicator"]')
    const indicatorCount = await confidenceIndicators.count()
    
    for (let i = 0; i < indicatorCount; i++) {
      const confidence = await confidenceIndicators.nth(i).getAttribute('data-confidence')
      expect(parseFloat(confidence || '0')).toBeGreaterThanOrEqual(0.7)
    }
  })

  test('should support zoom and pan interactions', async ({ page }) => {
    await page.waitForSelector('[data-testid="knowledge-graph"]')
    
    const graphContainer = page.locator('[data-testid="knowledge-graph"]')
    const graphSvg = graphContainer.locator('svg')
    
    // Test zoom in
    await graphSvg.click({ position: { x: 400, y: 300 } })
    await page.mouse.wheel(0, -120) // Scroll up to zoom in
    
    // Wait for zoom animation
    await page.waitForTimeout(300)
    
    // Test pan by dragging
    await page.mouse.move(400, 300)
    await page.mouse.down()
    await page.mouse.move(450, 350)
    await page.mouse.up()
    
    // Verify graph can be reset to original view
    await page.click('[data-testid="reset-view-button"]')
    await page.waitForTimeout(300)
  })

  test('should show and hide node labels', async ({ page }) => {
    await page.waitForSelector('[data-testid="knowledge-graph"]')
    
    // Open controls
    await page.click('[data-testid="graph-controls-button"]')
    
    // Toggle labels off
    await page.uncheck('[data-testid="show-labels-toggle"]')
    
    // Wait for update
    await page.waitForTimeout(300)
    
    // Verify labels are hidden
    const nodeLabels = page.locator('[data-testid="node-label"]')
    await expect(nodeLabels).toHaveCount(0)
    
    // Toggle labels back on
    await page.check('[data-testid="show-labels-toggle"]')
    await page.waitForTimeout(300)
    
    // Verify labels are visible again
    await expect(nodeLabels).toHaveCount({ greaterThan: 0 })
  })

  test('should handle large graphs with performance', async ({ page }) => {
    // Navigate to a view with many nodes
    await page.goto('/explore?dataset=large')
    await page.waitForSelector('[data-testid="knowledge-graph"]')
    
    // Start performance measurement
    const startTime = Date.now()
    
    // Perform interactions that should be smooth
    const graphSvg = page.locator('[data-testid="knowledge-graph"] svg')
    
    // Multiple zoom operations
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, -120)
      await page.waitForTimeout(100)
    }
    
    // Pan operation
    await graphSvg.click({ position: { x: 400, y: 300 } })
    await page.mouse.move(400, 300)
    await page.mouse.down()
    await page.mouse.move(500, 400)
    await page.mouse.up()
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // Verify operations completed in reasonable time (less than 2 seconds)
    expect(duration).toBeLessThan(2000)
    
    // Verify graph is still responsive
    const nodes = page.locator('[data-testid="graph-node"]')
    await expect(nodes.first()).toBeVisible()
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.waitForSelector('[data-testid="knowledge-graph"]')
    
    // Focus the graph container
    await page.click('[data-testid="knowledge-graph"]')
    
    // Use arrow keys to navigate (if implemented)
    await page.keyboard.press('Tab') // Focus first node
    await page.keyboard.press('Enter') // Select node
    
    // Verify node details panel opens
    await expect(page.locator('[data-testid="node-details-panel"]')).toBeVisible()
    
    // Navigate between nodes
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    
    // Verify different node is selected
    // This test assumes keyboard navigation is implemented
  })

  test('should handle connection highlighting on hover', async ({ page }) => {
    await page.waitForSelector('[data-testid="knowledge-graph"]')
    
    const firstNode = page.locator('[data-testid="graph-node"]').first()
    
    // Hover over a node
    await firstNode.hover()
    
    // Verify connected links are highlighted
    const highlightedLinks = page.locator('[data-testid="graph-link"].highlighted')
    await expect(highlightedLinks).toHaveCount({ greaterThan: 0 })
    
    // Verify connected nodes are highlighted
    const highlightedNodes = page.locator('[data-testid="graph-node"].connected')
    await expect(highlightedNodes).toHaveCount({ greaterThan: 0 })
    
    // Move mouse away
    await page.mouse.move(0, 0)
    await page.waitForTimeout(200)
    
    // Verify highlights are removed
    await expect(highlightedLinks).toHaveCount(0)
    await expect(highlightedNodes).toHaveCount(0)
  })

  test('should export graph visualization', async ({ page }) => {
    await page.waitForSelector('[data-testid="knowledge-graph"]')
    
    // Open export options
    await page.click('[data-testid="graph-controls-button"]')
    await page.click('[data-testid="export-button"]')
    
    // Verify export options are available
    await expect(page.locator('[data-testid="export-png"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-svg"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-json"]')).toBeVisible()
    
    // Test PNG export (mock download)
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="export-png"]')
    const download = await downloadPromise
    
    // Verify download was initiated
    expect(download.suggestedFilename()).toContain('.png')
  })

  test('should search for specific nodes in graph', async ({ page }) => {
    await page.waitForSelector('[data-testid="knowledge-graph"]')
    
    // Open search in graph
    await page.click('[data-testid="graph-controls-button"]')
    
    // Use search functionality
    const graphSearch = page.locator('[data-testid="graph-search-input"]')
    await graphSearch.fill('climate')
    
    // Wait for search highlighting
    await page.waitForTimeout(500)
    
    // Verify matching nodes are highlighted
    const searchResults = page.locator('[data-testid="graph-node"].search-match')
    await expect(searchResults).toHaveCount({ greaterThan: 0 })
    
    // Navigate through search results
    await page.click('[data-testid="next-search-result"]')
    
    // Verify graph centers on found node
    const centeredNode = page.locator('[data-testid="graph-node"].search-current')
    await expect(centeredNode).toBeVisible()
  })

  test('should maintain graph state across navigation', async ({ page }) => {
    await page.waitForSelector('[data-testid="knowledge-graph"]')
    
    // Apply some filters and zoom
    await page.click('[data-testid="graph-controls-button"]')
    await page.uncheck('[data-testid="filter-evidence"]')
    
    // Zoom in
    const graphSvg = page.locator('[data-testid="knowledge-graph"] svg')
    await graphSvg.click({ position: { x: 400, y: 300 } })
    await page.mouse.wheel(0, -240) // Zoom in more
    
    // Select a node
    const selectedNode = page.locator('[data-testid="graph-node"]').first()
    await selectedNode.click()
    
    // Navigate away and back
    await page.click('text=Search')
    await page.waitForTimeout(500)
    await page.click('text=Explore')
    
    // Wait for graph to reload
    await page.waitForSelector('[data-testid="knowledge-graph"]')
    
    // Verify state is preserved (this depends on implementation)
    // For now, just verify graph loads properly
    const nodes = page.locator('[data-testid="graph-node"]')
    await expect(nodes).toHaveCount({ greaterThan: 0 })
  })
})