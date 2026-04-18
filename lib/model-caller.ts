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
  switch (config.apiFormat) {
    case 'openai':
      return callOpenAICompatible(config, prompt)
    case 'anthropic':
      return callAnthropic(config, prompt)
    case 'google':
      return callGoogle(config, prompt)
    case 'custom':
      return callOpenAICompatible(config, prompt) // custom uses OpenAI format with custom headers
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
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => 'Unknown error')
    throw new Error(`Model API error (${res.status}): ${errBody.slice(0, 200)}`)
  }

  const data = await res.json()
  return data?.choices?.[0]?.message?.content ?? 'No response from model'
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

/**
 * Provider presets for quick-fill in the UI.
 */
export const PROVIDER_PRESETS = [
  {
    id: 'openai',
    name: 'OpenAI',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    apiFormat: 'openai' as const,
    placeholder: 'sk-...',
    modelExamples: 'gpt-4o, gpt-4o-mini, gpt-3.5-turbo',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    apiFormat: 'anthropic' as const,
    placeholder: 'sk-ant-...',
    modelExamples: 'claude-sonnet-4-6, claude-haiku-4-5-20251001',
  },
  {
    id: 'google',
    name: 'Google AI Studio',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    apiFormat: 'google' as const,
    placeholder: 'AIza...',
    modelExamples: 'gemini-1.5-flash, gemini-1.5-pro',
  },
  {
    id: 'groq',
    name: 'Groq',
    apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    apiFormat: 'openai' as const,
    placeholder: 'gsk_...',
    modelExamples: 'llama3-70b-8192, mixtral-8x7b-32768',
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    apiEndpoint: 'https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-02-01',
    apiFormat: 'openai' as const,
    placeholder: '',
    modelExamples: 'gpt-4o',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    apiEndpoint: 'http://localhost:11434/v1/chat/completions',
    apiFormat: 'openai' as const,
    placeholder: 'ollama',
    modelExamples: 'llama3, mistral, codellama',
  },
] as const
