'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  ArrowLeft,
  Zap,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { startTest } from '@/lib/api/tests'
import { PROVIDER_PRESETS } from '@/lib/model-caller'
import { REGIONS, FRAMEWORKS, getFrameworksForRegion } from '@/lib/frameworks'
import { getProbeCount, detectScenarios, getScenarioDetails } from '@/lib/probes'

const STEPS = ['Configure Model', 'Select Region', 'Describe Use Case', 'Frameworks & Run']

export default function NewTestPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><div className="h-8 w-48 bg-muted animate-pulse rounded" /></div>}>
      <NewTestPageInner />
    </Suspense>
  )
}

function NewTestPageInner() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 1: Model config
  const [modelName, setModelName] = useState('')
  const [apiEndpoint, setApiEndpoint] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [modelId, setModelId] = useState('')
  const [apiFormat, setApiFormat] = useState<'openai' | 'anthropic' | 'google' | 'custom'>('openai')

  // Model validation
  const [validating, setValidating] = useState(false)
  const [validated, setValidated] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validationLatency, setValidationLatency] = useState<number | null>(null)

  // Step 2: Region
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  // Step 3: Use case (free text)
  const [useCaseDescription, setUseCaseDescription] = useState('')
  const [detectedScenarios, setDetectedScenarios] = useState<string[]>([])

  // Step 4: Frameworks
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-detect scenarios as user types
  useEffect(() => {
    if (useCaseDescription.trim().length > 5) {
      const scenarios = detectScenarios(useCaseDescription)
      setDetectedScenarios(scenarios)
    } else {
      setDetectedScenarios([])
    }
  }, [useCaseDescription])

  function applyPreset(presetId: string) {
    const preset = PROVIDER_PRESETS.find(p => p.id === presetId)
    if (!preset) return
    setApiEndpoint(preset.apiEndpoint)
    setApiFormat(preset.apiFormat)
    setModelName(preset.name + ' Model')
    // Reset validation when changing provider
    setValidated(false)
    setValidationError(null)
  }

  async function handleTestConnection() {
    setValidating(true)
    setValidationError(null)
    setValidated(false)

    try {
      const res = await fetch('/api/model/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiEndpoint, apiKey, modelId, apiFormat }),
      })

      const data = await res.json()

      if (data.valid) {
        setValidated(true)
        setValidationLatency(data.latency_ms)
      } else {
        setValidationError(data.error || 'Connection failed')
      }
    } catch {
      setValidationError('Network error — could not reach validation endpoint')
    } finally {
      setValidating(false)
    }
  }

  function handleRegionSelect(regionId: string) {
    setSelectedRegion(regionId)
    const regionFrameworks = getFrameworksForRegion(regionId)
    setSelectedFrameworks(regionFrameworks.map(f => f.id))
  }

  function toggleFramework(id: string) {
    setSelectedFrameworks((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  function removeScenario(id: string) {
    setDetectedScenarios(prev => prev.filter(s => s !== id))
  }

  const probeCount = selectedFrameworks.length > 0 && useCaseDescription.trim().length > 0
    ? getProbeCount(selectedFrameworks, useCaseDescription)
    : 0
  const estimatedMinutes = Math.ceil((probeCount * 6) / 60)

  const modelConfigValid = modelName && apiEndpoint && apiKey && modelId && validated

  async function handleRunTest() {
    if (!modelConfigValid || !useCaseDescription.trim() || selectedFrameworks.length === 0) {
      setError('Please complete all steps before running the evaluation.')
      return
    }

    setSubmitting(true)
    setError(null)

    const modelConfig = { name: modelName, apiEndpoint, apiKey, modelId, apiFormat }

    try {
      sessionStorage.setItem('model_config', JSON.stringify(modelConfig))

      const { id } = await startTest({
        model_config: modelConfig,
        region: selectedRegion || 'global',
        use_case: useCaseDescription,
        frameworks: selectedFrameworks,
      })
      router.push(`/test/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start evaluation')
      setSubmitting(false)
    }
  }

  const scenarioDetails = getScenarioDetails(detectedScenarios)

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Evaluation</p>
        <h1 className="text-xl font-bold text-gray-900">New Compliance Evaluation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your model, describe its purpose, and select compliance parameters.
        </p>
      </div>

      {/* Progress stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => { if (i <= step) setStep(i) }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step
                  ? 'bg-violet-600 text-white'
                  : i < step
                    ? 'bg-violet-100 text-violet-700 cursor-pointer'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < step ? <CheckCircle2 size={14} /> : <span>{i + 1}</span>}
              {label}
            </button>
            {i < STEPS.length - 1 && <ArrowRight size={14} className="text-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Configure Model */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Configure Your Model</h2>
            <p className="text-sm text-gray-500 mt-1">Provide the API details for the model you want to evaluate.</p>
          </div>

          {/* Provider presets */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Quick Setup — Select Provider</Label>
            <div className="flex flex-wrap gap-2">
              {PROVIDER_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => applyPreset(preset.id)}
                >
                  <Zap size={12} className="mr-1" />
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">Model Name</Label>
              <Input id="model-name" placeholder="e.g., Our GPT-4o Deployment" value={modelName} onChange={(e) => { setModelName(e.target.value); setValidated(false) }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-id">Model ID</Label>
              <Input id="model-id" placeholder="e.g., gpt-4o, gemini-1.5-flash" value={modelId} onChange={(e) => { setModelId(e.target.value); setValidated(false) }} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="api-endpoint">API Endpoint</Label>
              <Input id="api-endpoint" placeholder="https://api.openai.com/v1/chat/completions" value={apiEndpoint} onChange={(e) => { setApiEndpoint(e.target.value); setValidated(false) }} className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input id="api-key" type="password" placeholder="sk-..." value={apiKey} onChange={(e) => { setApiKey(e.target.value); setValidated(false) }} className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-format">API Format</Label>
              <select
                id="api-format"
                value={apiFormat}
                onChange={(e) => { setApiFormat(e.target.value as typeof apiFormat); setValidated(false) }}
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="openai">OpenAI Compatible</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google AI Studio</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          {/* Test Connection */}
          <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
            <Button
              onClick={handleTestConnection}
              disabled={!modelName || !apiEndpoint || !apiKey || !modelId || validating}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              {validating ? (
                <><Loader2 size={14} className="mr-1 animate-spin" /> Testing...</>
              ) : (
                'Test Connection'
              )}
            </Button>

            {validated && (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 size={16} />
                <span className="font-medium">Connected</span>
                {validationLatency && (
                  <span className="text-gray-400 text-xs">({validationLatency}ms)</span>
                )}
              </div>
            )}

            {validationError && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle size={16} />
                <span className="line-clamp-1">{validationError}</span>
              </div>
            )}

            {!validated && !validationError && !validating && (
              <span className="text-xs text-gray-400">Verify your model responds before proceeding</span>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setStep(1)} disabled={!modelConfigValid} className="bg-violet-600 hover:bg-violet-700 text-white">
              Next <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Select Region */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Select Compliance Region</h2>
            <p className="text-sm text-gray-500 mt-1">Choose the regulatory jurisdiction to evaluate against.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REGIONS.map((region) => {
              const isSelected = selectedRegion === region.id
              const regionFrameworks = getFrameworksForRegion(region.id)
              return (
                <Card
                  key={region.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleRegionSelect(region.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{region.flag}</span>
                      <CardTitle className="text-base">{region.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {regionFrameworks.map((fw) => (
                        <Badge key={fw.id} variant="secondary" className="text-[10px]">
                          {fw.shortName}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft size={14} className="mr-1" /> Back</Button>
            <Button onClick={() => setStep(2)} disabled={!selectedRegion} className="bg-violet-600 hover:bg-violet-700 text-white">Next <ArrowRight size={14} className="ml-1" /></Button>
          </div>
        </div>
      )}

      {/* Step 3: Describe Use Case (Free Text) */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Describe Your Use Case</h2>
            <p className="text-sm text-gray-500 mt-1">
              Tell us what your model will be used for. We&apos;ll automatically detect relevant compliance scenarios and select appropriate evaluation probes.
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="use-case-desc">What will your model be used for?</Label>
            <textarea
              id="use-case-desc"
              value={useCaseDescription}
              onChange={(e) => setUseCaseDescription(e.target.value)}
              placeholder="e.g., Customer support chatbot for a banking app that handles loan inquiries, account issues, and financial advice for retail customers in India"
              rows={3}
              className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors resize-none"
            />
          </div>

          {/* Auto-detected scenario tags */}
          {scenarioDetails.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Detected Compliance Scenarios</Label>
              <div className="flex flex-wrap gap-2">
                {scenarioDetails.map((scenario) => (
                  <span
                    key={scenario.id}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${scenario.color}`}
                  >
                    {scenario.label}
                    <button
                      onClick={() => removeScenario(scenario.id)}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">
                {detectedScenarios.length > 0 && `${getProbeCount(selectedFrameworks, useCaseDescription)} probes will be selected based on these scenarios`}
              </p>
            </div>
          )}

          {useCaseDescription.trim().length > 0 && scenarioDetails.length === 0 && (
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-500">
                Keep typing to help us detect relevant scenarios, or continue with general compliance probes.
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft size={14} className="mr-1" /> Back</Button>
            <Button onClick={() => setStep(3)} disabled={!useCaseDescription.trim()} className="bg-violet-600 hover:bg-violet-700 text-white">Next <ArrowRight size={14} className="ml-1" /></Button>
          </div>
        </div>
      )}

      {/* Step 4: Frameworks & Run */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Review & Start Evaluation</h2>
            <p className="text-sm text-gray-500 mt-1">Confirm frameworks and start the compliance evaluation.</p>
          </div>

          {/* Test summary */}
          <Card className="border-violet-200 bg-violet-50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Model</p>
                  <p className="font-medium text-gray-900">{modelName}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Region</p>
                  <p className="font-medium text-gray-900">{REGIONS.find(r => r.id === selectedRegion)?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Use Case</p>
                  <p className="font-medium text-gray-900 line-clamp-2 text-xs">{useCaseDescription || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Estimated</p>
                  <p className="font-medium text-gray-900">{probeCount} probes / ~{estimatedMinutes} min</p>
                </div>
              </div>
              {scenarioDetails.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-violet-200">
                  {scenarioDetails.map(s => (
                    <Badge key={s.id} variant="secondary" className="text-[10px]">{s.label}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Framework selection */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Compliance Frameworks</CardTitle>
              <CardDescription>Select which regulatory frameworks to test against.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {FRAMEWORKS.map((fw) => (
                <label key={fw.id} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={selectedFrameworks.includes(fw.id)}
                    onCheckedChange={() => toggleFramework(fw.id)}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{fw.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px]">{fw.region}</Badge>
                      <Badge variant={fw.status === 'established' ? 'default' : 'secondary'} className="text-[10px]">
                        {fw.status}
                      </Badge>
                    </div>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft size={14} className="mr-1" /> Back
            </Button>
            <Button
              size="lg"
              onClick={handleRunTest}
              disabled={submitting || selectedFrameworks.length === 0}
              className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
            >
              {submitting ? (
                <><Loader2 size={14} className="mr-1 animate-spin" /> Starting Evaluation...</>
              ) : (
                'Start Compliance Evaluation'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
