import { supabase } from '@/lib/supabase'

export interface ReportEvalMetrics {
  accuracy: number
  calibration: number
  robustness: number | null
  fairness: number | null
  bias: number
  toxicity: number
  efficiency: number
}

export interface ReportProbe {
  id: string
  test_run_id: string
  dimension: string
  prompt_sent: string
  response_received: string
  score: number
  severity: string
  violation: string
  ideal_response: string
  framework_id: string | null
  probe_id: string | null
  eval_metrics: ReportEvalMetrics | null
  response_time_ms: number | null
  token_count: number | null
  created_at: string
}

export interface BenchmarkResult {
  id: string
  test_run_id: string
  benchmark_name: string
  benchmark_category: string | null
  questions_asked: number | null
  raw_score: number | null
  normalized_score: number | null
  published_baseline: number | null
  minimum_acceptable: number | null
  passed: boolean | null
  sample_questions: unknown | null
  created_at: string
}

export interface RemediationItem {
  id: string
  test_run_id: string
  dimension: string
  what_to_fix: string
  technique: string
  difficulty: string
  expected_impact: string
  created_at: string
}

export interface ReportTestRun {
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
  readiness_score: number | null
  readiness_tier: string | null
  status: string
  created_at: string
  top_risks: string[] | null
  compliance_checklist: ComplianceCheckItem[] | null
  framework_scores: Record<string, { score: number; passed: boolean; dimensions?: Record<string, number> }> | null
  eval_aggregate: ReportEvalMetrics | null
}

export interface ComplianceCheckItem {
  framework: string
  requirement: string
  status: 'Pass' | 'Fail' | 'Partial'
}

export interface ReportData {
  testRun: ReportTestRun
  probes: ReportProbe[]
  benchmarks: BenchmarkResult[]
  remediations: RemediationItem[]
}

export async function getReport(id: string): Promise<ReportData | null> {
  const [
    { data: testRun, error: runError },
    { data: probes },
    { data: benchmarks },
    { data: remediations },
  ] = await Promise.all([
    supabase
      .from('test_runs')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('test_probes')
      .select('*')
      .eq('test_run_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('benchmark_results')
      .select('*')
      .eq('test_run_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('remediation_items')
      .select('*')
      .eq('test_run_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (runError || !testRun) return null

  return {
    testRun: testRun as ReportTestRun,
    probes: (probes ?? []) as ReportProbe[],
    benchmarks: (benchmarks ?? []) as BenchmarkResult[],
    remediations: (remediations ?? []) as RemediationItem[],
  }
}
