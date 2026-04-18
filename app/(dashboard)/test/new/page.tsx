'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import {
  HeartPulse,
  Landmark,
  Bot,
  ShieldCheck,
  FileText,
  Scale,
  ArrowRight,
  ArrowLeft,
  Zap,
  CheckCircle2,
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
import { getProbeCount } from '@/lib/probes'

const USE_CASES = [
  { id: 'virtual-health-assistant', title: 'Virtual Health Assistant', description: 'AI-powered patient triage and symptom assessment for telehealth platforms.', icon: HeartPulse },
  { id: 'loan-underwriting', title: 'Loan Underwriting', description: 'Automated credit risk evaluation and lending decision support systems.', icon: Landmark },
  { id: 'autonomous-coordination', title: 'Autonomous Coordination', description: 'Multi-agent orchestration for complex task planning and execution.', icon: Bot },
  { id: 'cyber-defense', title: 'Cyber Defense', description: 'Threat detection and incident response powered by language models.', icon: ShieldCheck },
  { id: 'contract-analysis', title: 'Contract Analysis', description: 'Automated clause extraction, risk flagging, and compliance review.', icon: FileText },
  { id: 'legal-research', title: 'Legal Research', description: 'Case law search, precedent analysis, and regulatory summarization.', icon: Scale },
]

const STEPS = ['Configure Model', 'Select Region', 'Select Use Case', 'Frameworks & Run']

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

  // Step 2: Region
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  // Step 3: Use case
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null)

  // Step 4: Frameworks
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function applyPreset(presetId: string) {
    const preset = PROVIDER_PRESETS.find(p => p.id === presetId)
    if (!preset) return
    setApiEndpoint(preset.apiEndpoint)
    setApiFormat(preset.apiFormat)
    setModelName(preset.name + ' Model')
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

  const probeCount = selectedFrameworks.length > 0 && selectedUseCase
    ? getProbeCount(selectedFrameworks, selectedUseCase)
    : 0
  const estimatedMinutes = Math.ceil((probeCount * 6) / 60)

  const modelConfigValid = modelName && apiEndpoint && apiKey && modelId

  async function handleRunTest() {
    if (!modelConfigValid || !selectedUseCase || selectedFrameworks.length === 0) {
      setError('Please complete all steps before running the evaluation.')
      return
    }

    setSubmitting(true)
    setError(null)

    const modelConfig = { name: modelName, apiEndpoint, apiKey, modelId, apiFormat }

    try {
      // Store model config in sessionStorage for the live test page
      sessionStorage.setItem('model_config', JSON.stringify(modelConfig))

      const { id } = await startTest({
        model_config: modelConfig,
        region: selectedRegion || 'global',
        use_case: selectedUseCase,
        frameworks: selectedFrameworks,
      })
      router.push(`/test/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start evaluation')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">New Compliance Evaluation</h1>
        <p className="text-muted-foreground mt-1">
          Configure your model and select compliance parameters.
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
                  ? 'bg-emerald-600 text-white'
                  : i < step
                    ? 'bg-emerald-500/20 text-emerald-400 cursor-pointer'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < step ? <CheckCircle2 size={14} /> : <span>{i + 1}</span>}
              {label}
            </button>
            {i < STEPS.length - 1 && <ArrowRight size={14} className="text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Configure Model */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Configure Your Model</h2>
            <p className="text-sm text-muted-foreground mt-1">Provide the API details for the model you want to evaluate.</p>
          </div>

          {/* Provider presets */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Setup — Select Provider</Label>
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
              <Input id="model-name" placeholder="e.g., Our GPT-4o Deployment" value={modelName} onChange={(e) => setModelName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-id">Model ID</Label>
              <Input id="model-id" placeholder="e.g., gpt-4o, gemini-1.5-flash" value={modelId} onChange={(e) => setModelId(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="api-endpoint">API Endpoint</Label>
              <Input id="api-endpoint" placeholder="https://api.openai.com/v1/chat/completions" value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input id="api-key" type="password" placeholder="sk-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-format">API Format</Label>
              <select
                id="api-format"
                value={apiFormat}
                onChange={(e) => setApiFormat(e.target.value as typeof apiFormat)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="openai">OpenAI Compatible</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google AI Studio</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setStep(1)} disabled={!modelConfigValid}>
              Next <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Select Region */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Select Compliance Region</h2>
            <p className="text-sm text-muted-foreground mt-1">Choose the regulatory jurisdiction to evaluate against.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REGIONS.map((region) => {
              const isSelected = selectedRegion === region.id
              const regionFrameworks = getFrameworksForRegion(region.id)
              return (
                <Card
                  key={region.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'hover:border-muted-foreground/30'
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
            <Button onClick={() => setStep(2)} disabled={!selectedRegion}>Next <ArrowRight size={14} className="ml-1" /></Button>
          </div>
        </div>
      )}

      {/* Step 3: Select Use Case */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Select Deployment Use Case</h2>
            <p className="text-sm text-muted-foreground mt-1">What will the model be used for? This determines sector-specific probes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {USE_CASES.map((uc) => {
              const Icon = uc.icon
              const isSelected = selectedUseCase === uc.id
              return (
                <Card
                  key={uc.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'hover:border-muted-foreground/30'
                  }`}
                  onClick={() => setSelectedUseCase(uc.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-sm">{uc.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs line-clamp-2">{uc.description}</CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft size={14} className="mr-1" /> Back</Button>
            <Button onClick={() => setStep(3)} disabled={!selectedUseCase}>Next <ArrowRight size={14} className="ml-1" /></Button>
          </div>
        </div>
      )}

      {/* Step 4: Frameworks & Run */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Review & Start Evaluation</h2>
            <p className="text-sm text-muted-foreground mt-1">Confirm frameworks and start the compliance evaluation.</p>
          </div>

          {/* Test summary */}
          <Card className="border-emerald-500/20 bg-emerald-500/10">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Model</p>
                  <p className="font-medium">{modelName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Region</p>
                  <p className="font-medium">{REGIONS.find(r => r.id === selectedRegion)?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Use Case</p>
                  <p className="font-medium">{USE_CASES.find(u => u.id === selectedUseCase)?.title ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Estimated</p>
                  <p className="font-medium">{probeCount} probes / ~{estimatedMinutes} min</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Framework selection */}
          <Card>
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
                    <span className="text-sm font-medium">{fw.name}</span>
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

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft size={14} className="mr-1" /> Back
            </Button>
            <Button
              size="lg"
              onClick={handleRunTest}
              disabled={submitting || selectedFrameworks.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? 'Starting Evaluation...' : 'Start Compliance Evaluation'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
