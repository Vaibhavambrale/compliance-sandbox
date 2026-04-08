'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { saveSettings } from '@/lib/api/settings'

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState('')
  const [groqKey, setGroqKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [probeCount, setProbeCount] = useState(40)
  const [probeDelay, setProbeDelay] = useState(4)
  const [maskedKeys, setMaskedKeys] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    fetch('/api/settings/get')
      .then((res) => res.json())
      .then((data) => {
        setMaskedKeys(data)
      })
      .catch(() => {})
  }, [])

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
      // Refresh masked keys
      const res = await fetch('/api/settings/get')
      const data = await res.json()
      setMaskedKeys(data)
      // Clear raw inputs after save
      setGeminiKey('')
      setGroqKey('')
      setAnthropicKey('')
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
          <Input
            id="gemini-key"
            type="password"
            placeholder={maskedKeys.gemini_api_key || 'AIza...'}
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
          />
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
          <Input
            id="groq-key"
            type="password"
            placeholder={maskedKeys.groq_api_key || 'gsk_...'}
            value={groqKey}
            onChange={(e) => setGroqKey(e.target.value)}
          />
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
          <Input
            id="anthropic-key"
            type="password"
            placeholder={maskedKeys.anthropic_api_key || 'sk-ant-...'}
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
          />
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
