import Link from 'next/link'
import { headers } from 'next/headers'
import { getReport, type ComplianceCheckItem } from '@/lib/api/reports'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import ReportCharts from './charts'
import PrintButton from './print-button'
import BenchmarkButton from './benchmark-button'
import { computeReadinessTier } from '@/lib/scoring'

const readinessTier = computeReadinessTier

function severityColor(severity: string) {
  switch (severity) {
    case 'critical': return 'destructive' as const
    case 'high': return 'destructive' as const
    case 'medium': return 'default' as const
    case 'low': return 'secondary' as const
    default: return 'secondary' as const
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'Pass': return 'bg-green-100 text-green-700'
    case 'Fail': return 'bg-red-100 text-red-700'
    case 'Partial': return 'bg-amber-100 text-amber-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function difficultyColor(d: string) {
  switch (d) {
    case 'Easy': return 'bg-green-100 text-green-700'
    case 'Medium': return 'bg-amber-100 text-amber-700'
    case 'Hard': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-green-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

export default async function ReportPage({ params }: { params: { id: string } }) {
  let report = await getReport(params.id)

  if (!report) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Report Not Found</h1>
        <p className="text-muted-foreground">This report could not be loaded.</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  // If the test is complete but top_risks have not been persisted yet,
  // call the report generator once and refetch.
  if (report.testRun.status === 'complete' && report.testRun.top_risks === null) {
    try {
      const headersList = headers()
      const host = headersList.get('host')
      const protocol = host?.startsWith('localhost') ? 'http' : 'https'
      await fetch(`${protocol}://${host}/api/report/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_run_id: params.id }),
        cache: 'no-store',
      })
      const refreshed = await getReport(params.id)
      if (refreshed) report = refreshed
    } catch (err) {
      console.error('Report generation failed:', err)
    }
  }

  const { testRun, probes, benchmarks, remediations } = report
  const complianceScore = testRun.compliance_score ?? 0
  const capabilityScore = testRun.capability_score ?? 0
  const overallScore = testRun.overall_score ?? complianceScore
  const tier = readinessTier(overallScore)
  const failedProbes = probes.filter((p) => p.score < 7)
  const topRisks = testRun.top_risks ?? []
  const checklist = (testRun.compliance_checklist ?? []) as ComplianceCheckItem[]

  // Calculate dimension scores
  const dimScores: Record<string, { total: number; count: number }> = {}
  for (const p of probes) {
    if (!dimScores[p.dimension]) dimScores[p.dimension] = { total: 0, count: 0 }
    dimScores[p.dimension].total += p.score
    dimScores[p.dimension].count += 1
  }

  const dimensionData = Object.entries(dimScores)
    .map(([dim, s]) => ({
      dimension: dim,
      score: Math.round((s.total / s.count / 10) * 100),
    }))
    .sort((a, b) => a.score - b.score)

  const radarData = Object.entries(dimScores).map(([dim, s]) => ({
    dimension: dim,
    score: Math.round((s.total / s.count / 10) * 100),
    fullMark: 100,
  }))

  // Group checklist by framework
  const checklistByFramework: Record<string, ComplianceCheckItem[]> = {}
  for (const item of checklist) {
    if (!checklistByFramework[item.framework]) checklistByFramework[item.framework] = []
    checklistByFramework[item.framework].push(item)
  }

  // Failed dimensions for deployment verdict
  const failedDims = dimensionData.filter((d) => d.score < 70)

  const testDate = new Date(testRun.created_at).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PrintButton />

      {/* SECTION 1 - Model Identity Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Model Identity Card</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Model</p>
              <p className="font-medium">{testRun.model_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Use Case</p>
              <p className="font-medium">{testRun.use_case}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date Tested</p>
              <p className="font-medium">{testDate}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Probes</p>
              <p className="font-medium">{probes.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Frameworks Tested</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(testRun.frameworks ?? []).map((f: string) => (
                  <Badge key={f} variant="secondary" className="text-xs">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2 - Executive Summary */}
      <Card className={`border ${tier.banner}`}>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-1">Overall Readiness Score</p>
            <p className={`text-7xl font-bold ${tier.text}`}>{overallScore}</p>
            <Badge className={`${tier.color} text-white mt-2 text-sm px-3 py-1`}>
              {tier.label}
            </Badge>
          </div>

          {topRisks.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Top Risks</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {topRisks.map((risk: string, i: number) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-background">
              <p className="text-sm text-muted-foreground">Compliance Score</p>
              <p className={`text-3xl font-bold ${scoreColor(complianceScore)}`}>
                {complianceScore}%
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background">
              <p className="text-sm text-muted-foreground">Capability Score</p>
              <p className={`text-3xl font-bold ${capabilityScore ? scoreColor(capabilityScore) : 'text-muted-foreground'}`}>
                {capabilityScore ? `${capabilityScore}%` : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2.5 - Per-Framework Compliance Scores */}
      {testRun.framework_scores && Object.keys(testRun.framework_scores).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Per-Framework Compliance</CardTitle>
            <CardDescription>Weighted scores per regulatory framework</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(testRun.framework_scores).map(([fwId, fwData]) => {
              const fw = fwData as { score: number; passed: boolean; dimensions?: Record<string, number> }
              return (
                <div key={fwId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{fwId}</span>
                      <Badge variant={fw.passed ? 'default' : 'destructive'} className={fw.passed ? 'bg-green-600' : ''}>
                        {fw.passed ? 'PASS' : 'FAIL'}
                      </Badge>
                    </div>
                    <span className={`text-2xl font-bold ${scoreColor(fw.score)}`}>{fw.score}%</span>
                  </div>
                  {fw.dimensions && (
                    <div className="space-y-2">
                      {Object.entries(fw.dimensions).map(([dim, dimScore]) => (
                        <div key={dim} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{dim}</span>
                            <span className={scoreColor(dimScore as number)}>{dimScore as number}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${(dimScore as number) >= 70 ? 'bg-green-500' : (dimScore as number) >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${dimScore}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Evaluation Metrics Aggregate */}
      {testRun.eval_aggregate && (
        <Card>
          <CardHeader>
            <CardTitle>Multi-Metric Evaluation</CardTitle>
            <CardDescription>7-metric programmatic assessment across all probes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(() => {
                const agg = testRun.eval_aggregate as { accuracy: number; calibration: number; bias: number; toxicity: number; fairness: number | null; efficiency: number } | null
                if (!agg) return null
                return [
                  { label: 'Accuracy', value: agg.accuracy },
                  { label: 'Calibration', value: agg.calibration },
                  { label: 'Bias', value: agg.bias },
                  { label: 'Toxicity', value: agg.toxicity },
                  { label: 'Fairness', value: agg.fairness },
                  { label: 'Efficiency', value: agg.efficiency },
                ]
              })()?.map(({ label, value }) => {
                const pct = value != null ? Math.round(value * 100) : null
                return (
                  <div key={label} className="text-center p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={`text-xl font-bold ${pct != null ? scoreColor(pct) : 'text-muted-foreground'}`}>
                      {pct != null ? `${pct}%` : 'N/A'}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 3 - Dimension Scores Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Dimension Scores Dashboard</CardTitle>
          <CardDescription>Performance across 8 compliance dimensions</CardDescription>
        </CardHeader>
        <CardContent>
          <ReportCharts radarData={radarData} barData={dimensionData} overallScore={overallScore} />
        </CardContent>
      </Card>

      {/* SECTION 4 - Detailed Findings */}
      {failedProbes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Findings</CardTitle>
            <CardDescription>
              {failedProbes.length} probe{failedProbes.length !== 1 ? 's' : ''} scored below compliance threshold (7/10)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dimension</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Violation</TableHead>
                  <TableHead>Ideal Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedProbes.map((probe) => (
                  <TableRow key={probe.id}>
                    <TableCell className="font-medium">{probe.dimension}</TableCell>
                    <TableCell>
                      <Badge className={`${probe.score >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`} variant="secondary">
                        {probe.score}/10
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={severityColor(probe.severity)}>{probe.severity}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm truncate">{probe.violation}</p>
                      <details className="mt-1">
                        <summary className="text-xs text-muted-foreground cursor-pointer">Show prompt &amp; response</summary>
                        <div className="mt-1 space-y-1">
                          <p className="text-xs p-2 bg-muted rounded whitespace-pre-wrap">{probe.prompt_sent}</p>
                          <p className="text-xs p-2 bg-muted rounded whitespace-pre-wrap">{probe.response_received}</p>
                        </div>
                      </details>
                    </TableCell>
                    <TableCell className="max-w-xs text-sm">{probe.ideal_response}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* SECTION 5 - Remediation Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Remediation Guide</CardTitle>
          <CardDescription>Actionable steps to improve compliance scores</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {remediations.length > 0 ? (
            <>
              {remediations.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{item.dimension}</h4>
                    <div className="flex gap-2">
                      <Badge className={difficultyColor(item.difficulty)} variant="secondary">
                        {item.difficulty}
                      </Badge>
                      <Badge variant="outline">{item.technique}</Badge>
                    </div>
                  </div>
                  <p className="text-sm">{item.what_to_fix}</p>
                  <p className="text-sm text-muted-foreground">
                    Expected impact: {item.expected_impact}
                  </p>
                </div>
              ))}
              <p className="text-sm italic text-muted-foreground mt-4">
                Improvement estimates are directional guidance. Actual results depend on your model, training data, and implementation.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              No remediation items generated yet. Run the report generator to get recommendations.
            </p>
          )}
        </CardContent>
      </Card>

      {/* SECTION 6 - Compliance Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Checklist</CardTitle>
          <CardDescription>Requirements by regulatory framework</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(checklistByFramework).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(checklistByFramework).map(([framework, items]) => (
                <div key={framework}>
                  <h4 className="font-medium mb-2">{framework}</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Requirement</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{item.requirement}</TableCell>
                          <TableCell>
                            <Badge className={statusBadge(item.status)} variant="secondary">
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Compliance checklist not yet generated. Run the report generator.
            </p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* SECTION 7 - Capability Benchmark Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Capability Benchmark Results</CardTitle>
              <CardDescription className="mt-1">
                Domain-specific knowledge, truthfulness, and fairness benchmarks
              </CardDescription>
            </div>
            {benchmarks.length === 0 && (
              <BenchmarkButton testRunId={params.id} useCase={testRun.use_case} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {benchmarks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benchmarks.map((b) => (
                <Card key={b.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{b.benchmark_name}</h4>
                      <Badge variant={b.passed ? 'default' : 'destructive'}>
                        {b.passed ? 'Pass' : 'Fail'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{b.benchmark_category ?? 'General'}</p>
                    <p className="text-sm">
                      {b.raw_score != null ? `${Math.round(b.raw_score * 100)}%` : '—'} vs published baseline {b.published_baseline != null ? `${Math.round(b.published_baseline * 100)}%` : '—'}
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${b.passed ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${b.normalized_score}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Normalized: {b.normalized_score}/100
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No benchmarks run yet. Use the button above to run capability benchmarks against your model.
            </p>
          )}
        </CardContent>
      </Card>

      {/* SECTION 8 - Deployment Readiness Verdict */}
      <Card className={`border-2 ${tier.banner}`}>
        <CardContent className="pt-8 pb-8 text-center">
          <p className={`font-bold ${tier.text}`} style={{ fontSize: '96px', lineHeight: 1 }}>
            {overallScore}
          </p>
          <p className={`font-bold mt-2 ${tier.text}`} style={{ fontSize: '32px' }}>
            {tier.label}
          </p>
          <p className="text-muted-foreground mt-4 text-sm">
            Compliance {complianceScore}% {capabilityScore ? `+ Capability ${capabilityScore}%` : ''} = Overall {overallScore}%
          </p>
          {failedDims.length > 0 && (
            <div className="mt-4 text-left max-w-md mx-auto">
              <p className="text-sm font-medium mb-1">Dimensions below threshold:</p>
              <ul className="text-sm list-disc list-inside text-muted-foreground">
                {failedDims.map((d) => (
                  <li key={d.dimension}>
                    {d.dimension}: {d.score}%
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* SECTION 9 - Benchmark Remediation */}
      <Card>
        <CardHeader>
          <CardTitle>Benchmark Remediation</CardTitle>
          <CardDescription>Steps to improve benchmark performance</CardDescription>
        </CardHeader>
        <CardContent>
          {benchmarks.filter((b) => !b.passed).length > 0 ? (
            <div className="space-y-4">
              {benchmarks
                .filter((b) => !b.passed)
                .map((b) => (
                  <div key={b.id} className="border rounded-lg p-4 space-y-2">
                    <h4 className="font-medium">{b.benchmark_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Scored {b.raw_score != null ? `${Math.round(b.raw_score * 100)}%` : '—'} against {b.published_baseline != null ? `${Math.round(b.published_baseline * 100)}%` : '—'} baseline
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="p-2 bg-muted rounded">
                        <p className="font-medium text-xs">Prompt Engineering</p>
                        <p className="text-xs text-muted-foreground">Adjust system prompts for domain accuracy</p>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <p className="font-medium text-xs">RAG</p>
                        <p className="text-xs text-muted-foreground">Add domain-specific knowledge retrieval</p>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <p className="font-medium text-xs">Fine-tuning</p>
                        <p className="text-xs text-muted-foreground">Train on domain-specific datasets</p>
                      </div>
                    </div>
                  </div>
                ))}
              <p className="text-sm italic text-muted-foreground">
                Improvement estimates are directional guidance. Actual results depend on your model, training data, and implementation.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {benchmarks.length === 0
                ? 'Run capability benchmarks first to see remediation suggestions.'
                : 'All benchmarks passed. No remediation needed.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
