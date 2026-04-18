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
  if (score === null) return <span className="text-muted-foreground">—</span>
  const bg = score >= 70 ? 'bg-green-50 border-green-200' : score >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-sm font-medium ${scoreColor(score)} ${bg}`}>
      {score.toFixed(1)}
    </span>
  )
}

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-muted-foreground">—</span>
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tierBadgeClass(tier)}`}>
      {tier}
    </span>
  )
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: React.ReactNode
  subtitle?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="rounded-full bg-muted p-6">
        <svg
          className="w-10 h-10 text-muted-foreground"
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
        <h2 className="text-xl font-semibold mb-1">No tests run yet</h2>
        <p className="text-muted-foreground max-w-sm">
          Start by selecting a use case and running your first AI compliance test.
        </p>
      </div>
      <Button asChild>
        <Link href="/usecases">Run your first test</Link>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Programmatic multi-metric evaluation &middot; 7 deterministic scoring metrics
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/test/new">+ New Evaluation</Link>
        </Button>
      </div>

      {/* Stat widgets */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Tests Run"
          value={stats.totalTests}
          subtitle="All time"
        />
        <StatCard
          title="Avg Compliance Score"
          value={
            stats.avgComplianceScore !== null ? (
              <span className={`text-2xl font-bold rounded px-1 ${scoreColor(stats.avgComplianceScore)}`}>
                {stats.avgComplianceScore.toFixed(1)}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
          subtitle="Completed runs only"
        />
        <StatCard
          title="Avg Capability Score"
          value={
            stats.avgCapabilityScore !== null ? (
              <span className={`text-2xl font-bold rounded px-1 ${scoreColor(stats.avgCapabilityScore)}`}>
                {stats.avgCapabilityScore.toFixed(1)}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
          subtitle="Completed runs only"
        />
        <StatCard
          title="Top Failure Dimension"
          value={
            stats.topFailureDimension ? (
              <span className="text-lg font-semibold capitalize">{stats.topFailureDimension}</span>
            ) : (
              <span className="text-muted-foreground text-lg">—</span>
            )
          }
          subtitle="Most probes scored below 5"
        />
      </div>

      {/* Recent runs table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Test Runs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Use Case</TableHead>
                <TableHead className="text-right">Compliance</TableHead>
                <TableHead className="text-right">Capability</TableHead>
                <TableHead>Readiness Tier</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentRuns.map((run: TestRun) => (
                <TableRow key={run.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/report/${run.id}`} className="font-medium hover:underline block">
                      {run.model_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{run.use_case}</TableCell>
                  <TableCell className="text-right">
                    <ScoreChip score={run.compliance_score} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ScoreChip score={run.capability_score} />
                  </TableCell>
                  <TableCell>
                    <TierBadge tier={run.readiness_tier} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(run.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick start card */}
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="font-semibold">Ready to test a new model?</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Choose a use case to begin a new compliance test run.
            </p>
          </div>
          <Button asChild>
            <Link href="/usecases">Select Use Case</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
