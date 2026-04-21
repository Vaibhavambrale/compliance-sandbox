'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getTestRun,
  getTestProbes,
  startTestStream,
  type TestRun,
  type TestProbe,
} from '@/lib/api/tests'
import type { EvalMetrics, SemanticMetrics } from '@/lib/probes/types'

interface LiveProbe {
  probe_number: number
  probe_id?: string
  total: number
  dimension: string
  score: number
  severity: string
  prompt?: string
  response?: string
  eval_metrics?: EvalMetrics
}

interface JudgeBudgetSnapshot {
  max: number
  consumed: number
  remaining: number
  exhausted: boolean
}

function MetricBadge({
  label,
  value,
  reason,
  loading,
}: {
  label: string
  value: number | null | undefined
  reason?: string
  loading?: boolean
}) {
  if (loading) {
    return (
      <span
        className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400"
        title={`${label}: pending`}
        data-testid={`metric-${label.toLowerCase()}-loading`}
      >
        {label[0].toUpperCase()}: …
      </span>
    )
  }
  if (value === null || value === undefined) return null
  const pct = Math.round(value * 100)
  const color =
    pct >= 70
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : pct >= 50
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-red-50 text-red-700 border-red-200'
  const tooltip = reason ? `${label}: ${pct}% — ${reason}` : `${label}: ${pct}%`
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${color}`}
      title={tooltip}
      data-testid={`metric-${label.toLowerCase()}`}
    >
      {label[0].toUpperCase()}: {pct}%
    </span>
  )
}

function ProgrammaticRow({ m }: { m: EvalMetrics }) {
  const r = m.reasons ?? {}
  return (
    <div className="flex flex-wrap items-center gap-1" data-testid="programmatic-row">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mr-1">
        Programmatic
      </span>
      <MetricBadge label="Accuracy" value={m.accuracy} reason={r.accuracy} />
      <MetricBadge label="Calibration" value={m.calibration} reason={r.calibration} />
      <MetricBadge label="Bias" value={m.bias} reason={r.bias} />
      <MetricBadge label="Toxicity" value={m.toxicity} reason={r.toxicity} />
      <MetricBadge label="Fairness" value={m.fairness ?? null} reason={r.fairness} />
      <MetricBadge label="Efficiency" value={m.efficiency} reason={r.efficiency} />
    </div>
  )
}

function SemanticRow({
  semantic,
  pending,
}: {
  semantic: SemanticMetrics | null | undefined
  pending: boolean
}) {
  if (!pending && !semantic) return null
  const r = semantic?.reasons ?? {}
  return (
    <div className="flex flex-wrap items-center gap-1" data-testid="semantic-row">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-600 mr-1">
        Semantic (LLM)
      </span>
      {pending && !semantic ? (
        <>
          <MetricBadge label="Bias" value={null} loading />
          <MetricBadge label="Toxicity" value={null} loading />
          <MetricBadge label="Hallucination" value={null} loading />
          <MetricBadge label="PII" value={null} loading />
        </>
      ) : (
        <>
          <MetricBadge label="Bias" value={semantic?.bias_semantic ?? null} reason={r.bias_semantic} />
          <MetricBadge label="Toxicity" value={semantic?.toxicity_semantic ?? null} reason={r.toxicity_semantic} />
          <MetricBadge label="Hallucination" value={semantic?.hallucination ?? null} reason={r.hallucination} />
          <MetricBadge label="PII" value={semantic?.pii_leakage ?? null} reason={r.pii_leakage} />
        </>
      )}
    </div>
  )
}

function JudgeBudgetIndicator({ budget }: { budget: JudgeBudgetSnapshot | null }) {
  if (!budget || budget.max === 0) return null
  const pct = (budget.consumed / budget.max) * 100
  const color = pct >= 100 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-emerald-600'
  return (
    <span className={`text-xs ${color}`} data-testid="judge-budget">
      Judge: {budget.consumed}/{budget.max}
    </span>
  )
}

// Dynamic time estimation replaces fixed SECONDS_PER_PROBE

function probeScoreColor(score: number) {
  if (score >= 7) return 'bg-emerald-50 text-emerald-700'
  if (score >= 5) return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

function severityVariant(severity: string) {
  switch (severity) {
    case 'low': return 'secondary' as const
    case 'medium': return 'default' as const
    case 'high': return 'destructive' as const
    case 'critical': return 'destructive' as const
    default: return 'secondary' as const
  }
}

function complianceColor(score: number) {
  if (score >= 70) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

export default function TestDetailPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams()
  const quickMode = searchParams?.get('quick') === '1'
  const [testRun, setTestRun] = useState<TestRun | null>(null)
  const [probes, setProbes] = useState<LiveProbe[]>([])
  const [savedProbes, setSavedProbes] = useState<TestProbe[]>([])
  const [status, setStatus] = useState<'loading' | 'running' | 'complete' | 'failed' | 'cancelled'>('loading')
  const [completed, setCompleted] = useState(0)
  const [totalProbes, setTotalProbes] = useState(quickMode ? 10 : 50)
  const [complianceScore, setComplianceScore] = useState<number | null>(null)
  const [avgProbeTime, setAvgProbeTime] = useState(6) // seconds per probe, updated dynamically
  const [judgeBudget, setJudgeBudget] = useState<JudgeBudgetSnapshot | null>(null)
  const [semanticPending, setSemanticPending] = useState<Set<string>>(new Set())
  const streamStarted = useRef(false)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const streamStartTimeRef = useRef<number>(0)

  useEffect(() => {
    async function startStream(run: TestRun) {
      if (streamStarted.current) return
      streamStarted.current = true
      setStatus('running')

      try {
        // Get model config from sessionStorage (stored by test wizard)
        const storedConfig = sessionStorage.getItem('model_config')
        if (!storedConfig) {
          // No model config — can't stream. Show completed results if test already ran.
          const existingProbes = await getTestProbes(run.id)
          if (existingProbes.length > 0) {
            setSavedProbes(existingProbes)
            setTotalProbes(existingProbes.length)
            setCompleted(existingProbes.length)
            setComplianceScore(run.compliance_score)
            setStatus('complete')
          } else {
            setStatus('failed')
          }
          return
        }
        const model_config = JSON.parse(storedConfig)

        const res = await startTestStream({
          test_run_id: run.id,
          model_config,
          use_case: run.use_case,
          frameworks: run.frameworks ?? [],
          region: run.region ?? undefined,
          quick_mode: quickMode,
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Stream failed' }))
          setStatus('failed')
          console.error(err.error)
          return
        }

        const reader = res.body?.getReader()
        if (!reader) {
          setStatus('failed')
          return
        }
        readerRef.current = reader
        streamStartTimeRef.current = Date.now()

        const decoder = new TextDecoder()
        let buffer = ''
        let streamComplete = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const dataLine = line.trim()
            if (!dataLine.startsWith('data: ')) continue

            try {
              const data = JSON.parse(dataLine.slice(6))

              if (data.total) setTotalProbes(data.total)

              if (data.type === 'progress') {
                setProbes((prev) => [
                  {
                    probe_number: data.probe_number,
                    probe_id: data.probe_id,
                    total: data.total,
                    dimension: data.dimension,
                    score: data.score,
                    severity: data.severity,
                    eval_metrics: data.eval_metrics,
                  },
                  ...prev,
                ])
                setCompleted(data.probe_number)
                if (data.judge_budget) setJudgeBudget(data.judge_budget)
                // Mark this probe as pending semantic result (only if semantic layer active)
                if (data.probe_id && data.judge_budget && data.judge_budget.max > 0) {
                  setSemanticPending(prev => new Set(prev).add(data.probe_id))
                }
                // Dynamic time estimation
                if (streamStartTimeRef.current && data.probe_number > 1) {
                  const elapsed = (Date.now() - streamStartTimeRef.current) / 1000
                  setAvgProbeTime(elapsed / data.probe_number)
                }
              } else if (data.type === 'probe_semantic') {
                setProbes(prev => prev.map(p =>
                  p.probe_id === data.probe_id
                    ? { ...p, eval_metrics: { ...(p.eval_metrics ?? {} as EvalMetrics), semantic: data.semantic } }
                    : p
                ))
                setSemanticPending(prev => {
                  const next = new Set(prev)
                  next.delete(data.probe_id)
                  return next
                })
                if (data.judge_budget) setJudgeBudget(data.judge_budget)
              } else if (data.type === 'probe_semantic_error') {
                setSemanticPending(prev => {
                  const next = new Set(prev)
                  next.delete(data.probe_id)
                  return next
                })
              } else if (data.type === 'semantic_waiting' || data.type === 'semantic_done') {
                if (data.judge_budget) setJudgeBudget(data.judge_budget)
              } else if (data.type === 'error_probe') {
                setProbes((prev) => [
                  {
                    probe_number: data.probe_number,
                    total: data.total,
                    dimension: data.dimension,
                    score: 0,
                    severity: 'error',
                  },
                  ...prev,
                ])
                setCompleted(data.probe_number)
              } else if (data.type === 'complete') {
                setComplianceScore(data.compliance_score)
                setStatus('complete')
                streamComplete = true
              } else if (data.type === 'error') {
                setCompleted(data.probe_number)
              }
            } catch {
              // skip malformed events
            }
          }
        }

        if (!streamComplete) {
          setStatus('complete')
        }
      } catch {
        setStatus('failed')
      }
    }

    async function init() {
      const run = await getTestRun(params.id)
      if (!run) {
        setStatus('failed')
        return
      }
      setTestRun(run)

      if (run.status === 'complete') {
        setStatus('complete')
        const existingProbes = await getTestProbes(run.id)
        setSavedProbes(existingProbes)
        setTotalProbes(existingProbes.length || 50)
        setCompleted(existingProbes.length || 50)
        setComplianceScore(run.compliance_score)
      } else if (run.status === 'running') {
        startStream(run)
      }
    }

    init()
  }, [params.id, quickMode])

  const progressPercent = (completed / totalProbes) * 100
  const remaining = Math.max(0, totalProbes - completed)
  const secondsLeft = Math.ceil(remaining * avgProbeTime)
  const minutesLeft = Math.floor(secondsLeft / 60)
  const secsLeft = secondsLeft % 60

  async function handleCancel() {
    if (readerRef.current) {
      await readerRef.current.cancel()
      readerRef.current = null
    }
    setStatus('cancelled')
  }

  // Build dimension scores from either live probes or saved probes
  const dimensionScores: Record<string, { total: number; count: number }> = {}
  const probeSource = savedProbes.length > 0 ? savedProbes : probes

  for (const p of probeSource) {
    const dim = p.dimension
    if (!dimensionScores[dim]) dimensionScores[dim] = { total: 0, count: 0 }
    dimensionScores[dim].total += p.score ?? 0
    dimensionScores[dim].count += 1
  }

  if (status === 'loading') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (status === 'failed' && !testRun) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Test Run Not Found</h1>
        <p className="text-muted-foreground">
          This test run could not be loaded.
        </p>
        <Button asChild>
          <Link href="/test/new">Start New Test</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {testRun?.model_name} &mdash; {testRun?.use_case}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Test run {params.id.slice(0, 8)}...
          </p>
        </div>
        <div className="flex items-center gap-2">
          <JudgeBudgetIndicator budget={judgeBudget} />
          {quickMode && (
            <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50" data-testid="quick-mode-badge">
              Quick demo mode
            </Badge>
          )}
          {status === 'running' && (
            <Button variant="outline" size="sm" onClick={handleCancel} className="text-xs text-red-600 border-red-200 hover:bg-red-50">
              Cancel
            </Button>
          )}
          <Badge
            variant={status === 'complete' ? 'default' : status === 'failed' || status === 'cancelled' ? 'destructive' : 'secondary'}
            className={status === 'running' ? 'animate-pulse' : ''}
          >
            {status === 'running' ? 'Running' : status === 'complete' ? 'Complete' : status === 'cancelled' ? 'Cancelled' : 'Failed'}
          </Badge>
        </div>
      </div>

      {quickMode && status === 'running' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 pb-4 text-sm text-amber-800">
            <strong>Quick demo mode active.</strong> Running first 10 probes, semantic-layer LLM judge disabled. Full evaluation uses all 83 probes.
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">
              {completed}/{totalProbes} probes completed
            </span>
            {status === 'running' && (
              <span className="text-muted-foreground">
                ~{minutesLeft > 0 ? `${minutesLeft}m ` : ''}{secsLeft}s remaining
              </span>
            )}
            {status === 'cancelled' && (
              <span className="text-red-600">Evaluation cancelled</span>
            )}
          </div>
          <Progress value={progressPercent} className="h-3" />
        </CardContent>
      </Card>

      {/* Summary (shown when complete) */}
      {status === 'complete' && complianceScore !== null && (
        <>
          <Separator />
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Overall Compliance Score</p>
              <p className={`text-6xl font-bold ${complianceColor(complianceScore)}`}>
                {complianceScore}
              </p>
              <p className="text-sm text-muted-foreground mt-1">out of 100</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scores by Dimension</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(dimensionScores).map(([dim, { total, count }]) => {
                  const avg = count > 0 ? total / count : 0
                  const pct = (avg / 10) * 100
                  return (
                    <div key={dim} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{dim}</span>
                        <span className={complianceColor(pct)}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button asChild>
                <Link href={`/report/${params.id}`}>View Full Report</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/test/new">Run Another Test</Link>
              </Button>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Live feed - from SSE probes */}
      {probes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            {status === 'running' ? 'Live Results' : 'Probe Results'}
          </h2>
          {probes.map((probe, i) => (
            <Card
              key={`live-${probe.probe_number}`}
              className="animate-in fade-in slide-in-from-top-2 duration-300"
              style={{ animationDelay: `${i === 0 ? 0 : 0}ms` }}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      #{probe.probe_number} {probe.dimension}
                    </span>
                    <Badge className={probeScoreColor(probe.score ?? 0)} variant="secondary">
                      {probe.score ?? '—'}/10
                    </Badge>
                    <Badge variant={severityVariant(probe.severity)}>
                      {probe.severity}
                    </Badge>
                  </div>
                </div>
                {probe.eval_metrics && (
                  <div className="space-y-1.5 mt-2">
                    <ProgrammaticRow m={probe.eval_metrics} />
                    <SemanticRow
                      semantic={probe.eval_metrics.semantic ?? null}
                      pending={probe.probe_id ? semanticPending.has(probe.probe_id) : false}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Saved probes (when viewing a completed test) */}
      {savedProbes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Probe Results</h2>
          {savedProbes.map((probe) => (
            <Card key={probe.id}>
              <CardContent className="pt-4 pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{probe.dimension}</span>
                    <Badge className={probeScoreColor(probe.score ?? 0)} variant="secondary">
                      {probe.score ?? '—'}/10
                    </Badge>
                    <Badge variant={severityVariant(probe.severity)}>
                      {probe.severity}
                    </Badge>
                  </div>
                </div>
                {probe.eval_metrics && (
                  <div className="space-y-1.5">
                    <ProgrammaticRow m={probe.eval_metrics} />
                    <SemanticRow semantic={probe.eval_metrics.semantic ?? null} pending={false} />
                  </div>
                )}
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Show prompt
                  </summary>
                  <p className="mt-1 p-2 rounded bg-muted text-xs whitespace-pre-wrap">
                    {probe.prompt_sent}
                  </p>
                </details>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Show model response
                  </summary>
                  <p className="mt-1 p-2 rounded bg-muted text-xs whitespace-pre-wrap">
                    {probe.response_received}
                  </p>
                </details>
                {probe.violation && (
                  <p className="text-xs text-red-600">Violation: {probe.violation}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
