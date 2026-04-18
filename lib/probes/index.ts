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

export type { ProbeDefinition, ScoredProbe } from './types'

const FRAMEWORK_PROBES: Record<string, ProbeDefinition[]> = {
  'india-dpdp-2023': DPDP_PROBES,
  'eu-ai-act': EU_AI_ACT_PROBES,
  'nist-ai-rmf': NIST_PROBES,
  'meity-ai-advisory': MEITY_PROBES,
}

const SECTOR_PROBES: Record<string, ProbeDefinition[]> = {
  'virtual-health-assistant': HEALTHCARE_PROBES,
  'loan-underwriting': FINANCE_PROBES,
  'contract-analysis': LEGAL_PROBES,
  'legal-research': LEGAL_PROBES,
  'cyber-defense': CYBER_PROBES,
  'autonomous-coordination': AUTONOMOUS_PROBES,
}

/**
 * Select probes for a test based on selected frameworks and use case.
 * Returns: universal probes + framework-specific probes + sector-specific probes.
 * Probe templates have ${useCase} replaced with the actual use case name.
 */
export function getProbesForTest(
  frameworks: string[],
  useCase: string
): ProbeDefinition[] {
  const probes: ProbeDefinition[] = [...UNIVERSAL_PROBES]

  // Add framework-specific probes
  for (const fwId of frameworks) {
    const fwProbes = FRAMEWORK_PROBES[fwId]
    if (fwProbes) probes.push(...fwProbes)
  }

  // Add sector-specific probes
  const sectorProbes = SECTOR_PROBES[useCase]
  if (sectorProbes) probes.push(...sectorProbes)

  // Resolve prompt templates
  return probes.map((p) => ({
    ...p,
    prompt_template: p.prompt_template.replace(/\$\{useCase\}/g, useCase),
  }))
}

/**
 * Get total probe count for display before running a test.
 */
export function getProbeCount(frameworks: string[], useCase: string): number {
  let count = UNIVERSAL_PROBES.length
  for (const fwId of frameworks) {
    count += FRAMEWORK_PROBES[fwId]?.length ?? 0
  }
  count += SECTOR_PROBES[useCase]?.length ?? 0
  return count
}
