export type ScoringType =
  | 'refusal_detection'       // Should refuse harmful requests
  | 'hallucination_detection' // Should admit uncertainty about fabricated sources
  | 'pii_handling'            // Should protect PII
  | 'disclosure_check'        // Should disclose AI nature/limitations
  | 'counterfactual_pair'     // Paired with another probe for fairness comparison
  | 'keyword_compliance'      // Should contain required keywords, avoid forbidden ones

export interface GroundTruth {
  expected_behavior: 'should_refuse' | 'should_admit_uncertainty' | 'should_protect_pii' | 'should_disclose' | 'should_comply'
  required_keywords?: string[]
  forbidden_keywords?: string[]
  refusal_signals?: string[]
  compliance_signals?: string[]
  pair_id?: string
  pii_patterns?: string[]
}

/**
 * Structured citation linking a probe to the specific regulation / section it tests.
 * Optional — probes without citations are still valid.
 * UI uses `enforcement` to show ADVISORY vs ENACTED chips distinctly.
 */
export interface RegulationCitation {
  law: string                                           // e.g., "DPDP Act 2023"
  section: string                                       // e.g., "§8(3)"
  sector?: string                                       // e.g., "loan-underwriting"; undefined = all sectors
  enforcement: 'enacted' | 'advisory' | 'guideline'
  requirement_summary: string                           // one-line plain English
}

export interface ProbeDefinition {
  id: string
  dimension: string
  framework: string | null  // null = universal probe
  prompt_template: string   // uses ${useCase} placeholder
  weight: number            // 1.0 default
  tags: string[]
  scoring_type: ScoringType
  ground_truth: GroundTruth
  regulation_citations?: RegulationCitation[]
}

export type ProgrammaticMetricKey =
  | 'accuracy'
  | 'calibration'
  | 'robustness'
  | 'fairness'
  | 'bias'
  | 'toxicity'
  | 'efficiency'

export type SemanticMetricKey =
  | 'bias_semantic'
  | 'toxicity_semantic'
  | 'hallucination'
  | 'pii_leakage'

export interface SemanticMetrics {
  bias_semantic: number | null       // 0-1 (1 = no bias). null = judge failed or skipped
  toxicity_semantic: number | null   // 0-1 (1 = no toxicity)
  hallucination: number | null       // 0-1 (1 = no hallucination)
  pii_leakage: number | null         // 0-1 (1 = no leakage)
  reasons: Partial<Record<SemanticMetricKey, string>>
  errors: string[]                   // any per-metric failures
  judge_model: string | null         // which model produced the scores
}

export interface EvalMetrics {
  accuracy: number        // 0-1
  calibration: number     // 0-1
  robustness: number | null  // null = not measured (requires perturbation variants)
  fairness: number | null    // null = not a paired probe, filled after paired comparison
  bias: number            // 0-1
  toxicity: number        // 0-1
  efficiency: number      // 0-1
  // NEW — additive, always optional so old rows keep working
  reasons?: Partial<Record<ProgrammaticMetricKey, string>>
  semantic?: SemanticMetrics | null
}

export interface ScoredProbe extends ProbeDefinition {
  score: number | null         // backward compat: accuracy * 10
  eval_metrics: EvalMetrics | null
  severity: string
  violation: string
  ideal_response: string
  response_received: string
}
