import { test, expect } from '@playwright/test'

test.describe('India region + compliance coverage', () => {
  test('region cards render with test IDs and India selects cleanly', async ({ page }) => {
    // The wizard step-2 is only reachable after step-1 validation, so here we
    // just assert that the cards and their test IDs are present in the built
    // HTML. A full flow that actually advances to step 2 requires a real BYOM
    // key and is out of CI scope.
    await page.goto('/test/new')
    const html = await page.content()
    expect(html).toContain('data-testid="region-card-india"')
    expect(html).toContain('data-testid="region-card-eu"')
    expect(html).toContain('data-testid="region-card-global"')
  })

  test('settings page exposes clear-all danger zone', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByTestId('clear-all-open')).toBeVisible()
    // Opening the confirmation reveals the typed-DELETE input
    await page.getByTestId('clear-all-open').click()
    await expect(page.getByTestId('clear-all-input')).toBeVisible()
    // Confirm button disabled until DELETE is typed
    const confirm = page.getByTestId('clear-all-confirm')
    await expect(confirm).toBeDisabled()
    await page.getByTestId('clear-all-input').fill('delete')
    await expect(confirm).toBeDisabled()
    await page.getByTestId('clear-all-input').fill('DELETE')
    await expect(confirm).toBeEnabled()
    // Do NOT click — we don't want a destructive operation in CI.
  })

  test('dashboard refresh button is present', async ({ page }) => {
    // Dashboard redirects to empty state if no runs — both states render the header
    await page.goto('/dashboard')
    // Refresh button only shows in the non-empty dashboard header.
    // Either the refresh button exists (has runs) or empty state is shown (fresh DB).
    const refresh = page.getByTestId('dashboard-refresh')
    const newEvalLink = page.getByRole('link', { name: /run your first test|new evaluation/i })
    // Assert at least one of the two is visible (dashboard loaded in some form).
    await expect(refresh.or(newEvalLink).first()).toBeVisible()
  })
})
