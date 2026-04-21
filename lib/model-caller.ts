/**
 * Universal model caller for BYOM (Bring Your Own Model).
 * Supports OpenAI-compatible, Anthropic, Google AI, and custom API formats.
 */

export interface ModelConfig {
  name: string
  apiEndpoint: string
  apiKey: string
  modelId: string
  apiFormat: 'openai' | 'anthropic' | 'google' | 'custom'
  headers?: Record<string, string>
}

export async function callUserModel(config: ModelConfig, prompt: string): Promise<string> {
  // HuggingFace router — endpoint already includes the provider path
  // e.g., https://router.huggingface.co/cerebras/v1/chat/completions
  if (config.apiEndpoint.includes('router.huggingface.co')) {
    return callOpenAICompatible(config, prompt)
  }

  switch (config.apiFormat) {
    case 'openai':
      return callOpenAICompatible(config, prompt)
    case 'anthropic':
      return callAnthropic(config, prompt)
    case 'google':
      return callGoogle(config, prompt)
    case 'custom':
      return callOpenAICompatible(config, prompt)
    default:
      throw new Error(`Unsupported API format: ${config.apiFormat}`)
  }
}

async function callOpenAICompatible(config: ModelConfig, prompt: string): Promise<string> {
  const res = await fetch(config.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      ...config.headers,
    },
    body: JSON.stringify({
      model: config.modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => 'Unknown error')
    throw new Error(`Model API error (${res.status}): ${errBody.slice(0, 200)}`)
  }

  const data = await res.json()
  const msg = data?.choices?.[0]?.message
  const raw = (msg?.content ?? msg?.reasoning_content ?? '') as string
  const stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  return stripped || raw.trim() || 'No response from model'
}

async function callAnthropic(config: ModelConfig, prompt: string): Promise<string> {
  const res = await fetch(config.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      ...config.headers,
    },
    body: JSON.stringify({
      model: config.modelId,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => 'Unknown error')
    throw new Error(`Anthropic API error (${res.status}): ${errBody.slice(0, 200)}`)
  }

  const data = await res.json()
  return data?.content?.[0]?.text ?? 'No response from model'
}

async function callGoogle(config: ModelConfig, prompt: string): Promise<string> {
  const url = `${config.apiEndpoint}/${config.modelId}:generateContent?key=${config.apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => 'Unknown error')
    throw new Error(`Google AI error (${res.status}): ${errBody.slice(0, 200)}`)
  }

  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response from model'
}

