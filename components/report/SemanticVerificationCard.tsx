'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ReportProbe } from '@/lib/api/reports'

interface Props {
  probes: ReportProbe[]
  judgeModel: string | null
}

interface DimRow {
  dimension: string
  count: number
  programmatic: {
    bias: number | null
    toxicity: number | null
    accuracy: number | null
  }
  semantic: {
    bias: number | null
    toxicity: number | null
    hallucination: number | null
    pii: number | null
    coverage: number // % of probes in dim that have semantic scores
  }
}

function avg(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number')
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function aggregate(probes: ReportProbe[]): DimRow[] {
  const byDim = new Map<string, ReportProbe[]>()
  for (const p of probes) {
    if (!byDim.has(p.dimension)) byDim.set(p.dimension, [])
    byDim.get(p.dimension)!.push(p)
  }

  return Array.from(byDim.entries()).map(([dim, ps]) => {
    const withSem = ps.filter(p => p.eval_metrics?.semantic)
    return {
      dimension: dim,
      count: ps.length,
      programmatic: {
        bias: avg(ps.map(p => p.eval_metrics?.bias ?? null)),
        toxicity: avg(ps.map(p => p.eval_metrics?.toxicity ?? null)),
        accuracy: avg(ps.map(p => p.eval_metrics?.accuracy ?? null)),
      },
      semantic: {
        bias: avg(withSem.map(p => p.eval_metrics?.semantic?.bias_semantic ?? null)),
        toxicity: avg(withSem.map(p => p.eval_metrics?.semantic?.toxicity_semantic ?? null)),
        hallucination: avg(withSem.map(p => p.eval_metrics?.semantic?.hallucination ?? null)),
        pii: avg(withSem.map(p => p.eval_metrics?.semantic?.pii_leakage ?? null)),
        coverage: ps.length > 0 ? withSem.length / ps.length : 0,
      },
    }
  })
}

function fmt(v: number | null): string {
  if (v === null || v === undefined) return '—'
  return `${Math.round(v * 100)}%`
}

function scoreClass(v: number | null): string {
  if (v === null) return 'text-gray-400'
  const pct = v * 100
  if (pct >= 70) return 'text-emerald-700 font-semibold'
  if (pct >= 50) return 'text-amber-700 font-semibold'
  return 'text-red-700 font-semibold'
}

function deltaBadge(prog: number | null, sem: number | null): JSX.Element | null {
  if (prog === null || sem === null) return null
  const delta = sem - prog
  const abs = Math.abs(delta)
  if (abs < 0.1) {
    return <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">agree</Badge>
  }
  if (abs < 0.25) {
    return <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">minor diff</Badge>
  }
  return <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">disagree</Badge>
}

export function SemanticVerificationCard({ probes, judgeModel }: Props) {
  const rows = aggregate(probes)
  const anySemantic = rows.some(r => r.semantic.coverage > 0)

  if (!anySemantic) {
    return (
      <Card data-testid="semantic-verification-card">
        <CardHeader>
          <CardTitle className="text-base">Semantic Verification</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No semantic-layer scores on this run. (Either the judge was disabled, quick-mode ran, or an older run is being viewed.)
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="semantic-verification-card">
      <CardHeader>
        <CardTitle className="text-base">Semantic Verification</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          LLM-as-judge semantic scores (ported from DeepEval), cross-checked against programmatic scores.
          Higher is better. &ldquo;Agree&rdquo; means both tracks landed within 10% of each other.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4">Dimension</th>
                <th className="py-2 pr-4 text-center" colSpan={2}>Bias</th>
                <th className="py-2 pr-4 text-center" colSpan={2}>Toxicity</th>
                <th className="py-2 pr-4 text-center">Hallucination</th>
                <th className="py-2 pr-4 text-center">PII</th>
                <th className="py-2 pr-4 text-right">Coverage</th>
              </tr>
              <tr className="border-b text-[10px] uppercase text-muted-foreground">
                <th></th>
                <th className="py-1 pr-2 text-center">Prog</th>
                <th className="py-1 pr-2 text-center">Sem</th>
                <th className="py-1 pr-2 text-center">Prog</th>
                <th className="py-1 pr-2 text-center">Sem</th>
                <th></th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.dimension} className="border-b last:border-b-0">
                  <td className="py-2 pr-4 font-medium">{row.dimension}</td>
                  <td className={`py-2 pr-2 text-center ${scoreClass(row.programmatic.bias)}`}>{fmt(row.programmatic.bias)}</td>
                  <td className="py-2 pr-2 text-center">
                    <div className={`inline-flex flex-col items-center gap-0.5 ${scoreClass(row.semantic.bias)}`}>
                      <span>{fmt(row.semantic.bias)}</span>
                      {deltaBadge(row.programmatic.bias, row.semantic.bias)}
                    </div>
                  </td>
                  <td className={`py-2 pr-2 text-center ${scoreClass(row.programmatic.toxicity)}`}>{fmt(row.programmatic.toxicity)}</td>
                  <td className="py-2 pr-2 text-center">
                    <div className={`inline-flex flex-col items-center gap-0.5 ${scoreClass(row.semantic.toxicity)}`}>
                      <span>{fmt(row.semantic.toxicity)}</span>
                      {deltaBadge(row.programmatic.toxicity, row.semantic.toxicity)}
                    </div>
                  </td>
                  <td className={`py-2 pr-2 text-center ${scoreClass(row.semantic.hallucination)}`}>{fmt(row.semantic.hallucination)}</td>
                  <td className={`py-2 pr-2 text-center ${scoreClass(row.semantic.pii)}`}>{fmt(row.semantic.pii)}</td>
                  <td className="py-2 pr-2 text-right text-xs text-muted-foreground">
                    {Math.round(row.semantic.coverage * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Methodology:</strong> Semantic scores use {judgeModel ?? 'Claude Haiku'} as judge with temperature=0.
            Prompts are verbatim ports of DeepEval&apos;s BiasMetric, ToxicityMetric, HallucinationMetric, and PIILeakageMetric.
          </p>
          <p>
            <strong>Readiness verdict is driven by programmatic scores only</strong> — semantic layer is additive verification, not a gate.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
