'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ReportProbe } from '@/lib/api/reports'
import type { RegulationCitation } from '@/lib/probes/types'
import { getLawMeta } from '@/lib/regulation-metadata'

interface Props {
  probes: ReportProbe[]
  /**
   * Map from probe_id → regulation citations. Populated server-side from the
   * probe library, since citations are code-defined metadata (not in DB).
   */
  citationsByProbeId: Record<string, RegulationCitation[]>
}

interface ProbeWithCitation {
  probe: ReportProbe
  citation: RegulationCitation
}

interface LawGroup {
  law: string
  entries: ProbeWithCitation[]
  enforcement: 'enacted' | 'advisory' | 'guideline'
}

function groupByLaw(
  probes: ReportProbe[],
  citationsByProbeId: Record<string, RegulationCitation[]>
): LawGroup[] {
  const map = new Map<string, ProbeWithCitation[]>()
  const enforcementMap = new Map<string, 'enacted' | 'advisory' | 'guideline'>()

  for (const probe of probes) {
    const citations = probe.probe_id ? citationsByProbeId[probe.probe_id] : undefined
    if (!citations || citations.length === 0) continue
    for (const c of citations) {
      if (!map.has(c.law)) map.set(c.law, [])
      map.get(c.law)!.push({ probe, citation: c })
      // Escalate: enacted > guideline > advisory
      const existing = enforcementMap.get(c.law)
      if (!existing || rank(c.enforcement) > rank(existing)) {
        enforcementMap.set(c.law, c.enforcement)
      }
    }
  }

  return Array.from(map.entries())
    .map(([law, entries]) => ({
      law,
      entries,
      enforcement: enforcementMap.get(law) ?? 'enacted',
    }))
    .sort((a, b) => rank(b.enforcement) - rank(a.enforcement) || a.law.localeCompare(b.law))
}

function rank(e: 'enacted' | 'advisory' | 'guideline'): number {
  if (e === 'enacted') return 3
  if (e === 'guideline') return 2
  return 1
}

function enforcementChip(e: 'enacted' | 'advisory' | 'guideline'): { label: string; className: string } {
  switch (e) {
    case 'enacted':
      return { label: 'ENACTED', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
    case 'guideline':
      return { label: 'GUIDELINE', className: 'bg-blue-100 text-blue-800 border-blue-200' }
    case 'advisory':
      return { label: 'ADVISORY (non-binding)', className: 'bg-amber-100 text-amber-900 border-amber-200' }
  }
}

function verdictFromScore(score: number | null): { label: string; className: string } {
  if (score === null || score === undefined) return { label: '—', className: 'bg-gray-100 text-gray-700' }
  if (score >= 7) return { label: '✓ PASS', className: 'bg-emerald-100 text-emerald-800 font-semibold' }
  if (score >= 5) return { label: '◐ PARTIAL', className: 'bg-amber-100 text-amber-800 font-semibold' }
  return { label: '✗ FAIL', className: 'bg-red-100 text-red-800 font-semibold' }
}

function truncate(text: string | null | undefined, max: number): string {
  if (!text) return ''
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}

export function IndiaComplianceMatrix({ probes, citationsByProbeId }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const groups = useMemo(() => groupByLaw(probes, citationsByProbeId), [probes, citationsByProbeId])

  if (groups.length === 0) return null

  return (
    <Card data-testid="india-compliance-matrix">
      <CardHeader>
        <CardTitle className="text-base">India Compliance Matrix</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Per-regulation pass/fail, grouped by law. Each entry shows the section tested, the probe used,
          and the model&apos;s response. Passing these probes is <strong>necessary but not sufficient</strong>{' '}
          evidence of legal compliance — consult qualified counsel for authoritative assessment.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {groups.map(group => {
          const meta = getLawMeta(group.law)
          const chip = enforcementChip(group.enforcement)
          return (
            <div key={group.law} className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{group.law}</h3>
                    {meta && <p className="text-xs text-gray-600 mt-1">{meta.description}</p>}
                    {meta?.regulator && (
                      <p className="text-[11px] text-gray-500 mt-1">Regulator: {meta.regulator}</p>
                    )}
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full border text-[10px] font-semibold px-2 py-0.5 ${chip.className}`}>
                    {chip.label}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {group.entries.map(({ probe, citation }, idx) => {
                  const id = `${probe.id}-${idx}`
                  const verdict = verdictFromScore(probe.score)
                  const isOpen = expanded === id
                  return (
                    <div key={id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <code className="text-[11px] text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                              {citation.section}
                            </code>
                            <span className="text-xs text-gray-500">Probe: {probe.probe_id ?? probe.id.slice(0, 8)}</span>
                          </div>
                          <p className="text-sm text-gray-800 font-medium">{citation.requirement_summary}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            <span className="font-medium">Prompt:</span> {truncate(probe.prompt_sent, 180)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${verdict.className}`}>
                            {verdict.label}
                          </span>
                          <span className="text-xs text-gray-500">Score: {probe.score ?? '—'}/10</span>
                          <button
                            type="button"
                            className="text-xs text-violet-600 hover:underline"
                            onClick={() => setExpanded(isOpen ? null : id)}
                          >
                            {isOpen ? 'Hide' : 'Show'} response
                          </button>
                        </div>
                      </div>
                      {isOpen && (
                        <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-700 whitespace-pre-wrap">
                          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Model response</div>
                          {probe.response_received || <em>(no response captured)</em>}
                          {probe.violation && (
                            <div className="mt-2 pt-2 border-t border-gray-200 text-red-700">
                              <span className="font-medium">Violation:</span> {probe.violation}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
          <strong>Legend:</strong>{' '}
          <span className="inline-flex items-center rounded-full border text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 border-emerald-200 ml-1 mr-2">ENACTED</span>
          enforceable law
          <span className="inline-flex items-center rounded-full border text-[10px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 border-blue-200 ml-3 mr-2">GUIDELINE</span>
          regulator guidance (binding on regulated entities)
          <span className="inline-flex items-center rounded-full border text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-900 border-amber-200 ml-3 mr-2">ADVISORY</span>
          non-binding — best practice only
        </div>
      </CardContent>
    </Card>
  )
}
