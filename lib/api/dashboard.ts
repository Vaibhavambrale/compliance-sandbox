import { supabase } from '@/lib/supabase'

export type TestRun = {
  id: string
  model_name: string
  use_case: string
  compliance_score: number | null
  capability_score: number | null
  readiness_tier: string | null
  framework_scores: Record<string, { score: number; passed: boolean }> | null
  status: string
  created_at: string
}

export type DashboardStats = {
  totalTests: number
  avgComplianceScore: number | null
  avgCapabilityScore: number | null
  topFailureDimension: string | null
  recentRuns: TestRun[]
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    { count: totalTests },
    { data: completeRuns },
    { data: failingProbes },
    { data: recentRuns },
  ] = await Promise.all([
    supabase.from('test_runs').select('*', { count: 'exact', head: true }),
    supabase
      .from('test_runs')
      .select('compliance_score, capability_score')
      .eq('status', 'complete'),
    supabase.from('test_probes').select('dimension').lt('score', 5),
    supabase
      .from('test_runs')
      .select('id, model_name, use_case, compliance_score, capability_score, readiness_tier, framework_scores, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const avgComplianceScore =
    completeRuns && completeRuns.length > 0
      ? completeRuns.reduce((sum, r) => sum + (r.compliance_score ?? 0), 0) / completeRuns.length
      : null

  const avgCapabilityScore =
    completeRuns && completeRuns.length > 0
      ? completeRuns.reduce((sum, r) => sum + (r.capability_score ?? 0), 0) / completeRuns.length
      : null

  const dimensionCounts: Record<string, number> = {}
  failingProbes?.forEach((p) => {
    if (p.dimension) {
      dimensionCounts[p.dimension] = (dimensionCounts[p.dimension] ?? 0) + 1
    }
  })
  const topFailureDimension =
    Object.keys(dimensionCounts).length > 0
      ? Object.entries(dimensionCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null

  return {
    totalTests: totalTests ?? 0,
    avgComplianceScore,
    avgCapabilityScore,
    topFailureDimension,
    recentRuns: (recentRuns ?? []) as TestRun[],
  }
}
