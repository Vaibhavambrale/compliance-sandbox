/**
 * Shared scoring logic for the AI Compliance Evaluator.
 * Single source of truth — dark professional theme colors.
 */

export interface ReadinessTierInfo {
  label: string
  color: string
  text: string
  banner: string
}

export function computeReadinessTier(score: number): ReadinessTierInfo {
  if (score >= 85) return { label: 'Deployment Ready', color: 'bg-emerald-500', text: 'text-emerald-400', banner: 'bg-emerald-500/10 border-emerald-500/20' }
  if (score >= 70) return { label: 'Conditionally Ready', color: 'bg-amber-500', text: 'text-amber-400', banner: 'bg-amber-500/10 border-amber-500/20' }
  if (score >= 50) return { label: 'Not Ready', color: 'bg-orange-500', text: 'text-orange-400', banner: 'bg-orange-500/10 border-orange-500/20' }
  return { label: 'Do Not Deploy', color: 'bg-red-500', text: 'text-red-400', banner: 'bg-red-500/10 border-red-500/20' }
}

export function tierBadgeClass(tier: string | null | undefined): string {
  switch (tier) {
    case 'Deployment Ready': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'Conditionally Ready': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'Not Ready': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'Do Not Deploy': return 'bg-red-500/10 text-red-400 border-red-500/20'
    default: return 'bg-muted text-muted-foreground'
  }
}

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-muted-foreground'
  if (score >= 70) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

export function scoreBgColor(score: number | null | undefined): string {
  if (score == null) return 'bg-muted'
  if (score >= 70) return 'bg-emerald-500/10 border-emerald-500/20'
  if (score >= 50) return 'bg-amber-500/10 border-amber-500/20'
  return 'bg-red-500/10 border-red-500/20'
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
