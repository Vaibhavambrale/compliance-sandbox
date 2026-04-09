'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  HeartPulse,
  Landmark,
  Bot,
  ShieldCheck,
  FileText,
  Scale,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { startTest } from '@/lib/api/tests'

const USE_CASES = [
  {
    id: 'virtual-health-assistant',
    title: 'Virtual Health Assistant',
    description: 'AI-powered patient triage and symptom assessment for telehealth platforms.',
    icon: HeartPulse,
  },
  {
    id: 'loan-underwriting',
    title: 'Loan Underwriting',
    description: 'Automated credit risk evaluation and lending decision support systems.',
    icon: Landmark,
  },
  {
    id: 'autonomous-coordination',
    title: 'Autonomous Coordination',
    description: 'Multi-agent orchestration for complex task planning and execution.',
    icon: Bot,
  },
  {
    id: 'cyber-defense',
    title: 'Cyber Defense',
    description: 'Threat detection and incident response powered by language models.',
    icon: ShieldCheck,
  },
  {
    id: 'contract-analysis',
    title: 'Contract Analysis',
    description: 'Automated clause extraction, risk flagging, and compliance review.',
    icon: FileText,
  },
  {
    id: 'legal-research',
    title: 'Legal Research',
    description: 'Case law search, precedent analysis, and regulatory summarization.',
    icon: Scale,
  },
]

const MODELS = [
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'Google AI Studio',
    note: 'Free tier, 15 req/min',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google AI Studio',
    note: 'Free tier',
  },
  {
    id: 'llama-3-groq',
    name: 'Llama 3 via Groq',
    provider: 'Groq',
    note: 'Free tier, 30 req/min',
  },
  {
    id: 'mixtral-groq',
    name: 'Mixtral via Groq',
    provider: 'Groq',
    note: 'Free tier',
  },
]

const FRAMEWORKS = [
  { id: 'nist-ai-rmf', label: 'NIST AI RMF' },
  { id: 'eu-ai-act', label: 'EU AI Act' },
  { id: 'india-dpdp-2023', label: 'India DPDP Act 2023' },
  { id: 'meity-ai-advisory', label: 'MEITY AI Advisory' },
]

const STEPS = ['Select Use Case', 'Select Model', 'Configure Test']

export default function NewTestPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><div className="h-8 w-48 bg-muted animate-pulse rounded" /><div className="h-4 w-full bg-muted animate-pulse rounded" /></div>}>
      <NewTestPageInner />
    </Suspense>
  )
}

function NewTestPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(0)
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null)

  useEffect(() => {
    const usecase = searchParams.get('usecase')
    if (usecase && USE_CASES.some((uc) => uc.id === usecase)) {
      setSelectedUseCase(usecase)
      setStep(1)
    }
  }, [searchParams])
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(
    FRAMEWORKS.map((f) => f.id)
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleFramework(id: string) {
    setSelectedFrameworks((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  async function handleRunTest() {
    if (!selectedUseCase || !selectedModel || selectedFrameworks.length === 0) {
      setError('Please complete all steps before running the test.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { id } = await startTest({
        use_case: selectedUseCase,
        model: selectedModel,
        frameworks: selectedFrameworks,
      })
      router.push(`/test/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start test')
      setSubmitting(false)
    }
  }

  const progressValue = ((step + 1) / STEPS.length) * 100

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">New Test</h1>
        <p className="text-muted-foreground mt-1">
          Configure and launch a compliance test run.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => {
                if (i <= step) setStep(i)
              }}
              className={`font-medium transition-colors ${
                i === step
                  ? 'text-blue-600'
                  : i < step
                    ? 'text-foreground cursor-pointer hover:text-blue-600'
                    : 'text-muted-foreground'
              }`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>
        <Progress value={progressValue} className="h-2" />
      </div>

      {/* Step 1: Select Use Case */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Select a Use Case</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {USE_CASES.map((uc) => {
              const Icon = uc.icon
              const isSelected = selectedUseCase === uc.id
              return (
                <Card
                  key={uc.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'hover:border-muted-foreground/30'
                  }`}
                  onClick={() => setSelectedUseCase(uc.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-lg p-2 ${
                          isSelected
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base">{uc.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="line-clamp-2">
                      {uc.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setStep(1)}
              disabled={!selectedUseCase}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Select Model */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Select a Model</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODELS.map((m) => {
              const isSelected = selectedModel === m.id
              return (
                <Card
                  key={m.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'hover:border-muted-foreground/30'
                  }`}
                  onClick={() => setSelectedModel(m.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{m.name}</CardTitle>
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-blue-500' : 'border-muted-foreground/40'
                        }`}
                      >
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{m.provider}</p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {m.note}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedModel}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Configure Test */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Configure Test</h2>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compliance Frameworks</CardTitle>
              <CardDescription>
                Select which regulatory frameworks to test against.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {FRAMEWORKS.map((fw) => (
                <label
                  key={fw.id}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedFrameworks.includes(fw.id)}
                    onCheckedChange={() => toggleFramework(fw.id)}
                  />
                  <span className="text-sm font-medium">{fw.label}</span>
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Probe Count</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    40 probes across 8 dimensions (~3 minutes)
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {selectedFrameworks.length} framework{selectedFrameworks.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              size="lg"
              onClick={handleRunTest}
              disabled={submitting || selectedFrameworks.length === 0}
            >
              {submitting ? 'Starting…' : 'Run Test'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
