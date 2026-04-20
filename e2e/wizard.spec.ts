import { test, expect } from '@playwright/test'

test.describe('Test Wizard — 4-step evaluation setup flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/new')
    await expect(page.locator('h1')).toContainText('New Compliance Evaluation')
  })

  test('Step 1: shows smart input field', async ({ page }) => {
    await expect(page.getByText('Connect Your Model')).toBeVisible()
    await expect(page.locator('#smart-input')).toBeVisible()
  })

  test('Step 1: detects OpenAI key format', async ({ page }) => {
    await page.fill('#smart-input', 'sk-proj-test1234567890abcdefghij')
    await expect(page.getByText('Detected:', { exact: false })).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('OpenAI', { exact: true })).toBeVisible()
  })

  test('Step 1: detects Groq key format', async ({ page }) => {
    await page.fill('#smart-input', 'gsk_test1234567890abcdef')
    await expect(page.getByText('Detected:', { exact: false })).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Groq', { exact: true })).toBeVisible()
  })

  test('Step 1: detects HuggingFace token (full format)', async ({ page }) => {
    // HF tokens are hf_ + 30+ alphanumeric chars (real tokens are 34-37 chars)
    await page.fill('#smart-input', 'hf_FAKE_TOKEN_FOR_REGEX_TEST_00000000000')
    await expect(page.getByText('Detected:', { exact: false })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('HuggingFace', { exact: true })).toBeVisible()
  })

  test('Step 1: rejects short HuggingFace token', async ({ page }) => {
    await page.fill('#smart-input', 'hf_short')
    // Should NOT detect as HF — falls through to "Could not auto-detect"
    await expect(page.getByText('Could not auto-detect')).toBeVisible({ timeout: 5000 })
  })

  test('Step 1: shows advanced config for unknown key', async ({ page }) => {
    await page.fill('#smart-input', 'random_unknown_key_format')
    await expect(page.getByText('Could not auto-detect')).toBeVisible({ timeout: 3000 })
  })

  test('Step 1: Next button disabled without validation', async ({ page }) => {
    const nextBtn = page.locator('button:has-text("Next")').first()
    await expect(nextBtn).toBeDisabled()
  })

  test('Step stepper shows all 4 steps', async ({ page }) => {
    await expect(page.locator('button:has-text("Model")')).toBeVisible()
    await expect(page.locator('button:has-text("Region")')).toBeVisible()
    await expect(page.locator('button:has-text("Use Case")')).toBeVisible()
    await expect(page.locator('button:has-text("Run")')).toBeVisible()
  })
})
