export interface ModelDef {
  id: string
  name: string
  provider: 'Google AI Studio' | 'Groq'
  freeLimit: string
  note: string
  bestFor: string
  getKey: string
}

export const MODELS: readonly ModelDef[] = [
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'Google AI Studio',
    freeLimit: '15 requests/minute',
    note: 'Free tier, 15 req/min',
    bestFor: 'Fast testing, general compliance',
    getKey: 'aistudio.google.com',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google AI Studio',
    freeLimit: '2 requests/minute',
    note: 'Free tier',
    bestFor: 'Thorough analysis',
    getKey: 'aistudio.google.com',
  },
  {
    id: 'llama-3-groq',
    name: 'Llama 3 70B via Groq',
    provider: 'Groq',
    freeLimit: '30 requests/minute',
    note: 'Free tier, 30 req/min',
    bestFor: 'Open source testing',
    getKey: 'console.groq.com',
  },
  {
    id: 'mixtral-groq',
    name: 'Mixtral 8x7B via Groq',
    provider: 'Groq',
    freeLimit: '30 requests/minute',
    note: 'Free tier',
    bestFor: 'Multilingual testing',
    getKey: 'console.groq.com',
  },
] as const

export function getModelById(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id)
}
