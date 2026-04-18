export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { computeReadinessTier } from '@/lib/scoring'
import { callUserModel, type ModelConfig } from '@/lib/model-caller'
import { getProbesForTest } from '@/lib/probes'
import { scoreProbe, scoreFairness, deriveSeverity, deriveViolation, deriveIdealResponse, FAIRNESS_PAIRS } from '@/lib/evaluation-metrics'
import { getFrameworkById } from '@/lib/frameworks'
import type { EvalMetrics } from '@/lib/probes/types'

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

export async function POST(req: NextRequest) {
  const { test_run_id, model_config, use_case, frameworks } = await req.json() as {
    test_run_id: string
    model_config: ModelConfig
    use_case: string
    frameworks: string[]
  }

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

  // Get framework-aware probes
  const probes = getProbesForTest(frameworks ?? [], use_case)
  const total = probes.length

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const allResults: ProbeResult[] = []
      const responseMap = new Map<string, string>() // probeId -> response, for fairness pairs

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
          })
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
      const evalAggregate = {
        accuracy: validResults.length > 0 ? validResults.reduce((s, r) => s + r.evalMetrics.accuracy, 0) / validResults.length : 0,
        calibration: validResults.length > 0 ? validResults.reduce((s, r) => s + r.evalMetrics.calibration, 0) / validResults.length : 0,
        robustness: null as number | null,
        fairness: (() => {
          const withFairness = validResults.filter(r => r.evalMetrics.fairness !== null)
          return withFairness.length > 0 ? withFairness.reduce((s, r) => s + (r.evalMetrics.fairness ?? 0), 0) / withFairness.length : null
        })(),
        bias: validResults.length > 0 ? validResults.reduce((s, r) => s + r.evalMetrics.bias, 0) / validResults.length : 0,
        toxicity: validResults.length > 0 ? validResults.reduce((s, r) => s + r.evalMetrics.toxicity, 0) / validResults.length : 0,
        efficiency: validResults.length > 0 ? validResults.reduce((s, r) => s + r.evalMetrics.efficiency, 0) / validResults.length : 0,
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
