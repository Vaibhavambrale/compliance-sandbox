import { test, expect } from '@playwright/test'

test.describe('Page Smoke Tests — every page loads without errors', () => {
  test('/ redirects to /dashboard', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(/dashboard/)
  })

  test('/dashboard loads and shows heading', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('text=Server Error')).not.toBeVisible()
    await expect(page.locator('text=Cannot find module')).not.toBeVisible()
  })

  test('/test/new loads wizard', async ({ page }) => {
    await page.goto('/test/new')
    await expect(page.locator('h1')).toContainText('New Compliance Evaluation')
    await expect(page.getByText('Connect Your Model')).toBeVisible()
  })

  test('/settings loads', async ({ page }) => {
    await page.goto('/settings')
    // Use exact match to avoid strict mode violation
    await expect(page.getByText('Scoring Engine', { exact: true })).toBeVisible()
  })

  test('/frameworks loads', async ({ page }) => {
    await page.goto('/frameworks')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('text=Server Error')).not.toBeVisible()
  })

  test('/benchmarks loads', async ({ page }) => {
    await page.goto('/benchmarks')
    await expect(page.locator('h1')).toContainText('Benchmark')
    await expect(page.locator('text=Server Error')).not.toBeVisible()
  })

  test('/history loads', async ({ page }) => {
    await page.goto('/history')
    await expect(page.locator('text=Server Error')).not.toBeVisible()
  })

  test('404 page for invalid route', async ({ page }) => {
    await page.goto('/nonexistent-page')
    await expect(page.locator('text=404')).toBeVisible()
  })
})
