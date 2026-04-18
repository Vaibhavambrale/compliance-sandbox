'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { startTest } from '@/lib/api/tests'
import { REGIONS, FRAMEWORKS, getFrameworksForRegion } from '@/lib/frameworks'
import { getProbeCount, detectScenarios, getScenarioDetails } from '@/lib/probes'
import { detectFromInput, getProviderStyle } from '@/lib/model-detector'
import type { DetectedModel } from '@/lib/model-detector'

const STEPS = ['Model', 'Region', 'Use Case', 'Run']

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

  // Step 1: Smart model input
  const [smartInput, setSmartInput] = useState('')
  const [detected, setDetected] = useState<DetectedModel | null>(null)
  const [modelId, setModelId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [advEndpoint, setAdvEndpoint] = useState('')
  const [advApiKey, setAdvApiKey] = useState('')
  const [advFormat, setAdvFormat] = useState<'openai' | 'anthropic' | 'google' | 'custom'>('openai')
  // For HuggingFace model name — need separate token
  const [hfToken, setHfToken] = useState('')

  // Validation
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

  // Auto-detect on input change
  useEffect(() => {
    if (smartInput.trim().length >= 3) {
      const result = detectFromInput(smartInput)
      setDetected(result)
      if (result.detected) {
        setModelId(result.modelId)
        setDisplayName(result.displayName)
        setAdvEndpoint(result.apiEndpoint)
        setAdvFormat(result.apiFormat)
        setShowAdvanced(false)
      } else {
        setShowAdvanced(true)
      }
    } else {
      setDetected(null)
    }
    // Reset validation on any input change
    setValidated(false)
    setValidationError(null)
  }, [smartInput])

  // Auto-detect scenarios
  useEffect(() => {
    if (useCaseDescription.trim().length > 5) {
      setDetectedScenarios(detectScenarios(useCaseDescription))
    } else {
      setDetectedScenarios([])
    }
  }, [useCaseDescription])

  // Build the final model config for API calls
  function getModelConfig() {
    if (detected?.detected && !showAdvanced) {
      const apiKey = detected.inputType === 'model_name' ? hfToken : detected.apiKey
      return {
        name: displayName || detected.displayName,
        apiEndpoint: detected.apiEndpoint,
        apiKey,
        modelId: modelId || detected.modelId,
        apiFormat: detected.apiFormat,
      }
    }
    // Advanced / custom
    return {
      name: displayName || 'Custom Model',
      apiEndpoint: advEndpoint,
      apiKey: advApiKey || (detected?.apiKey ?? ''),
      modelId: modelId,
      apiFormat: advFormat,
    }
  }

  async function handleTestConnection() {
    const config = getModelConfig()
    if (!config.apiEndpoint || !config.apiKey || !config.modelId) {
      setValidationError('Please fill in all required fields')
      return
    }

    setValidating(true)
    setValidationError(null)
    setValidated(false)

    try {
      const res = await fetch('/api/model/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (data.valid) {
        setValidated(true)
        setValidationLatency(data.latency_ms)
      } else {
        setValidationError(data.error || 'Connection failed')
      }
    } catch {
      setValidationError('Network error')
    } finally {
      setValidating(false)
    }
  }

  function handleRegionSelect(regionId: string) {
    setSelectedRegion(regionId)
    setSelectedFrameworks(getFrameworksForRegion(regionId).map(f => f.id))
  }

  function toggleFramework(id: string) {
    setSelectedFrameworks(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  }

  function removeScenario(id: string) {
    setDetectedScenarios(prev => prev.filter(s => s !== id))
  }

  const probeCount = selectedFrameworks.length > 0 && useCaseDescription.trim()
    ? getProbeCount(selectedFrameworks, useCaseDescription)
    : 0
  const estimatedMinutes = Math.ceil((probeCount * 6) / 60)

  const canProceedStep1 = validated

  async function handleRunTest() {
    const config = getModelConfig()
    if (!config.apiKey || !config.apiEndpoint || !useCaseDescription.trim() || selectedFrameworks.length === 0) {
      setError('Please complete all steps.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      sessionStorage.setItem('model_config', JSON.stringify(config))
      const { id } = await startTest({
        model_config: config,
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
  const providerStyle = detected ? getProviderStyle(detected.provider) : null

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Evaluation</p>
        <h1 className="text-xl font-bold text-gray-900">New Compliance Evaluation</h1>
      </div>

      {/* Progress stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => { if (i <= step) setStep(i) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step ? 'bg-violet-600 text-white'
                : i < step ? 'bg-violet-100 text-violet-700 cursor-pointer'
                : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < step ? <CheckCircle2 size={13} /> : <span>{i + 1}</span>}
              {label}
            </button>
            {i < STEPS.length - 1 && <ArrowRight size={12} className="text-gray-300" />}
          </div>
        ))}
      </div>

      {/* ═══════ STEP 1: SMART MODEL INPUT ═══════ */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Connect Your Model</h2>
            <p className="text-sm text-gray-500 mt-1">
              Paste your API key and we&apos;ll auto-detect the provider. Or enter a HuggingFace model name.
            </p>
          </div>

          {/* Smart input */}
          <div className="space-y-2">
            <Label htmlFor="smart-input" className="text-sm font-medium">API Key or HuggingFace Model</Label>
            <Input
              id="smart-input"
              type={detected?.inputType === 'api_key' ? 'password' : 'text'}
              placeholder="e.g., sk-proj-... or gsk_... or meta-llama/Llama-3-8B"
              value={smartInput}
              onChange={(e) => setSmartInput(e.target.value)}
              className="font-mono text-sm h-11"
            />
          </div>

          {/* Detection result */}
          {detected?.detected && (
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${providerStyle?.bg} border-gray-200`}>
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  Detected: <span className={providerStyle?.color}>{detected.providerName}</span>
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {detected.apiEndpoint}
                </p>
              </div>
            </div>
          )}

          {/* HuggingFace needs a separate token */}
          {detected?.inputType === 'model_name' && (
            <div className="space-y-2">
              <Label htmlFor="hf-token" className="text-sm">HuggingFace API Token</Label>
              <Input
                id="hf-token"
                type="password"
                placeholder="hf_..."
                value={hfToken}
                onChange={(e) => { setHfToken(e.target.value); setValidated(false) }}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-gray-400">Get a free token at huggingface.co/settings/tokens</p>
            </div>
          )}

          {/* Model ID selection */}
          {detected?.detected && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model-id" className="text-sm">Model</Label>
                {detected.suggestedModels.length > 1 ? (
                  <select
                    id="model-id"
                    value={modelId}
                    onChange={(e) => { setModelId(e.target.value); setDisplayName(`${detected.providerName} ${e.target.value}`); setValidated(false) }}
                    className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    {detected.suggestedModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <Input id="model-id" value={modelId} onChange={(e) => { setModelId(e.target.value); setValidated(false) }} className="text-sm" />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="display-name" className="text-sm">Display Name</Label>
                <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="My Model" className="text-sm" />
              </div>
            </div>
          )}

          {/* Undetected → show advanced */}
          {detected && !detected.detected && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <p className="font-medium">Could not auto-detect provider</p>
              <p className="text-xs text-amber-600 mt-1">Please fill in the details below manually.</p>
            </div>
          )}

          {/* Advanced / Custom endpoint */}
          {(showAdvanced || (detected && !detected.detected)) && (
            <div className="space-y-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs font-medium text-gray-600"
              >
                <ChevronDown size={14} className={showAdvanced ? 'rotate-180' : ''} />
                Advanced Configuration
              </button>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">API Endpoint</Label>
                  <Input placeholder="https://api.example.com/v1/chat/completions" value={advEndpoint} onChange={(e) => { setAdvEndpoint(e.target.value); setValidated(false) }} className="font-mono text-xs" />
                </div>
                {!detected?.apiKey && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">API Key</Label>
                    <Input type="password" placeholder="Your API key" value={advApiKey} onChange={(e) => { setAdvApiKey(e.target.value); setValidated(false) }} className="font-mono text-xs" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Model ID</Label>
                    <Input placeholder="model-name" value={modelId} onChange={(e) => { setModelId(e.target.value); setValidated(false) }} className="text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">API Format</Label>
                    <select value={advFormat} onChange={(e) => { setAdvFormat(e.target.value as typeof advFormat); setValidated(false) }} className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs">
                      <option value="openai">OpenAI Compatible</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google AI</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Test Connection */}
          {(detected?.detected || showAdvanced) && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
              <Button onClick={handleTestConnection} disabled={validating} variant="outline" size="sm" className="shrink-0">
                {validating ? <><Loader2 size={14} className="mr-1 animate-spin" /> Testing...</> : 'Test Connection'}
              </Button>
              {validated && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                  <CheckCircle2 size={15} /> Connected
                  {validationLatency && <span className="text-gray-400 text-xs font-normal">({validationLatency}ms)</span>}
                </span>
              )}
              {validationError && (
                <span className="flex items-center gap-1.5 text-sm text-red-600">
                  <AlertCircle size={15} /> {validationError}
                </span>
              )}
              {!validated && !validationError && !validating && (
                <span className="text-xs text-gray-400">Verify your model responds before proceeding</span>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={() => setStep(1)} disabled={!canProceedStep1} className="bg-violet-600 hover:bg-violet-700 text-white">
              Next <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══════ STEP 2: SELECT REGION ═══════ */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Select Compliance Region</h2>
            <p className="text-sm text-gray-500 mt-1">Choose the regulatory jurisdiction to evaluate against.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REGIONS.map((region) => {
              const isSelected = selectedRegion === region.id
              const regionFrameworks = getFrameworksForRegion(region.id)
              return (
                <Card key={region.id} className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => handleRegionSelect(region.id)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{region.flag}</span>
                      <CardTitle className="text-base">{region.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {regionFrameworks.map(fw => <Badge key={fw.id} variant="secondary" className="text-[10px]">{fw.shortName}</Badge>)}
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

      {/* ═══════ STEP 3: DESCRIBE USE CASE ═══════ */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Describe Your Use Case</h2>
            <p className="text-sm text-gray-500 mt-1">
              Tell us what your model will be used for. We&apos;ll select relevant evaluation scenarios.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="use-case-desc">What will your model be used for?</Label>
            <textarea
              id="use-case-desc"
              value={useCaseDescription}
              onChange={(e) => setUseCaseDescription(e.target.value)}
              placeholder="e.g., Customer support chatbot for a banking app that handles loan inquiries and financial advice for retail customers in India"
              rows={3}
              className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors resize-none"
            />
          </div>
          {scenarioDetails.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Detected Scenarios</Label>
              <div className="flex flex-wrap gap-2">
                {scenarioDetails.map(s => (
                  <span key={s.id} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${s.color}`}>
                    {s.label}
                    <button onClick={() => removeScenario(s.id)} className="hover:opacity-70"><X size={12} /></button>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft size={14} className="mr-1" /> Back</Button>
            <Button onClick={() => setStep(3)} disabled={!useCaseDescription.trim()} className="bg-violet-600 hover:bg-violet-700 text-white">Next <ArrowRight size={14} className="ml-1" /></Button>
          </div>
        </div>
      )}

      {/* ═══════ STEP 4: FRAMEWORKS & RUN ═══════ */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Review & Start</h2>
          </div>

          {/* Summary */}
          <Card className="border-violet-200 bg-violet-50">
            <CardContent className="pt-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Model</p>
                  <p className="font-medium text-gray-900">{displayName || 'Custom'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Region</p>
                  <p className="font-medium text-gray-900">{REGIONS.find(r => r.id === selectedRegion)?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Use Case</p>
                  <p className="font-medium text-gray-900 text-xs line-clamp-2">{useCaseDescription || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Probes</p>
                  <p className="font-medium text-gray-900">{probeCount} / ~{estimatedMinutes} min</p>
                </div>
              </div>
              {scenarioDetails.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-violet-200">
                  {scenarioDetails.map(s => <Badge key={s.id} variant="secondary" className="text-[10px]">{s.label}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Frameworks */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Compliance Frameworks</CardTitle>
              <CardDescription>Select regulatory frameworks to evaluate against.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {FRAMEWORKS.map(fw => (
                <label key={fw.id} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={selectedFrameworks.includes(fw.id)} onCheckedChange={() => toggleFramework(fw.id)} />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{fw.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px]">{fw.region}</Badge>
                      <Badge variant={fw.status === 'established' ? 'default' : 'secondary'} className="text-[10px]">{fw.status}</Badge>
                    </div>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft size={14} className="mr-1" /> Back</Button>
            <Button size="lg" onClick={handleRunTest} disabled={submitting || selectedFrameworks.length === 0} className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
              {submitting ? <><Loader2 size={14} className="mr-1 animate-spin" /> Starting...</> : 'Start Evaluation'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
