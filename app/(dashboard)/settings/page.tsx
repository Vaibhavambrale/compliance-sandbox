'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getSettings, saveSettings, type ApiKeySettings } from '@/lib/api/settings'

type KeyField = 'gemini' | 'groq' | 'anthropic'

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState('')
  const [groqKey, setGroqKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [probeCount, setProbeCount] = useState(40)
  const [probeDelay, setProbeDelay] = useState(4)
  const [maskedKeys, setMaskedKeys] = useState<ApiKeySettings>({
    gemini_api_key: '',
    groq_api_key: '',
    anthropic_api_key: '',
  })
  const [editing, setEditing] = useState<Record<KeyField, boolean>>({
    gemini: false,
    groq: false,
    anthropic: false,
  })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    getSettings()
      .then((data) => {
        setMaskedKeys(data)
      })
      .catch(() => {})
  }, [])

  function startEdit(field: KeyField) {
    setEditing((prev) => ({ ...prev, [field]: true }))
  }

  async function handleSave() {
    setSaving(true)
    setStatus('idle')
    try {
      await saveSettings({
        gemini_api_key: geminiKey,
        groq_api_key: groqKey,
        anthropic_api_key: anthropicKey,
      })
      setStatus('saved')
      // Refresh masked keys from server so UI reflects persisted state
      const data = await getSettings()
      setMaskedKeys(data)
      // Clear raw inputs and return all fields to their saved-display state
      setGeminiKey('')
      setGroqKey('')
      setAnthropicKey('')
      setEditing({ gemini: false, groq: false, anthropic: false })
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure API keys and test defaults.
        </p>
      </div>

      {/* Section 1 - Model API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Google AI Studio</CardTitle>
            <Badge variant="secondary">Gemini</Badge>
          </div>
          <CardDescription>
            Get free key at aistudio.google.com
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="gemini-key">Google AI Studio API Key</Label>
            {maskedKeys.gemini_api_key && (
              <Badge className="bg-green-100 text-green-700 gap-1" variant="secondary">
                <Check className="h-3 w-3" /> Saved
              </Badge>
            )}
          </div>
          {maskedKeys.gemini_api_key && !editing.gemini ? (
            <div className="flex items-center gap-2">
              <Input
                id="gemini-key"
                type="text"
                value={maskedKeys.gemini_api_key}
                readOnly
                className="font-mono"
              />
              <Button type="button" variant="outline" onClick={() => startEdit('gemini')}>
                Change
              </Button>
            </div>
          ) : (
            <Input
              id="gemini-key"
              type="password"
              placeholder="AIza..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Groq</CardTitle>
            <Badge variant="secondary">Llama 3 / Mixtral</Badge>
          </div>
          <CardDescription>
            Get free key at console.groq.com
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="groq-key">Groq API Key</Label>
            {maskedKeys.groq_api_key && (
              <Badge className="bg-green-100 text-green-700 gap-1" variant="secondary">
                <Check className="h-3 w-3" /> Saved
              </Badge>
            )}
          </div>
          {maskedKeys.groq_api_key && !editing.groq ? (
            <div className="flex items-center gap-2">
              <Input
                id="groq-key"
                type="text"
                value={maskedKeys.groq_api_key}
                readOnly
                className="font-mono"
              />
              <Button type="button" variant="outline" onClick={() => startEdit('groq')}>
                Change
              </Button>
            </div>
          ) : (
            <Input
              id="groq-key"
              type="password"
              placeholder="gsk_..."
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
            />
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Section 2 - Analysis Engine */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Anthropic</CardTitle>
            <Badge variant="secondary">Claude (Scoring)</Badge>
          </div>
          <CardDescription>
            Used to score model responses during test runs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="anthropic-key">Anthropic API Key</Label>
            {maskedKeys.anthropic_api_key && (
              <Badge className="bg-green-100 text-green-700 gap-1" variant="secondary">
                <Check className="h-3 w-3" /> Saved
              </Badge>
            )}
          </div>
          {maskedKeys.anthropic_api_key && !editing.anthropic ? (
            <div className="flex items-center gap-2">
              <Input
                id="anthropic-key"
                type="text"
                value={maskedKeys.anthropic_api_key}
                readOnly
                className="font-mono"
              />
              <Button type="button" variant="outline" onClick={() => startEdit('anthropic')}>
                Change
              </Button>
            </div>
          ) : (
            <Input
              id="anthropic-key"
              type="password"
              placeholder="sk-ant-..."
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Section 3 - Test Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Test Defaults</CardTitle>
          <CardDescription>
            Configure default parameters for new test runs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="probe-count">Default Probe Count</Label>
            <Input
              id="probe-count"
              type="number"
              min={10}
              max={80}
              value={probeCount}
              onChange={(e) => setProbeCount(Number(e.target.value))}
              className="mt-1 w-32"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Number of probes per test run (10–80)
            </p>
          </div>
          <div>
            <Label htmlFor="probe-delay">Delay Between Probes (seconds)</Label>
            <Input
              id="probe-delay"
              type="number"
              min={2}
              max={10}
              value={probeDelay}
              onChange={(e) => setProbeDelay(Number(e.target.value))}
              className="mt-1 w-32"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Rate limit protection delay (2–10 seconds)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
        {status === 'saved' && (
          <span className="text-sm text-green-600">Settings saved successfully.</span>
        )}
        {status === 'error' && (
          <span className="text-sm text-red-600">Failed to save settings.</span>
        )}
      </div>
    </div>
  )
}
