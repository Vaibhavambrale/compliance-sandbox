'use client'

import { useEffect, useState } from 'react'
import { Check, ShieldCheck, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export default function SettingsPage() {
  const [anthropicKey, setAnthropicKey] = useState('')
  const [maskedKey, setMaskedKey] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    fetch('/api/settings/get')
      .then(r => r.json())
      .then(data => {
        if (data.anthropic_api_key) setMaskedKey(data.anthropic_api_key)
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    if (!anthropicKey) return
    setSaving(true)
    setStatus('idle')
    try {
      await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anthropic_api_key: anthropicKey }),
      })
      setStatus('saved')
      const data = await fetch('/api/settings/get').then(r => r.json())
      if (data.anthropic_api_key) setMaskedKey(data.anthropic_api_key)
      setAnthropicKey('')
      setEditing(false)
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure the scoring engine for compliance evaluations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <CardTitle>Scoring Engine</CardTitle>
          </div>
          <CardDescription>
            Claude is used as the evaluation engine to score model responses against compliance criteria. An Anthropic API key is required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="anthropic-key">Anthropic API Key</Label>
              {maskedKey && (
                <Badge className="bg-emerald-50 text-emerald-700 gap-1" variant="secondary">
                  <Check className="h-3 w-3" /> Configured
                </Badge>
              )}
            </div>
            {maskedKey && !editing ? (
              <div className="flex items-center gap-2">
                <Input id="anthropic-key" type="text" value={maskedKey} readOnly className="font-mono" />
                <Button type="button" variant="outline" onClick={() => setEditing(true)}>Change</Button>
              </div>
            ) : (
              <Input
                id="anthropic-key"
                type="password"
                placeholder="sk-ant-..."
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="font-mono"
              />
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={handleSave} disabled={saving || (!anthropicKey && !editing)}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            {status === 'saved' && <span className="text-sm text-emerald-600">Saved successfully.</span>}
            {status === 'error' && <span className="text-sm text-red-600">Failed to save.</span>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-violet-100 bg-violet-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-violet-900">How the Scoring Engine Works</p>
              <p className="text-violet-700">
                When you run a compliance evaluation, each probe prompt is sent to your model. Responses are scored programmatically using 7 deterministic metrics (accuracy, calibration, fairness, bias, toxicity, efficiency). Claude is used only to generate the narrative report.
              </p>
              <p className="text-violet-700">
                Your model&apos;s API key is provided per-evaluation in the test wizard and is never stored permanently. Only the Anthropic key (for report generation) is saved here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
