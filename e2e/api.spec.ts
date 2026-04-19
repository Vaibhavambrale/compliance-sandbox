import { test, expect } from '@playwright/test'

test.describe('API Endpoint Tests — validate backend routes', () => {
  test('POST /api/model/validate with invalid key returns valid:false', async ({ request }) => {
    test.setTimeout(30000) // model validation can be slow on first call
    const response = await request.post('/api/model/validate', {
      data: {
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        apiKey: 'sk-invalid-test-key',
        modelId: 'gpt-4o',
        apiFormat: 'openai',
      },
    })
    const body = await response.json()
    expect(body.valid).toBe(false)
    expect(body.error).toBeTruthy()
  })

  test('POST /api/model/validate with missing fields returns 400', async ({ request }) => {
    const response = await request.post('/api/model/validate', {
      data: { apiEndpoint: '' },
    })
    expect(response.status()).toBe(400)
  })

  test('GET /api/settings/get returns settings object', async ({ request }) => {
    const response = await request.get('/api/settings/get')
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body).toHaveProperty('anthropic_api_key')
  })

  test('POST /api/test/start without body returns 400', async ({ request }) => {
    const response = await request.post('/api/test/start', {
      data: {},
    })
    expect(response.status()).toBe(400)
  })

  test('POST /api/model/hf-resolve with invalid model returns error', async ({ request }) => {
    const response = await request.post('/api/model/hf-resolve', {
      data: {
        modelId: 'nonexistent/fake-model-12345',
        apiKey: 'hf_invalidtoken',
      },
    })
    const body = await response.json()
    expect(body.error).toBeTruthy()
  })

  test('POST /api/model/hf-resolve without params returns 400', async ({ request }) => {
    const response = await request.post('/api/model/hf-resolve', {
      data: {},
    })
    expect(response.status()).toBe(400)
  })

  test('GET /api/model/validate returns 405 (POST only)', async ({ request }) => {
    const response = await request.get('/api/model/validate')
    expect(response.status()).toBe(405)
  })

  test('POST /api/report/generate without test_run_id returns 400', async ({ request }) => {
    const response = await request.post('/api/report/generate', {
      data: {},
    })
    expect(response.status()).toBe(400)
  })
})
