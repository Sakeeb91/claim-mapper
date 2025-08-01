import { test, expect } from '@playwright/test'

test.describe('Collaboration Features', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for testing
    await page.goto('/collaborate')
    await page.waitForLoadState('networkidle')
  })

  test('should load collaborative editor', async ({ page }) => {
    // Verify collaborative editor is present
    await expect(page.locator('[data-testid="collaborative-editor"]')).toBeVisible()
    
    // Verify editor toolbar
    await expect(page.locator('[data-testid="editor-toolbar"]')).toBeVisible()
    
    // Verify collaboration sidebar
    await expect(page.locator('[data-testid="collaboration-sidebar"]')).toBeVisible()
    
    // Verify active users panel
    await expect(page.locator('[data-testid="active-users"]')).toBeVisible()
  })

  test('should show active collaborators', async ({ page }) => {
    // Wait for collaboration features to load
    await page.waitForSelector('[data-testid="active-users"]')
    
    // Mock multiple users (this would normally come from WebSocket)
    await page.evaluate(() => {
      // Simulate receiving user presence updates
      window.dispatchEvent(new CustomEvent('user-joined', {
        detail: { userId: 'user2', name: 'Jane Smith', cursor: { x: 100, y: 200 } }
      }))
      window.dispatchEvent(new CustomEvent('user-joined', {
        detail: { userId: 'user3', name: 'Bob Johnson', cursor: { x: 300, y: 150 } }
      }))
    })
    
    await page.waitForTimeout(500)
    
    // Verify user avatars are displayed
    const userAvatars = page.locator('[data-testid="user-avatar"]')
    await expect(userAvatars).toHaveCount({ greaterThan: 0 })
    
    // Verify user names are shown
    await expect(page.locator('text=Jane Smith')).toBeVisible()
    await expect(page.locator('text=Bob Johnson')).toBeVisible()
  })

  test('should display real-time cursors', async ({ page }) => {
    // Simulate other users' cursor movements
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('cursor-moved', {
        detail: { 
          userId: 'user2', 
          name: 'Jane Smith',
          cursor: { x: 250, y: 180 },
          color: '#ff6b6b'
        }
      }))
    })
    
    await page.waitForTimeout(300)
    
    // Verify cursor is displayed
    const userCursor = page.locator('[data-testid="user-cursor"][data-user="user2"]')
    await expect(userCursor).toBeVisible()
    
    // Verify cursor label shows user name
    await expect(page.locator('[data-testid="cursor-label"]:has-text("Jane Smith")')).toBeVisible()
  })

  test('should handle real-time text editing', async ({ page }) => {
    const editor = page.locator('[data-testid="collaborative-editor"] [contenteditable]')
    
    // Type some text
    await editor.click()
    await editor.type('This is a collaborative claim about climate change.')
    
    // Simulate another user editing
    await page.evaluate(() => {
      // Mock receiving operational transform
      window.dispatchEvent(new CustomEvent('text-changed', {
        detail: {
          userId: 'user2',
          operation: {
            type: 'insert',
            position: 10,
            text: 'important ',
            author: 'Jane Smith'
          }
        }
      }))
    })
    
    await page.waitForTimeout(500)
    
    // Verify text was updated
    await expect(editor).toContainText('This is an important collaborative claim')
    
    // Verify change attribution
    const changeHighlight = page.locator('[data-testid="change-highlight"][data-author="Jane Smith"]')
    await expect(changeHighlight).toBeVisible()
  })

  test('should create and manage comments', async ({ page }) => {
    const editor = page.locator('[data-testid="collaborative-editor"]')
    
    // Select some text to comment on
    await editor.click()
    await editor.type('Climate change is a significant global challenge.')
    
    // Select "significant global challenge"
    await page.keyboard.down('Shift')
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('ArrowLeft')
    }
    await page.keyboard.up('Shift')
    
    // Right-click to open context menu
    await page.click('[data-testid="collaborative-editor"]', { button: 'right' })
    
    // Click "Add Comment"
    await page.click('text=Add Comment')
    
    // Fill in comment
    const commentBox = page.locator('[data-testid="comment-input"]')
    await commentBox.fill('Could we provide more specific examples of the impacts?')
    
    // Submit comment
    await page.click('[data-testid="submit-comment"]')
    
    // Verify comment appears in sidebar
    await expect(page.locator('[data-testid="comment-thread"]')).toBeVisible()
    await expect(page.locator('text=Could we provide more specific examples')).toBeVisible()
    
    // Verify comment indicator in text
    await expect(page.locator('[data-testid="comment-indicator"]')).toBeVisible()
  })

  test('should reply to comments', async ({ page }) => {
    // First create a comment (reusing logic from previous test)
    const editor = page.locator('[data-testid="collaborative-editor"]')
    await editor.click()
    await editor.type('Renewable energy is the future.')
    
    // Mock existing comment
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('comment-added', {
        detail: {
          id: 'comment1',
          text: 'What about nuclear energy?',
          author: 'Jane Smith',
          position: { start: 0, end: 15 },
          timestamp: new Date()
        }
      }))
    })
    
    await page.waitForTimeout(300)
    
    // Click on comment to expand thread
    await page.click('[data-testid="comment-indicator"]')
    
    // Reply to comment
    const replyInput = page.locator('[data-testid="reply-input"]')
    await replyInput.fill('Nuclear energy is also important, but renewable sources are more sustainable long-term.')
    
    await page.click('[data-testid="submit-reply"]')
    
    // Verify reply appears
    await expect(page.locator('[data-testid="comment-reply"]')).toBeVisible()
    await expect(page.locator('text=Nuclear energy is also important')).toBeVisible()
  })

  test('should resolve comments', async ({ page }) => {
    // Mock existing comment
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('comment-added', {
        detail: {
          id: 'comment1',
          text: 'This needs a citation.',
          author: 'Jane Smith',
          position: { start: 10, end: 25 },
          timestamp: new Date(),
          resolved: false
        }
      }))
    })
    
    await page.waitForTimeout(300)
    
    // Click on comment
    await page.click('[data-testid="comment-indicator"]')
    
    // Resolve comment
    await page.click('[data-testid="resolve-comment"]')
    
    // Verify comment is marked as resolved
    await expect(page.locator('[data-testid="comment-thread"].resolved')).toBeVisible()
    
    // Verify comment indicator is updated
    await expect(page.locator('[data-testid="comment-indicator"].resolved')).toBeVisible()
  })

  test('should show version history', async ({ page }) => {
    // Open version history
    await page.click('[data-testid="version-history-button"]')
    
    // Verify version history panel
    await expect(page.locator('[data-testid="version-history-panel"]')).toBeVisible()
    
    // Mock version history data
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('version-history-loaded', {
        detail: [
          {
            id: 'v1',
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            author: 'Current User',
            changes: ['Added initial claim'],
            content: 'Climate change is real.'
          },
          {
            id: 'v2', 
            timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
            author: 'Jane Smith',
            changes: ['Added supporting evidence'],
            content: 'Climate change is real and supported by scientific evidence.'
          }
        ]
      }))
    })
    
    await page.waitForTimeout(300)
    
    // Verify versions are listed
    const versionItems = page.locator('[data-testid="version-item"]')
    await expect(versionItems).toHaveCount(2)
    
    // Click on older version
    await versionItems.first().click()
    
    // Verify version preview
    await expect(page.locator('[data-testid="version-preview"]')).toBeVisible()
    await expect(page.locator('text=Climate change is real.')).toBeVisible()
  })

  test('should handle merge conflicts', async ({ page }) => {
    const editor = page.locator('[data-testid="collaborative-editor"] [contenteditable]')
    
    // Type some text
    await editor.click()
    await editor.type('The impact of climate change includes rising temperatures.')
    
    // Simulate conflict
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('merge-conflict', {
        detail: {
          conflictId: 'conflict1',
          localChange: 'The impact of climate change includes rising temperatures and sea levels.',
          remoteChange: 'The impact of climate change includes rising temperatures and extreme weather.',
          author: 'Jane Smith',
          position: { start: 45, end: 65 }
        }
      }))
    })
    
    await page.waitForTimeout(500)
    
    // Verify conflict resolution dialog
    await expect(page.locator('[data-testid="conflict-resolver"]')).toBeVisible()
    
    // Verify both versions are shown
    await expect(page.locator('text=and sea levels')).toBeVisible()
    await expect(page.locator('text=and extreme weather')).toBeVisible()
    
    // Choose remote version
    await page.click('[data-testid="accept-remote"]')
    
    // Verify conflict is resolved
    await expect(page.locator('[data-testid="conflict-resolver"]')).not.toBeVisible()
    await expect(editor).toContainText('and extreme weather')
  })

  test('should validate collaborative edits', async ({ page }) => {
    // Open validation panel
    await page.click('[data-testid="validation-panel-button"]')
    
    // Verify validation panel
    await expect(page.locator('[data-testid="validation-panel"]')).toBeVisible()
    
    // Type content that needs validation
    const editor = page.locator('[data-testid="collaborative-editor"] [contenteditable]')
    await editor.click()
    await editor.type('Climate change causes extreme weather patterns worldwide.')
    
    // Trigger validation
    await page.click('[data-testid="validate-content"]')
    
    await page.waitForTimeout(1000)
    
    // Verify validation results
    await expect(page.locator('[data-testid="validation-results"]')).toBeVisible()
    
    // Check for validation issues
    const issues = page.locator('[data-testid="validation-issue"]')
    const issueCount = await issues.count()
    
    if (issueCount > 0) {
      // Verify issue details
      await expect(issues.first()).toBeVisible()
      
      // Click to see issue details
      await issues.first().click()
      await expect(page.locator('[data-testid="issue-details"]')).toBeVisible()
    }
  })

  test('should support real-time presence awareness', async ({ page }) => {
    // Simulate user activity
    const editor = page.locator('[data-testid="collaborative-editor"] [contenteditable]')
    await editor.click()
    
    // Mock presence updates
    await page.evaluate(() => {
      // User typing indicator
      window.dispatchEvent(new CustomEvent('user-typing', {
        detail: {
          userId: 'user2',
          name: 'Jane Smith',
          isTyping: true
        }
      }))
    })
    
    await page.waitForTimeout(300)
    
    // Verify typing indicator
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible()
    await expect(page.locator('text=Jane Smith is typing...')).toBeVisible()
    
    // Simulate user stopped typing
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('user-typing', {
        detail: {
          userId: 'user2',
          name: 'Jane Smith',
          isTyping: false
        }
      }))
    })
    
    await page.waitForTimeout(300)
    
    // Verify typing indicator is removed
    await expect(page.locator('[data-testid="typing-indicator"]')).not.toBeVisible()
  })

  test('should handle user permissions', async ({ page }) => {
    // Mock different permission levels
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('permissions-updated', {
        detail: {
          currentUser: {
            canEdit: true,
            canComment: true,
            canResolveComments: true,
            isOwner: false
          },
          otherUsers: [
            {
              userId: 'user2',
              name: 'Jane Smith',
              canEdit: false,
              canComment: true,
              role: 'viewer'
            }
          ]
        }
      }))
    })
    
    await page.waitForTimeout(300)
    
    // Verify current user can edit
    const editor = page.locator('[data-testid="collaborative-editor"] [contenteditable]')
    await expect(editor).not.toHaveAttribute('readonly')
    
    // Verify permission indicators for other users
    const userPermissions = page.locator('[data-testid="user-permissions"]')
    await expect(userPermissions).toContainText('viewer')
    
    // Test permission restrictions (mock read-only state)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('permissions-updated', {
        detail: {
          currentUser: {
            canEdit: false,
            canComment: true,
            role: 'viewer'
          }
        }
      }))
    })
    
    await page.waitForTimeout(300)
    
    // Verify editor becomes read-only
    await expect(editor).toHaveAttribute('readonly')
    
    // Verify edit buttons are disabled
    const editButtons = page.locator('[data-testid="edit-button"]')
    const buttonCount = await editButtons.count()
    for (let i = 0; i < buttonCount; i++) {
      await expect(editButtons.nth(i)).toBeDisabled()
    }
  })
})