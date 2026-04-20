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
import { REGIONS, getFrameworksForRegion } from '@/lib/frameworks'
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
  // For HuggingFace — whoami + source toggle + live search + resolved provider
  const [hfModelName, setHfModelName] = useState('')
  const [hfResolved, setHfResolved] = useState<{ endpoint: string; providerId: string; provider: string } | null>(null)
  const [hfResolving, setHfResolving] = useState(false)
  const [hfError, setHfError] = useState<string | null>(null)
  const [hfUser, setHfUser] = useState<{ username: string } | null>(null)
  const [hfUserError, setHfUserError] = useState<string | null>(null)
  const [hfSource, setHfSource] = useState<'mine' | 'public'>('public')
  const [hfSearchQuery, setHfSearchQuery] = useState('')
  interface HfSearchResult { id: string; likes: number; available: boolean; firstProvider: string | null }
  const [hfSearchResults, setHfSearchResults] = useState<HfSearchResult[]>([])
  const [hfSearchLoading, setHfSearchLoading] = useState(false)
  const [hfShowDropdown, setHfShowDropdown] = useState(false)

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

  // Auto-validate HF token (whoami) when detected as HF provider
  useEffect(() => {
    setHfUser(null)
    setHfUserError(null)
    setHfSearchResults([])
    if (detected?.provider !== 'huggingface' || !detected.detected) return

    const token = smartInput.trim()
    if (!token) return

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/model/hf-whoami', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: token }),
        })
        const data = await res.json()
        if (cancelled) return
        if (data.valid) {
          setHfUser({ username: data.username })
          setHfUserError(null)
        } else {
          setHfUser(null)
          setHfUserError(data.error || 'Token validation failed')
        }
      } catch {
        if (!cancelled) {
          setHfUserError('Could not reach HuggingFace')
        }
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [smartInput, detected])

  // Live search HF models (debounced 300ms)
  useEffect(() => {
    if (!hfUser || detected?.provider !== 'huggingface') return

    // For "mine" source, fetch once (list user's repo)
    // For "public" source, only fetch when query has content
    if (hfSource === 'public' && !hfSearchQuery.trim()) {
      setHfSearchResults([])
      return
    }

    let cancelled = false
    setHfSearchLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/model/hf-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: smartInput,
            query: hfSearchQuery,
            source: hfSource,
          }),
        })
        const data = await res.json()
        if (!cancelled) {
          setHfSearchResults(data.models ?? [])
        }
      } catch {
        // silent fail — keep existing results
      } finally {
        if (!cancelled) setHfSearchLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [hfSearchQuery, hfSource, hfUser, smartInput, detected])

  // Build the final model config for API calls
  function getModelConfig() {
    // HuggingFace with resolved provider
    if (detected?.provider === 'huggingface' && hfResolved) {
      return {
        name: displayName || hfModelName,
        apiEndpoint: hfResolved.endpoint,
        apiKey: smartInput,
        modelId: hfResolved.providerId,
        apiFormat: 'openai' as const,
      }
    }
    if (detected?.detected && !showAdvanced) {
      return {
        name: displayName || detected.displayName,
        apiEndpoint: detected.apiEndpoint,
        apiKey: detected.apiKey,
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

  // Must have validated connection. For HF, must also have resolved model.
  const canProceedStep1 = validated && (
    detected?.provider !== 'huggingface' || hfResolved !== null
  )

  async function handleRunTest() {
    const config = getModelConfig()
    if (!config.apiKey || !config.apiEndpoint || !useCaseDescription.trim() || selectedFrameworks.length === 0) {
      setError('Please complete all steps.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { id } = await startTest({
        model_config: config,
        region: selectedRegion || 'global',
        use_case: useCaseDescription,
        frameworks: selectedFrameworks,
      })
      // Store model config AFTER successful API call (not before)
      sessionStorage.setItem('model_config', JSON.stringify(config))
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

          {/* HuggingFace: whoami + source toggle + live search */}
          {detected?.provider === 'huggingface' && (
            <div className="space-y-4">
              {/* Whoami status */}
              {hfUser && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <CheckCircle2 size={15} />
                  <span>Signed in as <span className="font-semibold">@{hfUser.username}</span></span>
                </div>
              )}
              {hfUserError && !hfUser && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={15} />
                  <span>{hfUserError}</span>
                </div>
              )}
              {!hfUser && !hfUserError && (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <Loader2 size={15} className="animate-spin" />
                  <span>Validating token...</span>
                </div>
              )}

              {/* Source toggle — only show after whoami succeeds */}
              {hfUser && (
                <>
                  <div>
                    <Label className="text-sm mb-2 block">Model Source</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setHfSource('mine'); setHfSearchQuery(''); setHfModelName(''); setHfResolved(null); setValidated(false) }}
                        className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                          hfSource === 'mine'
                            ? 'border-violet-500 bg-violet-50 text-violet-900'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-xs">My HF Repository</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">Models I&apos;ve uploaded to @{hfUser.username}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setHfSource('public'); setHfSearchQuery(''); setHfModelName(''); setHfResolved(null); setValidated(false) }}
                        className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                          hfSource === 'public'
                            ? 'border-violet-500 bg-violet-50 text-violet-900'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-xs">Public HF Models</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">Any model on HuggingFace Hub</div>
                      </button>
                    </div>
                  </div>

                  {/* Search input with autocomplete */}
                  <div className="space-y-2 relative">
                    <Label htmlFor="hf-search" className="text-sm">
                      {hfSource === 'mine' ? 'Select from your models' : 'Search public models'}
                    </Label>
                    <div className="relative">
                      <Input
                        id="hf-search"
                        placeholder={hfSource === 'mine' ? 'Filter your uploaded models...' : 'Type to search (e.g., llama, mistral, gemma)'}
                        value={hfSearchQuery}
                        onChange={(e) => {
                          setHfSearchQuery(e.target.value)
                          setHfShowDropdown(true)
                          setHfModelName('')
                          setHfResolved(null)
                          setValidated(false)
                        }}
                        onFocus={() => setHfShowDropdown(true)}
                        className="text-sm font-mono pr-10"
                      />
                      {hfSearchLoading && (
                        <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
                      )}
                    </div>

                    {/* Dropdown results */}
                    {hfShowDropdown && hfSearchResults.length > 0 && (
                      <div className="absolute z-10 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                        {hfSearchResults.map(model => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={async () => {
                              setHfModelName(model.id)
                              setHfSearchQuery(model.id)
                              setHfShowDropdown(false)
                              // Auto-resolve provider
                              if (model.available) {
                                setHfResolving(true)
                                setHfError(null)
                                try {
                                  const res = await fetch('/api/model/hf-resolve', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ modelId: model.id, apiKey: smartInput }),
                                  })
                                  const data = await res.json()
                                  if (data.resolved) {
                                    setHfResolved({ endpoint: data.endpoint, providerId: data.providerId, provider: data.provider })
                                    setModelId(data.providerId)
                                    setDisplayName(data.modelName)
                                  } else {
                                    setHfError(data.error || 'Could not resolve')
                                  }
                                } catch {
                                  setHfError('Network error')
                                } finally {
                                  setHfResolving(false)
                                }
                              }
                            }}
                            disabled={!model.available}
                            className={`w-full text-left px-3 py-2 border-b border-gray-100 last:border-b-0 transition-colors ${
                              model.available
                                ? 'hover:bg-violet-50 cursor-pointer'
                                : 'opacity-50 cursor-not-allowed bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {model.available ? (
                                <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                              ) : (
                                <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono font-medium text-gray-900 truncate">{model.id}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                  {model.available
                                    ? `via ${model.firstProvider} · ${model.likes.toLocaleString()} likes`
                                    : 'No free inference provider available'
                                  }
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {hfSource === 'mine' && !hfSearchLoading && hfSearchResults.length === 0 && (
                      <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        No models found in your repository. Switch to &ldquo;Public HF Models&rdquo; to test any model on the Hub.
                      </div>
                    )}
                  </div>

                  {hfResolving && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <Loader2 size={15} className="animate-spin" />
                      <span>Resolving provider...</span>
                    </div>
                  )}

                  {hfResolved && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-emerald-800">Ready via {hfResolved.provider}</p>
                        <p className="text-xs text-emerald-600 mt-0.5 font-mono truncate">{hfModelName}</p>
                      </div>
                    </div>
                  )}

                  {hfError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                      <AlertCircle size={16} className="text-red-600 shrink-0" />
                      <p className="text-sm text-red-700">{hfError}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Model ID + Display Name for non-HF providers */}
          {detected?.detected && detected.provider !== 'huggingface' && (
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

          {/* Test Connection — show when we have enough info to test */}
          {((detected?.detected && detected.provider !== 'huggingface') || (detected?.provider === 'huggingface' && hfResolved) || showAdvanced) && (
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
                <Card key={region.id} className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-violet-500 ring-2 ring-violet-500/20 bg-violet-50/50' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => handleRegionSelect(region.id)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{region.flag}</span>
                        <CardTitle className="text-base">{region.name}</CardTitle>
                      </div>
                      {isSelected && <CheckCircle2 size={20} className="text-violet-600" />}
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

          {/* Frameworks — only show region-specific ones */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Applicable Compliance Frameworks</CardTitle>
              <CardDescription>
                These frameworks apply to your selected region ({REGIONS.find(r => r.id === selectedRegion)?.name ?? 'Global'}).
                All are pre-selected for comprehensive evaluation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {getFrameworksForRegion(selectedRegion ?? 'global').map(fw => (
                <label key={fw.id} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={selectedFrameworks.includes(fw.id)} onCheckedChange={() => toggleFramework(fw.id)} />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{fw.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px]">{fw.region}</Badge>
                      <Badge variant={fw.status === 'established' ? 'default' : 'secondary'} className="text-[10px]">{fw.status}</Badge>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {fw.requirements?.length ?? 0} testable requirements &middot; Pass threshold: {fw.passThreshold}%
                    </p>
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
