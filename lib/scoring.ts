/**
 * Shared scoring logic for the AI Compliance Evaluator.
 * Single source of truth — light professional theme with violet accents.
 */

export interface ReadinessTierInfo {
  label: string
  color: string
  text: string
  banner: string
}

export function computeReadinessTier(score: number): ReadinessTierInfo {
  if (score >= 85) return { label: 'Deployment Ready', color: 'bg-emerald-500', text: 'text-emerald-600', banner: 'bg-emerald-50 border-emerald-200' }
  if (score >= 70) return { label: 'Conditionally Ready', color: 'bg-amber-500', text: 'text-amber-600', banner: 'bg-amber-50 border-amber-200' }
  if (score >= 50) return { label: 'Not Ready', color: 'bg-orange-500', text: 'text-orange-600', banner: 'bg-orange-50 border-orange-200' }
  return { label: 'Do Not Deploy', color: 'bg-red-500', text: 'text-red-600', banner: 'bg-red-50 border-red-200' }
}

export function tierBadgeClass(tier: string | null | undefined): string {
  switch (tier) {
    case 'Deployment Ready': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'Conditionally Ready': return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'Not Ready': return 'bg-orange-50 text-orange-700 border border-orange-200'
    case 'Do Not Deploy': return 'bg-red-50 text-red-700 border border-red-200'
    default: return 'bg-gray-50 text-gray-600 border border-gray-200'
  }
}

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-gray-400'
  if (score >= 70) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

export function scoreBgColor(score: number | null | undefined): string {
  if (score == null) return 'bg-gray-50'
  if (score >= 70) return 'bg-emerald-50 border-emerald-200'
  if (score >= 50) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

/**
 * Compute compliance score from an array of probe scores.
 * Excludes null scores (probes where scoring failed).
 */
export function computeComplianceScore(scores: (number | null)[]): number {
  const valid = scores.filter((s): s is number => s !== null)
  if (valid.length === 0) return 0
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length
  return Math.round((avg / 10) * 100)
}
