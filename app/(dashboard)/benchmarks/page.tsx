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
import { getAllBenchmarks } from '@/lib/benchmarks'

function sourceBadge(source: string) {
  const map: Record<string, string> = {
    custom: 'bg-gray-100 text-gray-700',
    mmlu: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    truthfulqa: 'bg-purple-50 text-purple-700 border-purple-200',
    bbq: 'bg-rose-50 text-rose-700 border-rose-200',
  }
  return map[source] ?? map.custom
}

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
  if (score >= 70) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
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

      {/* Benchmark library reference */}
      <Card data-testid="benchmark-library">
        <CardHeader>
          <CardTitle className="text-base">Benchmark Library</CardTitle>
          <CardDescription>
            All benchmark sets available on this platform, with their source and published baselines.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Use Case</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Questions</TableHead>
                <TableHead className="text-right">Baseline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getAllBenchmarks().map(b => (
                <TableRow key={b.id}>
                  <TableCell className="text-sm font-medium">{b.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{b.use_case}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs uppercase ${sourceBadge(b.source ?? 'custom')}`}>
                      {b.source ?? 'custom'}
                    </Badge>
                    {b.dataset_id && (
                      <span className="ml-2 text-xs text-muted-foreground">{b.dataset_id}/{b.config}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">{b.questions.length}</TableCell>
                  <TableCell className="text-right text-sm">{Math.round(b.published_baseline * 100)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4 pb-4 text-sm text-amber-900">
          <strong>Benchmark contamination note:</strong> Published benchmarks such as MMLU, TruthfulQA, and BBQ
          may overlap with the training data of proprietary LLMs. Scores should be interpreted as upper bounds.
          Our custom benchmarks (labelled <em>custom</em>) are authored in-house and include India-specific compliance
          content not present in public training corpora.
        </CardContent>
      </Card>

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
