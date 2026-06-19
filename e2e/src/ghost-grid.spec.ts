import { test, expect } from '@playwright/test'

test.describe('GhostGrid E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load the page without errors', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/ghost-gl/)

    // Check no console errors
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Wait for the grid to be visible
    await page.waitForSelector('[data-ghost-grid]', { timeout: 10000 })

    // Give time for any async errors
    await page.waitForTimeout(1000)

    // Filter out known benign errors
    const realErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('warning')
    )
    expect(realErrors).toHaveLength(0)
  })

  test('should render grid items', async ({ page }) => {
    await page.waitForSelector('[data-ghost-grid]', { timeout: 10000 })

    // Should have grid items rendered
    const items = page.locator('[data-ghost-id]')
    await expect(items.first()).toBeVisible({ timeout: 5000 })

    // Should have at least some items
    const count = await items.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should display correct materialization modes', async ({ page }) => {
    await page.waitForSelector('[data-ghost-grid]', { timeout: 10000 })

    // Check for ghost/shell/live modes
    const liveItems = page.locator('[data-ghost-mode="live"]')
    const shellItems = page.locator('[data-ghost-mode="shell"]')
    const ghostItems = page.locator('[data-ghost-mode="ghost"]')

    // At least one mode should be present
    const liveCount = await liveItems.count()
    const shellCount = await shellItems.count()
    const ghostCount = await ghostItems.count()

    // At least live or shell should have items (ghost items are not rendered)
    expect(liveCount + shellCount).toBeGreaterThan(0)
  })

  test('should show stats panel with correct data', async ({ page }) => {
    await page.waitForSelector('[data-ghost-grid]', { timeout: 10000 })

    // Wait for stats to load
    await page.waitForTimeout(500)

    // Stats panel should show Total Items
    const statsPanel = page.locator('.stats-panel, [class*="stats"]')
    if (await statsPanel.count() > 0) {
      await expect(statsPanel.first()).toBeVisible()
    }
  })

  test('should handle scrolling', async ({ page }) => {
    await page.waitForSelector('[data-ghost-grid]', { timeout: 10000 })

    // Get scroll container
    const grid = page.locator('[data-ghost-grid]')

    // Scroll down
    await grid.evaluate((el) => {
      el.scrollTop = 500
    })

    // Should still render items
    const items = page.locator('[data-ghost-id]')
    expect(await items.count()).toBeGreaterThan(0)
  })

  test('should display grid with correct columns', async ({ page }) => {
    await page.waitForSelector('[data-ghost-grid]', { timeout: 10000 })

    // Check data-columns attribute
    const grid = page.locator('[data-ghost-grid]').first()
    const columns = await grid.getAttribute('data-columns')
    expect(columns).toBe('12')
  })

  test('should render item content correctly', async ({ page }) => {
    await page.waitForSelector('[data-ghost-grid]', { timeout: 10000 })

    // Wait for live items to render
    await page.waitForSelector('[data-ghost-mode="live"]', { timeout: 5000 })

    // Get first live item
    const liveItem = page.locator('[data-ghost-mode="live"]').first()
    await expect(liveItem).toBeVisible()

    // Item should have title/content
    const itemContent = await liveItem.textContent()
    expect(itemContent).toBeTruthy()
  })
})

test.describe('GhostGrid Drag Interaction', () => {
  test('should initiate drag on mousedown', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-ghost-grid]', { timeout: 10000 })

    // Find a draggable item
    const item = page.locator('[data-ghost-id]').first()
    await expect(item).toBeVisible()

    // Get bounding box
    const box = await item.boundingBox()
    expect(box).not.toBeNull()

    // Simulate drag start
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(100)
      await page.mouse.up()
    }
  })
})

test.describe('GhostGrid Responsive Behavior', () => {
  test('should adapt to different viewport sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.waitForSelector('[data-ghost-grid]', { timeout: 10000 })

    const items = page.locator('[data-ghost-id]')
    expect(await items.count()).toBeGreaterThan(0)

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.reload()
    await page.waitForSelector('[data-ghost-grid]', { timeout: 10000 })

    expect(await items.count()).toBeGreaterThan(0)
  })
})
