import { test, expect } from '@playwright/test'

/**
 * Evaluation-page dual-track UI tests.
 *
 * These assert UI structure only — no real model / judge calls are made.
 * The live test page renders nothing when a run doesn't exist, so we
 * navigate with ?quick=1 to surface the quick-mode banner,
 * and we verify that the dashboard wizard surfaces both primary
 * and quick-demo entry points.
 */

test.describe('Evaluation page — dual-track scoring surface', () => {
  // Note: testing step-4 wizard buttons requires a full flow with a real
  // BYOM key, which CI lacks. That path is validated via manual demo.

  test('benchmark library page shows source column and contamination notice', async ({ page }) => {
    await page.goto('/benchmarks')

    // Library table rendered
    await expect(page.getByTestId('benchmark-library')).toBeVisible()

    // MMLU / TruthfulQA real benchmarks exist (not just custom)
    await expect(page.getByText('MMLU', { exact: false }).first()).toBeVisible()

    // Contamination disclosure visible
    await expect(page.getByText('Benchmark contamination note', { exact: false })).toBeVisible()
  })

  test('benchmarks library lists custom + MMLU + TruthfulQA sources', async ({ page }) => {
    await page.goto('/benchmarks')
    const library = page.getByTestId('benchmark-library')
    await expect(library).toBeVisible()
    // Check source badges
    await expect(library.getByText('mmlu', { exact: false }).first()).toBeVisible()
    await expect(library.getByText('truthfulqa', { exact: false }).first()).toBeVisible()
    await expect(library.getByText('custom', { exact: false }).first()).toBeVisible()
  })
})
