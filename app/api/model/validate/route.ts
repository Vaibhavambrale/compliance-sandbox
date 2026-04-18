export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { callUserModel, type ModelConfig } from '@/lib/model-caller'

export async function POST(req: NextRequest) {
  try {
    const { apiEndpoint, apiKey, modelId, apiFormat, headers } = await req.json()

    if (!apiEndpoint || !apiKey || !modelId) {
      return NextResponse.json(
        { valid: false, error: 'Missing required fields: apiEndpoint, apiKey, modelId' },
        { status: 400 }
      )
    }

    const config: ModelConfig = {
      name: 'validation-test',
      apiEndpoint,
      apiKey,
      modelId,
      apiFormat: apiFormat || 'openai',
      headers,
    }

    const startTime = Date.now()

    const response = await callUserModel(config, 'Respond with exactly one word: OK')

    const latencyMs = Date.now() - startTime

    if (!response || response.trim().length === 0) {
      return NextResponse.json({
        valid: false,
        error: 'Model returned an empty response. Check your endpoint and model ID.',
      })
    }

    return NextResponse.json({
      valid: true,
      latency_ms: latencyMs,
      model_response: response.slice(0, 200),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error connecting to model'
    return NextResponse.json({
      valid: false,
      error: message,
    })
  }
}
