import Link from 'next/link'
import { getHistory } from '@/lib/api/history'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import HistoryFilters from './filters'

function scoreColor(score: number | null) {
  if (score === null) return 'bg-gray-50 text-gray-600'
  if (score >= 70) return 'bg-emerald-50 text-emerald-700'
  if (score >= 50) return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

function tierVariant(tier: string | null) {
  switch (tier) {
    case 'Deployment Ready': return 'bg-emerald-50 text-emerald-700'
    case 'Conditionally Ready': return 'bg-amber-50 text-amber-700'
    case 'Not Ready': return 'bg-orange-50 text-orange-700'
    case 'Do Not Deploy': return 'bg-red-50 text-red-700'
    default: return 'bg-gray-50 text-gray-600'
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { use_case?: string; readiness_tier?: string; model_name?: string; page?: string }
}) {
  const filters = {
    use_case: searchParams.use_case || undefined,
    readiness_tier: searchParams.readiness_tier || undefined,
    model_name: searchParams.model_name || undefined,
  }

  const allRuns = await getHistory(filters)

  // Extract unique values for filter dropdowns
  const allRunsUnfiltered = await getHistory()
  const uniqueUseCases = Array.from(new Set(allRunsUnfiltered.map((r) => r.use_case))).filter(Boolean)
  const uniqueModels = Array.from(new Set(allRunsUnfiltered.map((r) => r.model_name))).filter(Boolean)
  const uniqueTiers = Array.from(new Set(allRunsUnfiltered.map((r) => r.readiness_tier).filter(Boolean))) as string[]

  // Pagination
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const perPage = 10
  const total = allRuns.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const currentPage = Math.min(page, totalPages)
  const startIdx = (currentPage - 1) * perPage
  const runs = allRuns.slice(startIdx, startIdx + perPage)

  if (total === 0 && !searchParams.use_case && !searchParams.readiness_tier && !searchParams.model_name) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-muted-foreground mt-1">Past test runs and audit trail.</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <p className="text-lg text-muted-foreground">No tests run yet</p>
          <Button asChild>
            <Link href="/test/new">Run your first test</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Build query string helper
  function buildQuery(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = { ...searchParams, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      if (v && k !== 'page') params.set(k, v)
    }
    if (overrides.page) params.set('page', overrides.page)
    const qs = params.toString()
    return qs ? `?${qs}` : ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-muted-foreground mt-1">Past test runs and audit trail.</p>
      </div>

      <HistoryFilters
        useCases={uniqueUseCases}
        models={uniqueModels}
        tiers={uniqueTiers}
        currentUseCase={searchParams.use_case}
        currentModel={searchParams.model_name}
        currentTier={searchParams.readiness_tier}
      />

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Use Case</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Capability</TableHead>
                <TableHead>Readiness</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="text-sm">{formatDate(run.created_at)}</TableCell>
                  <TableCell className="font-medium text-sm">{run.model_name}</TableCell>
                  <TableCell className="text-sm">{run.use_case}</TableCell>
                  <TableCell>
                    <Badge className={scoreColor(run.compliance_score)} variant="secondary">
                      {run.compliance_score !== null ? `${run.compliance_score}%` : '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={scoreColor(run.capability_score)} variant="secondary">
                      {run.capability_score !== null ? `${run.capability_score}%` : '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={tierVariant(run.readiness_tier)} variant="secondary">
                      {run.readiness_tier ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={run.status === 'complete' ? 'default' : 'secondary'}>
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {run.status === 'complete' ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/report/${run.id}`}>View Report</Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/test/${run.id}`}>View</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {runs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No results match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {total > 0 ? startIdx + 1 : 0}–{Math.min(startIdx + perPage, total)} of {total} results
        </p>
        <div className="flex gap-2">
          {currentPage > 1 ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/history${buildQuery({ page: String(currentPage - 1) })}`}>
                Previous
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          {currentPage < totalPages ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/history${buildQuery({ page: String(currentPage + 1) })}`}>
                Next
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
