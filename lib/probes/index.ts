import { ProbeDefinition } from './types'
import { UNIVERSAL_PROBES } from './universal'
import { DPDP_PROBES } from './frameworks/dpdp'
import { EU_AI_ACT_PROBES } from './frameworks/eu-ai-act'
import { NIST_PROBES } from './frameworks/nist'
import { MEITY_PROBES } from './frameworks/meity'
import { HEALTHCARE_PROBES } from './sectors/healthcare'
import { FINANCE_PROBES } from './sectors/finance'
import { LEGAL_PROBES } from './sectors/legal'
import { CYBER_PROBES } from './sectors/cyber'
import { AUTONOMOUS_PROBES } from './sectors/autonomous'
import { detectScenarios } from './scenario-mapper'

export type { ProbeDefinition, ScoredProbe } from './types'
export { detectScenarios, getScenarioDetails, getAllScenarios } from './scenario-mapper'

const FRAMEWORK_PROBES: Record<string, ProbeDefinition[]> = {
  'india-dpdp-2023': DPDP_PROBES,
  'eu-ai-act': EU_AI_ACT_PROBES,
  'nist-ai-rmf': NIST_PROBES,
  'meity-ai-advisory': MEITY_PROBES,
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
 * Select probes for a test based on frameworks and free-text use case description.
 * Uses scenario mapper to detect relevant categories from the description.
 * Returns: universal probes + framework probes + scenario-matched sector probes.
 */
export function getProbesForTest(
  frameworks: string[],
  useCaseDescription: string
): ProbeDefinition[] {
  const probes: ProbeDefinition[] = [...UNIVERSAL_PROBES]
  const addedProbeIds = new Set(probes.map(p => p.id))

  // Add framework-specific probes
  for (const fwId of frameworks) {
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

  // Detect scenarios from use case description and add matching probes
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
 * Get total probe count for display before running a test.
 */
export function getProbeCount(frameworks: string[], useCaseDescription: string): number {
  const probeIds = new Set(UNIVERSAL_PROBES.map(p => p.id))
  let count = UNIVERSAL_PROBES.length

  for (const fwId of frameworks) {
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
