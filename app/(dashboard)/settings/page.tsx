'use client'

import { useEffect, useState } from 'react'
import { Check, ShieldCheck, Info, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
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
            <ShieldCheck className="h-5 w-5 text-violet-600" />
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
            <Info className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
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

      <ClearAllDataCard />
    </div>
  )
}

function ClearAllDataCard() {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  async function handleConfirm() {
    if (typed !== 'DELETE') return
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/runs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true, confirm: 'DELETE' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Clear failed')
      } else {
        setResult(`Deleted ${data.deleted_runs ?? 0} test run(s). Refresh the Dashboard or History to see the empty state.`)
        setOpen(false)
        setTyped('')
      }
    } catch {
      setError('Network error')
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <CardTitle className="text-red-900">Danger zone — Clear all test data</CardTitle>
        </div>
        <CardDescription>
          Delete every test run, probe result, benchmark result, and remediation item in the database.
          This is <strong>irreversible</strong>. Use this before a live demo to wipe stale evaluations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {result ? (
          <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded border border-emerald-200">
            {result}
          </p>
        ) : !open ? (
          <Button
            variant="outline"
            onClick={() => setOpen(true)}
            data-testid="clear-all-open"
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 size={14} className="mr-1.5" /> Clear all test data…
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-900">
              Type <code className="bg-white px-1.5 py-0.5 rounded border border-red-200 font-mono">DELETE</code>{' '}
              to confirm. All test runs currently running will block this action.
            </p>
            <Input
              type="text"
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type DELETE"
              className="bg-white font-mono"
              data-testid="clear-all-input"
            />
            {error && <p className="text-xs text-red-800 bg-red-100 p-2 rounded">{error}</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={typed !== 'DELETE' || pending}
                onClick={handleConfirm}
                data-testid="clear-all-confirm"
              >
                {pending ? <><Loader2 size={12} className="mr-1 animate-spin" /> Deleting…</> : 'Confirm clear all'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setOpen(false); setTyped(''); setError(null) }}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
