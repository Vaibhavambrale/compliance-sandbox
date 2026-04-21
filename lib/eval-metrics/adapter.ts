/**
 * Adapter layer for reading EvalMetrics from storage.
 *
 * Old rows: { accuracy, calibration, bias, ... }
 * New rows: same + { reasons?, semantic? }
 *
 * Consumers should call `readEvalMetrics(raw)` to get a normalized shape
 * where optional fields always exist (reasons={}, semantic=null).
 */

import type {
  EvalMetrics,
  SemanticMetrics,
  ProgrammaticMetricKey,
} from '@/lib/probes/types'

export interface NormalizedEvalMetrics {
  accuracy: number
  calibration: number
  robustness: number | null
  fairness: number | null
  bias: number
  toxicity: number
  efficiency: number
  reasons: Partial<Record<ProgrammaticMetricKey, string>>
  semantic: SemanticMetrics | null
}

/**
 * Normalize raw eval_metrics JSONB into a consistent shape.
 * Never throws. Missing numeric fields default to 0.
 */
export function readEvalMetrics(
  raw: Partial<EvalMetrics> | null | undefined
): NormalizedEvalMetrics {
  const r = raw ?? {}
  return {
    accuracy: num(r.accuracy),
    calibration: num(r.calibration),
    robustness: nullableNum(r.robustness),
    fairness: nullableNum(r.fairness),
    bias: num(r.bias),
    toxicity: num(r.toxicity),
    efficiency: num(r.efficiency),
    reasons: r.reasons ?? {},
    semantic: r.semantic ?? null,
  }
}

/**
 * True if this row has semantic scores attached (i.e., ran under new dual-track).
 */
export function hasSemantic(raw: Partial<EvalMetrics> | null | undefined): boolean {
  return Boolean(raw?.semantic)
}

function num(v: unknown): number {
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0
}

function nullableNum(v: unknown): number | null {
  if (v === null || v === undefined) return null
  return typeof v === 'number' && !Number.isNaN(v) ? v : null
}
