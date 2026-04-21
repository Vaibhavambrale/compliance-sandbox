export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { computeReadinessTier } from '@/lib/scoring'
import { callUserModel, type ModelConfig } from '@/lib/model-caller'
import { getProbesForTest } from '@/lib/probes'
import { scoreProbe, scoreFairness, deriveSeverity, deriveViolation, deriveIdealResponse, FAIRNESS_PAIRS } from '@/lib/evaluation-metrics'
import { getFrameworkById } from '@/lib/frameworks'
import type { EvalMetrics } from '@/lib/probes/types'
import { JudgeBudget } from '@/lib/judge-caller'
import { runSemanticJudges } from '@/lib/deepeval-metrics'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface ProbeResult {
  probeId: string
  probeIndex: number
  framework: string | null
  dimension: string
  response: string
  evalMetrics: EvalMetrics
  score: number  // backward compat: accuracy * 10
  severity: string
  violation: string
}

interface SemanticAggregate {
  bias_semantic: number | null
  toxicity_semantic: number | null
  hallucination: number | null
  pii_leakage: number | null
  judge_model: string | null
  judge_calls_used: number
  judge_budget_max: number
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    test_run_id: string
    model_config: ModelConfig
    use_case: string
    frameworks: string[]
    region?: string
    quick_mode?: boolean
  }
  const { test_run_id, model_config, use_case, frameworks, region, quick_mode } = body

  if (!test_run_id || !model_config || !use_case) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get framework + region-aware probes
  let probes = getProbesForTest(frameworks ?? [], use_case, region)
  // Quick mode: cap to first 10 probes for fast live demo
  if (quick_mode) probes = probes.slice(0, 10)
  const total = probes.length

  // Judge budget — semantic layer. Quick mode disables entirely.
  const semanticEnabled = !quick_mode
  const judgeBudget = new JudgeBudget(
    semanticEnabled ? Number(process.env.JUDGE_MAX_CALLS_PER_RUN ?? 250) : 0
  )

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const allResults: ProbeResult[] = []
      const responseMap = new Map<string, string>() // probeId -> response, for fairness pairs
      const semanticTasks: Promise<void>[] = []  // in-flight judge calls

      for (let i = 0; i < probes.length; i++) {
        const probe = probes[i]

        try {
          // Call user's model via BYOM
          const startTime = Date.now()
          const modelResponse = await callUserModel(model_config, probe.prompt_template)
          const responseTimeMs = Date.now() - startTime
          const tokenCount = modelResponse.split(/\s+/).length

          // Rate limit protection - never remove this delay
          await delay(4000)

          // Programmatic scoring — no LLM call
          const evalMetrics = scoreProbe(modelResponse, probe, responseTimeMs, tokenCount)
          const score = Math.round(evalMetrics.accuracy * 10)
          const severity = deriveSeverity(evalMetrics.accuracy)
          const violation = deriveViolation(probe, evalMetrics)
          const idealResponse = deriveIdealResponse(probe)

          // Store response for fairness pair comparison
          responseMap.set(probe.id, modelResponse)

          const result: ProbeResult = {
            probeId: probe.id,
            probeIndex: i,
            framework: probe.framework,
            dimension: probe.dimension,
            response: modelResponse,
            evalMetrics,
            score,
            severity,
            violation,
          }
          allResults.push(result)

          await supabase.from('test_probes').insert({
            test_run_id,
            dimension: probe.dimension,
            prompt_sent: probe.prompt_template,
            response_received: modelResponse,
            score,
            severity,
            violation,
            ideal_response: idealResponse,
            framework_id: probe.framework,
            probe_id: probe.id,
            eval_metrics: evalMetrics,
            response_time_ms: responseTimeMs,
            token_count: tokenCount,
          })

          send({
            type: 'progress',
            probe_number: i + 1,
            total,
            dimension: probe.dimension,
            framework_id: probe.framework,
            score,
            severity,
            eval_metrics: evalMetrics,
            probe_id: probe.id,
            judge_budget: judgeBudget.snapshot(),
          })

          // Semantic layer — kick off in parallel, non-blocking.
          // When it resolves we emit a `probe_semantic` SSE event and update the DB row.
          if (semanticEnabled && !judgeBudget.exhausted) {
            const probeSnapshot = probe
            const responseSnapshot = modelResponse
            const indexSnapshot = i
            const task = (async () => {
              const semantic = await runSemanticJudges(probeSnapshot, responseSnapshot, judgeBudget)
              // Merge into the in-memory probe result
              const r = allResults.find(r => r.probeId === probeSnapshot.id)
              if (r) r.evalMetrics.semantic = semantic

              // Update DB row with semantic track
              const updatedMetrics: EvalMetrics = {
                ...evalMetrics,
                semantic,
              }
              await supabase
                .from('test_probes')
                .update({ eval_metrics: updatedMetrics })
                .eq('test_run_id', test_run_id)
                .eq('probe_id', probeSnapshot.id)

              send({
                type: 'probe_semantic',
                probe_id: probeSnapshot.id,
                probe_number: indexSnapshot + 1,
                semantic,
                judge_budget: judgeBudget.snapshot(),
              })
            })().catch(err => {
              send({
                type: 'probe_semantic_error',
                probe_id: probeSnapshot.id,
                error: err instanceof Error ? err.message : 'semantic_failed',
              })
            })
            semanticTasks.push(task)
          }
        } catch (err) {
          send({
            type: 'error_probe',
            probe_number: i + 1,
            total,
            dimension: probe.dimension,
            error: err instanceof Error ? err.message : 'Probe failed',
          })
          allResults.push({
            probeId: probe.id,
            probeIndex: i,
            framework: probe.framework,
            dimension: probe.dimension,
            response: '',
            evalMetrics: { accuracy: 0, calibration: 0, robustness: null, fairness: null, bias: 1, toxicity: 1, efficiency: 0 },
            score: 0,
            severity: 'critical',
            violation: err instanceof Error ? err.message : 'Probe execution failed',
          })
        }
      }

      // Wait for all pending semantic judge calls to finish before computing aggregates.
      // Each task is defensive (catches its own errors), so this never rejects.
      if (semanticTasks.length > 0) {
        send({ type: 'semantic_waiting', pending: semanticTasks.length, judge_budget: judgeBudget.snapshot() })
        await Promise.allSettled(semanticTasks)
        send({ type: 'semantic_done', judge_budget: judgeBudget.snapshot() })
      }

      // Fairness pass: compare counterfactual pairs
      for (const pair of FAIRNESS_PAIRS) {
        const resp1 = responseMap.get(pair.probe1Id)
        const resp2 = responseMap.get(pair.probe2Id)
        if (resp1 && resp2) {
          const fairnessScore = scoreFairness(resp1, resp2, pair.demographicTerms)
          // Update results for both probes
          for (const result of allResults) {
            if (result.probeId === pair.probe1Id || result.probeId === pair.probe2Id) {
              result.evalMetrics.fairness = fairnessScore
            }
          }
          // Update DB records
          await supabase
            .from('test_probes')
            .update({ eval_metrics: allResults.find(r => r.probeId === pair.probe1Id)?.evalMetrics })
            .eq('test_run_id', test_run_id)
            .eq('probe_id', pair.probe1Id)
          await supabase
            .from('test_probes')
            .update({ eval_metrics: allResults.find(r => r.probeId === pair.probe2Id)?.evalMetrics })
            .eq('test_run_id', test_run_id)
            .eq('probe_id', pair.probe2Id)
        }
      }

      // Compute per-framework weighted scores
      const frameworkScores: Record<string, { score: number; passed: boolean; dimensions: Record<string, number> }> = {}

      const activeFrameworks = frameworks ?? []
      for (const fwId of activeFrameworks) {
        const fw = getFrameworkById(fwId)
        if (!fw) continue

        // Get probes for this framework (framework-specific + universal probes)
        const fwProbes = allResults.filter(r => r.framework === fwId || r.framework === null)

        // Group by dimension, compute weighted average
        const dimScores: Record<string, { total: number; count: number; weightedTotal: number }> = {}
        for (const r of fwProbes) {
          if (!dimScores[r.dimension]) dimScores[r.dimension] = { total: 0, count: 0, weightedTotal: 0 }
          dimScores[r.dimension].total += r.evalMetrics.accuracy
          dimScores[r.dimension].count += 1
          const weight = fw.dimensionWeights[r.dimension] ?? 1.0
          dimScores[r.dimension].weightedTotal += r.evalMetrics.accuracy * weight
        }

        let weightedSum = 0
        let weightSum = 0
        const dimensions: Record<string, number> = {}

        for (const [dim, data] of Object.entries(dimScores)) {
          const weight = fw.dimensionWeights[dim] ?? 1.0
          const avgAccuracy = data.total / data.count
          dimensions[dim] = Math.round(avgAccuracy * 100)
          weightedSum += avgAccuracy * weight
          weightSum += weight
        }

        const fwScore = weightSum > 0 ? Math.round((weightedSum / weightSum) * 100) : 0
        frameworkScores[fwId] = {
          score: fwScore,
          passed: fwScore >= fw.passThreshold,
          dimensions,
        }
      }

      // Compute overall compliance score
      const validResults = allResults.filter(r => r.score > 0 || r.evalMetrics.accuracy > 0)
      const avgAccuracy = validResults.length > 0
        ? validResults.reduce((sum, r) => sum + r.evalMetrics.accuracy, 0) / validResults.length
        : 0
      const complianceScore = Math.round(avgAccuracy * 100)

      // Compute eval_aggregate (average of each metric across all probes)
      function avgOf(fn: (r: ProbeResult) => number | null | undefined): number | null {
        const vals = validResults.map(fn).filter((v): v is number => typeof v === 'number')
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      }

      const evalAggregate = {
        accuracy: avgOf(r => r.evalMetrics.accuracy) ?? 0,
        calibration: avgOf(r => r.evalMetrics.calibration) ?? 0,
        robustness: null as number | null,
        fairness: avgOf(r => r.evalMetrics.fairness),
        bias: avgOf(r => r.evalMetrics.bias) ?? 0,
        toxicity: avgOf(r => r.evalMetrics.toxicity) ?? 0,
        efficiency: avgOf(r => r.evalMetrics.efficiency) ?? 0,
        semantic: {
          bias_semantic: avgOf(r => r.evalMetrics.semantic?.bias_semantic ?? null),
          toxicity_semantic: avgOf(r => r.evalMetrics.semantic?.toxicity_semantic ?? null),
          hallucination: avgOf(r => r.evalMetrics.semantic?.hallucination ?? null),
          pii_leakage: avgOf(r => r.evalMetrics.semantic?.pii_leakage ?? null),
          judge_model: validResults.find(r => r.evalMetrics.semantic?.judge_model)?.evalMetrics.semantic?.judge_model ?? null,
          judge_calls_used: judgeBudget.consumed,
          judge_budget_max: judgeBudget.max,
        } satisfies SemanticAggregate,
      }

      const { label: readinessTier } = computeReadinessTier(complianceScore)

      await supabase
        .from('test_runs')
        .update({
          status: 'complete',
          compliance_score: complianceScore,
          overall_score: complianceScore,
          readiness_score: complianceScore,
          readiness_tier: readinessTier,
          framework_scores: frameworkScores,
          eval_aggregate: evalAggregate,
        })
        .eq('id', test_run_id)

      send({
        type: 'complete',
        test_run_id,
        compliance_score: complianceScore,
        framework_scores: frameworkScores,
        eval_aggregate: evalAggregate,
      })

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
