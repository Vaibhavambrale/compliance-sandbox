import { test, expect } from '@playwright/test'

test.describe('Sidebar Navigation — all links work correctly', () => {
  test('sidebar is visible on all pages', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('aside')).toBeVisible()
  })

  test('brand logo links to dashboard', async ({ page }) => {
    await page.goto('/settings')
    await page.locator('aside').getByRole('link', { name: 'ComplianceAI' }).click()
    await expect(page).toHaveURL(/dashboard/)
  })

  test('Dashboard link navigates to /dashboard', async ({ page }) => {
    await page.goto('/settings')
    await page.locator('aside').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page).toHaveURL(/dashboard/)
  })

  test('New Evaluation link navigates to /test/new', async ({ page }) => {
    await page.goto('/dashboard')
    await page.locator('aside').getByRole('link', { name: 'New Evaluation' }).click()
    await expect(page).toHaveURL(/test\/new/)
  })

  test('Frameworks link navigates to /frameworks', async ({ page }) => {
    await page.goto('/dashboard')
    await page.locator('aside a[href="/frameworks"]').click()
    await expect(page).toHaveURL(/frameworks/)
  })

  test('Benchmarks link navigates to /benchmarks', async ({ page }) => {
    await page.goto('/dashboard')
    await page.locator('aside').getByRole('link', { name: 'Benchmarks' }).click()
    await expect(page).toHaveURL(/benchmarks/)
  })

  test('History link navigates to /history', async ({ page }) => {
    await page.goto('/dashboard')
    await page.locator('aside').getByRole('link', { name: 'History' }).click()
    await expect(page).toHaveURL(/history/)
  })

  test('Settings link navigates to /settings', async ({ page }) => {
    await page.goto('/dashboard')
    await page.locator('aside').getByRole('link', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/settings/)
  })

  test('active page has violet highlight in sidebar', async ({ page }) => {
    await page.goto('/dashboard')
    // Use the nav link (not the brand logo) — it's the second /dashboard link
    const dashLink = page.locator('aside nav a[href="/dashboard"]')
    await expect(dashLink).toHaveClass(/violet/)
  })
})
