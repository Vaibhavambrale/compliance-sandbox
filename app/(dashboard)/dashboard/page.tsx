import Link from 'next/link'
import { getDashboardStats, type TestRun } from '@/lib/api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { tierBadgeClass, scoreColor } from '@/lib/scoring'

function ScoreChip({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400">—</span>
  const bg = score >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-semibold ${bg}`}>
      {score.toFixed(1)}
    </span>
  )
}

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-gray-400">—</span>
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${tierBadgeClass(tier)}`}>
      {tier}
    </span>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string
  value: React.ReactNode
  subtitle?: string
  accent?: string
}) {
  return (
    <Card className="border border-gray-200 shadow-sm bg-white">
      <CardContent className="pt-5 pb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{title}</p>
        <div className={`text-2xl font-bold ${accent ?? 'text-gray-900'}`}>{value}</div>
        {subtitle && <p className="text-[11px] text-gray-400 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="rounded-xl bg-violet-50 p-5">
        <svg
          className="w-8 h-8 text-violet-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">No evaluations yet</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Start by configuring your model and running your first AI compliance evaluation.
        </p>
      </div>
      <Button asChild className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
        <Link href="/test/new">Run your first evaluation</Link>
      </Button>
    </div>
  )
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  if (stats.totalTests === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Reports</p>
          <h1 className="text-xl font-bold text-gray-900">Compliance report</h1>
        </div>
        <Button asChild className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm text-xs h-8 px-3">
          <Link href="/test/new">+ New Evaluation</Link>
        </Button>
      </div>

      {/* Stat widgets */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Tests"
          value={stats.totalTests}
          subtitle="All time"
        />
        <StatCard
          title="Compliance Score"
          value={
            stats.avgComplianceScore !== null ? (
              <span className={scoreColor(stats.avgComplianceScore)}>
                {stats.avgComplianceScore.toFixed(1)}%
              </span>
            ) : '—'
          }
          subtitle="Average across runs"
        />
        <StatCard
          title="Capability Score"
          value={
            stats.avgCapabilityScore !== null ? (
              <span className={scoreColor(stats.avgCapabilityScore)}>
                {stats.avgCapabilityScore.toFixed(1)}%
              </span>
            ) : '—'
          }
          subtitle="Benchmark performance"
        />
        <StatCard
          title="Top Failure"
          value={
            stats.topFailureDimension ? (
              <span className="text-base font-semibold text-red-600 capitalize">{stats.topFailureDimension}</span>
            ) : '—'
          }
          subtitle="Most probes below threshold"
        />
      </div>

      {/* Recent runs table */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold text-gray-900">Recent Evaluations</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-3">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-100 hover:bg-transparent">
                <TableHead className="text-xs font-medium text-gray-500">Model</TableHead>
                <TableHead className="text-xs font-medium text-gray-500">Use Case</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 text-right">Compliance</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 text-right">Capability</TableHead>
                <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
                <TableHead className="text-xs font-medium text-gray-500">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentRuns.map((run: TestRun) => (
                <TableRow key={run.id} className="border-gray-50 hover:bg-gray-50/50 cursor-pointer">
                  <TableCell>
                    <Link href={`/report/${run.id}`} className="text-sm font-medium text-gray-900 hover:text-violet-600 transition-colors">
                      {run.model_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{run.use_case}</TableCell>
                  <TableCell className="text-right">
                    <ScoreChip score={run.compliance_score} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ScoreChip score={run.capability_score} />
                  </TableCell>
                  <TableCell>
                    <TierBadge tier={run.readiness_tier} />
                  </TableCell>
                  <TableCell className="text-xs text-gray-400">
                    {new Date(run.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick start */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Ready to test a new model?</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure your model API and run a compliance evaluation.
            </p>
          </div>
          <Button asChild className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm text-xs h-8">
            <Link href="/test/new">Start Evaluation</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
