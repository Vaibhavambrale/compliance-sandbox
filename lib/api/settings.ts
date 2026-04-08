export interface ApiKeySettings {
  gemini_api_key: string
  groq_api_key: string
  anthropic_api_key: string
}

export async function saveSettings(settings: ApiKeySettings): Promise<void> {
  const res = await fetch('/api/settings/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to save settings' }))
    throw new Error(err.error ?? 'Failed to save settings')
  }
}

export async function getSettings(): Promise<ApiKeySettings> {
  const res = await fetch('/api/settings/save', {
    method: 'GET',
  })

  if (!res.ok) {
    return { gemini_api_key: '', groq_api_key: '', anthropic_api_key: '' }
  }

  return res.json()
}
