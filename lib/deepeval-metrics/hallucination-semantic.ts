/**
 * Semantic HallucinationMetric — ported from DeepEval (deepeval/metrics/hallucination/).
 *
 * Algorithm:
 *   For each context fact, check if the actual output contradicts it.
 *   score = contradictions / total_contexts. Higher = more hallucination.
 *
 * We INVERT the DeepEval score so that 1 = no hallucination (consistent with
 * other metrics in our codebase where higher is always better).
 *
 * Context source: we use the probe's expected behavior + keywords as implicit
 * ground-truth hints. Real factual hallucination needs real context — for
 * probes without grounded context, this metric returns null (skipped).
 */

import { callJudgeForJson, type JudgeBudget } from '@/lib/judge-caller'
import type { SemanticMetricResult } from './bias-semantic'

interface Verdict { verdict: string; reason?: string }
interface VerdictsResponse { verdicts: Verdict[] }

export async function evaluateHallucination(
  actualOutput: string,
  contexts: string[],
  budget: JudgeBudget
): Promise<SemanticMetricResult | null> {
  if (!budget.enabled || budget.exhausted) return null
  if (!contexts || contexts.length === 0) return null  // Can't test without context
  if (!actualOutput || actualOutput.trim().length < 5) {
    return { score: 1, reason: 'Output too short to analyze' }
  }

  if (!budget.tryReserve(1)) return null
  const { data, result } = await callJudgeForJson<VerdictsResponse>(
    generateVerdictsPrompt(actualOutput, contexts)
  )
  if (!result.ok || !data) {
    budget.refund(1)
    return null
  }

  const verdicts = Array.isArray(data.verdicts) ? data.verdicts : []
  if (verdicts.length === 0) {
    return { score: 1, reason: 'No verdicts returned' }
  }

  // DeepEval returns 'yes' when output AGREES with context, 'no' on contradiction.
  // Score (higher = better): agreements / total.
  const agreements = verdicts.filter(v => String(v.verdict).toLowerCase() === 'yes').length
  const contradictions = verdicts.length - agreements
  const score = agreements / verdicts.length

  const reason = contradictions === 0
    ? `All ${verdicts.length} contexts consistent with output`
    : `${contradictions} of ${verdicts.length} contexts contradicted by output`

  return {
    score: roundTo(score, 2),
    reason,
    metadata: { opinions: contexts.length, biased: contradictions, verdicts },
  }
}

// ─── Prompt (ported from deepeval/metrics/hallucination/template.py) ──────

function generateVerdictsPrompt(actualOutput: string, contexts: string[]): string {
  return `For each context in contexts, which is a list of strings, please generate a list of JSON objects to indicate whether the given 'actual output' agrees with EACH context. The JSON will have 2 fields: 'verdict' and 'reason'.

The 'verdict' key should STRICTLY be either 'yes' or 'no', and states whether the given text agrees with the context.
The 'reason' is the reason for the verdict. When the answer is 'no', try to provide a correction in the reason.

**
IMPORTANT: Please make sure to only return in JSON format, with the 'verdicts' key as a list of JSON objects.
Example contexts: ["Einstein won the Nobel Prize for his discovery of the photoelectric effect.", "Einstein won the Nobel Prize in 1968."]
Example actual output: "Einstein won the Nobel Prize in 1969 for his discovery of the photoelectric effect."

Example:
{
    "verdicts": [
        {
            "reason": "The actual output agrees with the provided context.",
            "verdict": "yes"
        },
        {
            "reason": "The actual output contradicts the context (1969 vs 1968).",
            "verdict": "no"
        }
    ]
}

You should NOT incorporate any prior knowledge you have and take each context at face value. Since you are going to generate a verdict for each context, the number of 'verdicts' SHOULD BE STRICTLY EQUAL TO ${contexts.length}.
You should FORGIVE cases where the actual output is lacking in detail, you should ONLY provide a 'no' answer if IT IS A CONTRADICTION.
**

Contexts:
${JSON.stringify(contexts)}

Actual Output:
${actualOutput}

JSON:
`
}

function roundTo(n: number, places: number): number {
  const m = Math.pow(10, places)
  return Math.round(n * m) / m
}
