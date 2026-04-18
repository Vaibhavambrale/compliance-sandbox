'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function BenchmarkButton({
  testRunId,
  useCase,
}: {
  testRunId: string
  useCase: string
}) {
  const [status, setStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [currentBenchmark, setCurrentBenchmark] = useState('')

  async function runBenchmarks() {
    setStatus('running')

    // Get model_config from sessionStorage
    const storedConfig = sessionStorage.getItem('model_config')
    if (!storedConfig) {
      setStatus('error')
      return
    }

    try {
      const model_config = JSON.parse(storedConfig)
      const res = await fetch('/api/benchmark/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_run_id: testRunId, model_config, use_case: useCase }),
      })

      if (!res.ok) {
        setStatus('error')
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setStatus('error')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const dataLine = line.trim()
          if (!dataLine.startsWith('data: ')) continue

          try {
            const data = JSON.parse(dataLine.slice(6))

            if (data.type === 'benchmark_progress') {
              setProgress(data.question_number)
              setTotal(data.total_questions)
              setCurrentBenchmark(data.benchmark_name)
            } else if (data.type === 'complete') {
              setStatus('complete')
              // Reload the page to show benchmark results
              setTimeout(() => window.location.reload(), 1000)
            }
          } catch {
            // skip malformed events
          }
        }
      }

      if (status !== 'complete') setStatus('complete')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'idle') {
    return (
      <Button onClick={runBenchmarks} variant="outline" size="sm">
        Run Capability Benchmarks
      </Button>
    )
  }

  if (status === 'running') {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="animate-pulse">
          {currentBenchmark} — {progress}/{total}
        </Badge>
      </div>
    )
  }

  if (status === 'complete') {
    return (
      <Badge variant="default" className="bg-emerald-600">
        Benchmarks Complete — Reloading...
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="destructive">Error running benchmarks</Badge>
      <Button onClick={runBenchmarks} variant="outline" size="sm">
        Retry
      </Button>
    </div>
  )
}
