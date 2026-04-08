import { supabase } from '@/lib/supabase'

export interface StartTestPayload {
  use_case: string
  model: string
  frameworks: string[]
}

export interface StartTestResponse {
  id: string
}

export interface TestProbe {
  id: string
  test_run_id: string
  dimension: string
  prompt: string
  response: string
  score: number
  severity: string
  violation: string
  ideal_response: string
  created_at: string
}

export interface TestRun {
  id: string
  model_name: string
  use_case: string
  frameworks: string[]
  compliance_score: number | null
  overall_score: number | null
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
    const err = await res.json().catch(() => ({ error: 'Failed to start test' }))
    throw new Error(err.error ?? 'Failed to start test')
  }

  return res.json()
}

export async function getTestRun(id: string): Promise<TestRun | null> {
  const { data, error } = await supabase
    .from('test_runs')
    .select('id, model_name, use_case, frameworks, compliance_score, overall_score, status, created_at')
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
  model: string
  use_case: string
}): Promise<Response> {
  return fetch('/api/test/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}
