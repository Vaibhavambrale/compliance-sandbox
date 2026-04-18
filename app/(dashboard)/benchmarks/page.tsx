import { supabase } from '@/lib/supabase'
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
import Link from 'next/link'

interface BenchmarkRow {
  id: string
  test_run_id: string
  benchmark_name: string
  benchmark_category: string | null
  questions_asked: number | null
  raw_score: number | null
  normalized_score: number | null
  published_baseline: number | null
  passed: boolean | null
  created_at: string
  test_runs: {
    model_name: string
    use_case: string
  } | null
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

export default async function BenchmarksPage() {
  const { data: benchmarks } = await supabase
    .from('benchmark_results')
    .select('*, test_runs(model_name, use_case)')
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (benchmarks ?? []) as BenchmarkRow[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Capability Benchmarks</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Domain-specific knowledge, truthfulness, and fairness benchmark results across all evaluations
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-2">No benchmark results yet.</p>
            <p className="text-sm text-muted-foreground">
              Run a compliance evaluation, then click &ldquo;Run Capability Benchmarks&rdquo; on the report page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Benchmark Results</CardTitle>
            <CardDescription>{rows.length} benchmark runs recorded</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Benchmark</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Baseline</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link href={`/report/${row.test_run_id}`} className="font-medium hover:underline">
                        {row.test_runs?.model_name ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{row.benchmark_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {row.benchmark_category ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-medium ${scoreColor(row.normalized_score ?? 0)}`}>
                        {row.normalized_score ?? 0}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {row.published_baseline != null ? `${Math.round(row.published_baseline * 100)}%` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.passed ? 'default' : 'destructive'} className={row.passed ? 'bg-emerald-600' : ''}>
                        {row.passed ? 'Pass' : 'Fail'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(row.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
