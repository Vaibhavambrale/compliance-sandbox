import { ProbeDefinition } from './types'
import { UNIVERSAL_PROBES } from './universal'
import { DPDP_PROBES } from './frameworks/dpdp'
import { EU_AI_ACT_PROBES } from './frameworks/eu-ai-act'
import { NIST_PROBES } from './frameworks/nist'
import { MEITY_PROBES } from './frameworks/meity'
import { IT_ACT_PROBES } from './frameworks/it-act'
import { CPA_PROBES } from './frameworks/cpa'
import { RBI_LENDING_PROBES } from './frameworks/rbi-lending'
import { SEBI_AI_PROBES } from './frameworks/sebi-ai'
import { IRDAI_ICS_PROBES } from './frameworks/irdai-ics'
import { ICMR_AI_PROBES } from './frameworks/icmr-ai'
import { HEALTHCARE_PROBES } from './sectors/healthcare'
import { FINANCE_PROBES } from './sectors/finance'
import { LEGAL_PROBES } from './sectors/legal'
import { CYBER_PROBES } from './sectors/cyber'
import { AUTONOMOUS_PROBES } from './sectors/autonomous'
import { detectScenarios } from './scenario-mapper'

export type { ProbeDefinition, ScoredProbe, RegulationCitation } from './types'
export { detectScenarios, getScenarioDetails, getAllScenarios } from './scenario-mapper'

/**
 * Flat lookup: probeId → regulation_citations. Built once at module load.
 * Used by the India Compliance Matrix on the report page.
 */
export function getCitationsByProbeId(): Record<string, import('./types').RegulationCitation[]> {
  const all = [
    ...UNIVERSAL_PROBES,
    ...DPDP_PROBES,
    ...EU_AI_ACT_PROBES,
    ...NIST_PROBES,
    ...MEITY_PROBES,
    ...IT_ACT_PROBES,
    ...CPA_PROBES,
    ...RBI_LENDING_PROBES,
    ...SEBI_AI_PROBES,
    ...IRDAI_ICS_PROBES,
    ...ICMR_AI_PROBES,
    ...HEALTHCARE_PROBES,
    ...FINANCE_PROBES,
    ...LEGAL_PROBES,
    ...CYBER_PROBES,
    ...AUTONOMOUS_PROBES,
  ]
  const out: Record<string, import('./types').RegulationCitation[]> = {}
  for (const p of all) {
    if (p.regulation_citations?.length) {
      out[p.id] = p.regulation_citations
    }
  }
  return out
}

const FRAMEWORK_PROBES: Record<string, ProbeDefinition[]> = {
  'india-dpdp-2023': DPDP_PROBES,
  'eu-ai-act': EU_AI_ACT_PROBES,
  'nist-ai-rmf': NIST_PROBES,
  'meity-ai-advisory': MEITY_PROBES,
  // India additions (Tier-A baseline + Tier-B sector)
  'india-it-act': IT_ACT_PROBES,
  'india-cpa-2019': CPA_PROBES,
  'india-rbi-lending': RBI_LENDING_PROBES,
  'india-sebi-ai': SEBI_AI_PROBES,
  'india-irdai-ics': IRDAI_ICS_PROBES,
  'india-icmr-ai': ICMR_AI_PROBES,
}

/**
 * India baseline frameworks — applied to EVERY India evaluation regardless
 * of user's framework selection, because these laws bind every startup /
 * AI operator with Indian users.
 */
const INDIA_BASELINE_FRAMEWORKS = [
  'india-dpdp-2023',
  'india-it-act',
  'india-cpa-2019',
  'meity-ai-advisory',
]

/**
 * India sector frameworks — added when the use case scenario matches.
 */
const INDIA_SECTOR_FRAMEWORKS: Record<string, string> = {
  'healthcare': 'india-icmr-ai',
  'finance': 'india-rbi-lending',
  // sebi, irdai kept opt-in via user framework selection
}

/**
 * Maps scenario category IDs to sector-specific probes.
 * Multiple categories can match — probes are deduplicated by ID.
 */
const SCENARIO_PROBES: Record<string, ProbeDefinition[]> = {
  'healthcare': HEALTHCARE_PROBES,
  'finance': FINANCE_PROBES,
  'legal': LEGAL_PROBES,
  'cyber': CYBER_PROBES,
  'autonomous': AUTONOMOUS_PROBES,
  // Extended categories map to existing probes with relevance
  'customer-support': [],      // universal probes cover this
  'hr': [],                    // bias probes from universal are sufficient
  'content-moderation': [],    // safety/toxicity from universal
  'education': [],             // hallucination/transparency from universal
  'general': [],               // universal only
}

/**
 * Select probes for a test based on frameworks, use case description, and
 * optional region.
 *
 * Behaviour:
 * - Universal probes always included.
 * - User-selected frameworks add their probes.
 * - Scenario detection adds sector probes.
 * - If `region === 'India'`: India baseline frameworks (DPDP, IT Act, CPA,
 *   MEITY) are added automatically, and India sector frameworks are added
 *   based on detected scenario (e.g., healthcare → ICMR).
 */
export function getProbesForTest(
  frameworks: string[],
  useCaseDescription: string,
  region?: string
): ProbeDefinition[] {
  const probes: ProbeDefinition[] = [...UNIVERSAL_PROBES]
  const addedProbeIds = new Set(probes.map(p => p.id))
  const effectiveFrameworks = resolveFrameworks(frameworks, useCaseDescription, region)

  for (const fwId of effectiveFrameworks) {
    const fwProbes = FRAMEWORK_PROBES[fwId]
    if (fwProbes) {
      for (const p of fwProbes) {
        if (!addedProbeIds.has(p.id)) {
          probes.push(p)
          addedProbeIds.add(p.id)
        }
      }
    }
  }

  // Detect scenarios from use case description and add matching sector probes
  const scenarios = detectScenarios(useCaseDescription)
  for (const scenarioId of scenarios) {
    const scenarioProbes = SCENARIO_PROBES[scenarioId]
    if (scenarioProbes) {
      for (const p of scenarioProbes) {
        if (!addedProbeIds.has(p.id)) {
          probes.push(p)
          addedProbeIds.add(p.id)
        }
      }
    }
  }

  // Resolve prompt templates — replace ${useCase} with the actual description
  return probes.map((p) => ({
    ...p,
    prompt_template: p.prompt_template.replace(/\$\{useCase\}/g, useCaseDescription),
  }))
}

/**
 * Compute the effective framework list — union of user selection, India
 * baseline (if region=India), and India sector (if scenario matches).
 */
export function resolveFrameworks(
  frameworks: string[],
  useCaseDescription: string,
  region?: string
): string[] {
  const out = new Set<string>(frameworks)

  if (region === 'India') {
    for (const f of INDIA_BASELINE_FRAMEWORKS) out.add(f)

    const scenarios = detectScenarios(useCaseDescription)
    for (const s of scenarios) {
      const sectorFramework = INDIA_SECTOR_FRAMEWORKS[s]
      if (sectorFramework) out.add(sectorFramework)
    }
  }

  return Array.from(out)
}

/**
 * Get total probe count for display before running a test.
 */
export function getProbeCount(
  frameworks: string[],
  useCaseDescription: string,
  region?: string
): number {
  const probeIds = new Set(UNIVERSAL_PROBES.map(p => p.id))
  let count = UNIVERSAL_PROBES.length
  const effectiveFrameworks = resolveFrameworks(frameworks, useCaseDescription, region)

  for (const fwId of effectiveFrameworks) {
    const fwProbes = FRAMEWORK_PROBES[fwId]
    if (fwProbes) {
      for (const p of fwProbes) {
        if (!probeIds.has(p.id)) {
          count++
          probeIds.add(p.id)
        }
      }
    }
  }

  const scenarios = detectScenarios(useCaseDescription)
  for (const scenarioId of scenarios) {
    const scenarioProbes = SCENARIO_PROBES[scenarioId]
    if (scenarioProbes) {
      for (const p of scenarioProbes) {
        if (!probeIds.has(p.id)) {
          count++
          probeIds.add(p.id)
        }
      }
    }
  }

  return count
}
