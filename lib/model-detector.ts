/**
 * Smart Model Detector — auto-detects provider from API key format or HuggingFace model name.
 * No network calls — pure string pattern matching.
 */

export interface DetectedModel {
  provider: 'openai' | 'anthropic' | 'google' | 'groq' | 'huggingface' | 'custom'
  providerName: string
  apiEndpoint: string
  apiFormat: 'openai' | 'anthropic' | 'google' | 'custom'
  apiKey: string
  modelId: string
  suggestedModels: string[]
  displayName: string
  detected: boolean
  inputType: 'api_key' | 'model_name' | 'unknown'
}

interface ProviderPattern {
  provider: DetectedModel['provider']
  providerName: string
  patterns: RegExp[]
  apiEndpoint: string
  apiFormat: DetectedModel['apiFormat']
  suggestedModels: string[]
  defaultModel: string
}

const PROVIDER_PATTERNS: ProviderPattern[] = [
  {
    provider: 'openai',
    providerName: 'OpenAI',
    patterns: [/^sk-proj-/i, /^sk-[a-zA-Z0-9]{20,}/],
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    apiFormat: 'openai',
    suggestedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o-mini',
  },
  {
    provider: 'groq',
    providerName: 'Groq',
    patterns: [/^gsk_/i],
    apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    apiFormat: 'openai',
    suggestedModels: ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    defaultModel: 'llama-3.1-8b-instant',
  },
  {
    provider: 'anthropic',
    providerName: 'Anthropic',
    patterns: [/^sk-ant-/i],
    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    apiFormat: 'anthropic',
    suggestedModels: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001', 'claude-3-5-sonnet-20241022'],
    defaultModel: 'claude-sonnet-4-20250514',
  },
  {
    provider: 'google',
    providerName: 'Google AI Studio',
    patterns: [/^AIza/i],
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    apiFormat: 'google',
    suggestedModels: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
    defaultModel: 'gemini-1.5-flash',
  },
  {
    provider: 'huggingface',
    providerName: 'HuggingFace',
    patterns: [/^hf_/i],
    apiEndpoint: 'https://api-inference.huggingface.co/models',
    apiFormat: 'custom',
    suggestedModels: ['meta-llama/Llama-3.1-8B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.3', 'google/gemma-2-9b-it'],
    defaultModel: 'meta-llama/Llama-3.1-8B-Instruct',
  },
]

/**
 * Detect if input looks like a HuggingFace model name (org/model format).
 */
function isHuggingFaceModelName(input: string): boolean {
  const trimmed = input.trim()
  // Must contain exactly one "/" with no spaces, and both parts non-empty
  if (!trimmed.includes('/') || trimmed.includes(' ')) return false
  const parts = trimmed.split('/')
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0
}

/**
 * Detect model provider and configuration from user input.
 * Input can be: API key, HuggingFace model name, or unknown text.
 */
export function detectFromInput(input: string): DetectedModel {
  const trimmed = input.trim()

  if (!trimmed) {
    return {
      provider: 'custom',
      providerName: '',
      apiEndpoint: '',
      apiFormat: 'openai',
      apiKey: '',
      modelId: '',
      suggestedModels: [],
      displayName: '',
      detected: false,
      inputType: 'unknown',
    }
  }

  // Check if it's a HuggingFace model name (org/model format)
  if (isHuggingFaceModelName(trimmed)) {
    return {
      provider: 'huggingface',
      providerName: 'HuggingFace',
      apiEndpoint: `https://api-inference.huggingface.co/models/${trimmed}`,
      apiFormat: 'custom',
      apiKey: '', // user needs to provide HF token separately
      modelId: trimmed,
      suggestedModels: [trimmed],
      displayName: trimmed.split('/').pop() ?? trimmed,
      detected: true,
      inputType: 'model_name',
    }
  }

  // Try matching against known API key patterns
  for (const pattern of PROVIDER_PATTERNS) {
    if (pattern.patterns.some(p => p.test(trimmed))) {
      return {
        provider: pattern.provider,
        providerName: pattern.providerName,
        apiEndpoint: pattern.apiEndpoint,
        apiFormat: pattern.apiFormat,
        apiKey: trimmed,
        modelId: pattern.defaultModel,
        suggestedModels: pattern.suggestedModels,
        displayName: `${pattern.providerName} Model`,
        detected: true,
        inputType: 'api_key',
      }
    }
  }

  // Unknown format — treat as custom API key
  return {
    provider: 'custom',
    providerName: 'Custom Provider',
    apiEndpoint: '',
    apiFormat: 'openai',
    apiKey: trimmed,
    modelId: '',
    suggestedModels: [],
    displayName: 'Custom Model',
    detected: false,
    inputType: 'unknown',
  }
}

/**
 * Get provider icon/color for display.
 */
export function getProviderStyle(provider: DetectedModel['provider']): { color: string; bg: string } {
  switch (provider) {
    case 'openai': return { color: 'text-gray-900', bg: 'bg-gray-100' }
    case 'groq': return { color: 'text-orange-700', bg: 'bg-orange-50' }
    case 'anthropic': return { color: 'text-amber-700', bg: 'bg-amber-50' }
    case 'google': return { color: 'text-blue-700', bg: 'bg-blue-50' }
    case 'huggingface': return { color: 'text-yellow-700', bg: 'bg-yellow-50' }
    case 'custom': return { color: 'text-gray-600', bg: 'bg-gray-50' }
  }
}
