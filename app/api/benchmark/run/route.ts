export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { callUserModel, type ModelConfig } from '@/lib/model-caller'
import { getBenchmarksForUseCase, scoreBenchmarkAnswer } from '@/lib/benchmarks'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(req: NextRequest) {
  const { test_run_id, model_config, use_case } = await req.json() as {
    test_run_id: string
    model_config: ModelConfig
    use_case: string
  }

  if (!test_run_id || !model_config || !use_case) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const benchmarks = getBenchmarksForUseCase(use_case)
  if (benchmarks.length === 0) {
    return new Response(JSON.stringify({ error: 'No benchmarks available for this use case' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const totalQuestions = benchmarks.reduce((sum, b) => sum + b.questions.length, 0)
      let questionsDone = 0

      const benchmarkResults: {
        benchmarkId: string
        name: string
        category: string
        questionsAsked: number
        correctCount: number
        rawScore: number
        publishedBaseline: number
        minimumAcceptable: number
        sampleQuestions: { question: string; modelAnswer: string; correct: boolean }[]
      }[] = []

      for (const benchmark of benchmarks) {
        let correctCount = 0
        const sampleQuestions: { question: string; modelAnswer: string; correct: boolean }[] = []

        for (const question of benchmark.questions) {
          try {
            const modelResponse = await callUserModel(model_config, question.question)

            // Rate limit protection
            await delay(4000)

            const score = scoreBenchmarkAnswer(modelResponse, question)
            if (score >= 0.5) correctCount++

            sampleQuestions.push({
              question: question.question.split('\n')[0], // first line only
              modelAnswer: modelResponse.slice(0, 200),
              correct: score >= 0.5,
            })

            questionsDone++
            send({
              type: 'benchmark_progress',
              benchmark_name: benchmark.name,
              question_number: questionsDone,
              total_questions: totalQuestions,
              score,
              correct: score >= 0.5,
            })
          } catch (err) {
            questionsDone++
            sampleQuestions.push({
              question: question.question.split('\n')[0],
              modelAnswer: err instanceof Error ? err.message : 'Error',
              correct: false,
            })
            send({
              type: 'benchmark_error',
              benchmark_name: benchmark.name,
              question_number: questionsDone,
              total_questions: totalQuestions,
              error: err instanceof Error ? err.message : 'Question failed',
            })
          }
        }

        const rawScore = benchmark.questions.length > 0 ? correctCount / benchmark.questions.length : 0
        const normalizedScore = Math.round(rawScore * 100)
        const passed = rawScore >= benchmark.minimum_acceptable

        benchmarkResults.push({
          benchmarkId: benchmark.id,
          name: benchmark.name,
          category: benchmark.category,
          questionsAsked: benchmark.questions.length,
          correctCount,
          rawScore,
          publishedBaseline: benchmark.published_baseline,
          minimumAcceptable: benchmark.minimum_acceptable,
          sampleQuestions,
        })

        // Insert into benchmark_results table
        await supabase.from('benchmark_results').insert({
          test_run_id,
          benchmark_name: benchmark.name,
          benchmark_category: benchmark.category,
          questions_asked: benchmark.questions.length,
          raw_score: rawScore,
          normalized_score: normalizedScore,
          published_baseline: benchmark.published_baseline,
          minimum_acceptable: benchmark.minimum_acceptable,
          passed,
          sample_questions: sampleQuestions,
        })

        send({
          type: 'benchmark_complete',
          benchmark_name: benchmark.name,
          raw_score: rawScore,
          normalized_score: normalizedScore,
          passed,
        })
      }

      // Compute aggregate capability score
      const avgRawScore = benchmarkResults.length > 0
        ? benchmarkResults.reduce((sum, b) => sum + b.rawScore, 0) / benchmarkResults.length
        : 0
      const capabilityScore = Math.round(avgRawScore * 100)

      // Fetch current compliance score to compute readiness
      const { data: testRun } = await supabase
        .from('test_runs')
        .select('compliance_score')
        .eq('id', test_run_id)
        .single()

      const complianceScore = (testRun as { compliance_score: number | null } | null)?.compliance_score ?? 0
      const readinessScore = Math.round((complianceScore + capabilityScore) / 2)

      // Determine readiness tier from combined score
      let readinessTier = 'Do Not Deploy'
      if (readinessScore >= 85) readinessTier = 'Deployment Ready'
      else if (readinessScore >= 70) readinessTier = 'Conditionally Ready'
      else if (readinessScore >= 50) readinessTier = 'Not Ready'

      // Update test_runs with capability score and readiness
      await supabase
        .from('test_runs')
        .update({
          capability_score: capabilityScore,
          readiness_score: readinessScore,
          overall_score: readinessScore,
          readiness_tier: readinessTier,
        })
        .eq('id', test_run_id)

      send({
        type: 'complete',
        capability_score: capabilityScore,
        readiness_score: readinessScore,
        readiness_tier: readinessTier,
        benchmarks_run: benchmarkResults.length,
        total_questions: totalQuestions,
      })

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
