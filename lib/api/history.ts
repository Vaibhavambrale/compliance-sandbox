import { supabase } from '@/lib/supabase'

export interface HistoryTestRun {
  id: string
  model_name: string
  use_case: string
  compliance_score: number | null
  capability_score: number | null
  readiness_tier: string | null
  status: string
  created_at: string
}

export interface HistoryFilters {
  use_case?: string
  readiness_tier?: string
  model_name?: string
}

export async function getHistory(filters?: HistoryFilters): Promise<HistoryTestRun[]> {
  let query = supabase
    .from('test_runs')
    .select('id, model_name, use_case, compliance_score, capability_score, readiness_tier, status, created_at')
    .order('created_at', { ascending: false })

  if (filters?.use_case) {
    query = query.eq('use_case', filters.use_case)
  }
  if (filters?.readiness_tier) {
    query = query.eq('readiness_tier', filters.readiness_tier)
  }
  if (filters?.model_name) {
    query = query.eq('model_name', filters.model_name)
  }

  const { data } = await query
  return (data ?? []) as HistoryTestRun[]
}
