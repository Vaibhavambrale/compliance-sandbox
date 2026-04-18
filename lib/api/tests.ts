import { supabase } from '@/lib/supabase'
import type { ModelConfig } from '@/lib/model-caller'

export interface StartTestPayload {
  model_config: {
    name: string
    apiEndpoint: string
    apiKey: string
    modelId: string
    apiFormat: 'openai' | 'anthropic' | 'google' | 'custom'
  }
  region: string
  use_case: string
  frameworks: string[]
}

export interface StartTestResponse {
  id: string
}

export interface EvalMetrics {
  accuracy: number
  calibration: number
  robustness: number | null
  fairness: number | null
  bias: number
  toxicity: number
  efficiency: number
}

export interface TestProbe {
  id: string
  test_run_id: string
  dimension: string
  prompt_sent: string
  response_received: string
  score: number | null
  severity: string
  violation: string
  ideal_response: string
  framework_id: string | null
  probe_id: string | null
  eval_metrics: EvalMetrics | null
  response_time_ms: number | null
  token_count: number | null
  created_at: string
}

export interface TestRun {
  id: string
  model_name: string
  model_provider: string | null
  model_endpoint: string | null
  model_api_format: string | null
  use_case: string
  region: string | null
  frameworks: string[]
  compliance_score: number | null
  capability_score: number | null
  overall_score: number | null
  readiness_tier: string | null
  framework_scores: Record<string, { score: number; passed: boolean; dimensions?: Record<string, number> }> | null
  eval_aggregate: EvalMetrics | null
  status: string
  created_at: string
}

export async function startTest(payload: StartTestPayload): Promise<StartTestResponse> {
  const res = await fetch('/api/test/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to start evaluation' }))
    throw new Error(err.error ?? 'Failed to start evaluation')
  }

  return res.json()
}

export async function getTestRun(id: string): Promise<TestRun | null> {
  const { data, error } = await supabase
    .from('test_runs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as TestRun
}

export async function getTestProbes(testRunId: string): Promise<TestProbe[]> {
  const { data } = await supabase
    .from('test_probes')
    .select('*')
    .eq('test_run_id', testRunId)
    .order('created_at', { ascending: false })

  return (data ?? []) as TestProbe[]
}

export async function startTestStream(params: {
  test_run_id: string
  model_config: ModelConfig
  use_case: string
  frameworks: string[]
}): Promise<Response> {
  return fetch('/api/test/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}
