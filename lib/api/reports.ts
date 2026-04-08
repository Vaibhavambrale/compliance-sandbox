import { supabase } from '@/lib/supabase'

export interface ReportProbe {
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

export interface BenchmarkResult {
  id: string
  test_run_id: string
  benchmark_name: string
  source_institution: string
  score: number
  baseline_score: number
  baseline_model: string
  normalized_score: number
  passed: boolean
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
  use_case: string
  frameworks: string[]
  compliance_score: number | null
  capability_score: number | null
  overall_score: number | null
  readiness_tier: string | null
  status: string
  created_at: string
  top_risks: string[] | null
  compliance_checklist: ComplianceCheckItem[] | null
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
