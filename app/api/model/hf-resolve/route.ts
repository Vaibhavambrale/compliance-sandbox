export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'

interface ProviderMapping {
  status: string
  providerId: string
  task: string
}

/**
 * Resolves a HuggingFace model ID to the correct inference provider and endpoint.
 * HuggingFace routes through different providers (cerebras, nscale, novita, etc.)
 * and each provider has its own model ID format.
 */
export async function POST(req: NextRequest) {
  try {
    const { modelId, apiKey } = await req.json()

    if (!modelId || !apiKey) {
      return NextResponse.json({ error: 'modelId and apiKey required' }, { status: 400 })
    }

    // Query HuggingFace API for the model's inference providers
    const res = await fetch(
      `https://huggingface.co/api/models/${modelId}?expand[]=inferenceProviderMapping`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ error: `Model "${modelId}" not found on HuggingFace` })
      }
      return NextResponse.json({ error: `HuggingFace API error (${res.status})` })
    }

    const data = await res.json()
    const providers = (data.inferenceProviderMapping ?? {}) as Record<string, ProviderMapping>

    // Find the first live provider
    const liveProviders = Object.entries(providers)
      .filter(([, v]) => v.status === 'live')
      .map(([name, v]) => ({
        provider: name,
        providerId: v.providerId,
        task: v.task,
        endpoint: `https://router.huggingface.co/${name}/v1/chat/completions`,
      }))

    if (liveProviders.length === 0) {
      return NextResponse.json({
        error: `Model "${modelId}" has no free inference providers available. Try a different model.`,
        modelName: data.id,
      })
    }

    // Prefer certain providers (faster/more reliable free tier)
    const preferred = ['cerebras', 'nscale', 'novita', 'fireworks-ai', 'together']
    const sorted = liveProviders.sort((a, b) => {
      const aIdx = preferred.indexOf(a.provider)
      const bIdx = preferred.indexOf(b.provider)
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx)
    })

    const best = sorted[0]

    return NextResponse.json({
      resolved: true,
      modelId: data.id,
      modelName: data.id.split('/').pop() ?? data.id,
      provider: best.provider,
      providerId: best.providerId,
      endpoint: best.endpoint,
      task: best.task,
      allProviders: sorted.map(p => p.provider),
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to resolve model',
    })
  }
}
