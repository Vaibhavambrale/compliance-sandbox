export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'

interface ProviderEntry {
  provider: string
  providerId: string
  status: string
  task?: string
}

interface HfModel {
  id: string
  likes?: number
  downloads?: number
  pipeline_tag?: string
  // From /api/models list endpoint, this is an array
  // From /api/models/{id} single endpoint, this is a Record
  inferenceProviderMapping?: ProviderEntry[] | Record<string, { status: string; providerId: string; task?: string }>
}

/**
 * Search HuggingFace models — either user's own or public.
 * - source='mine': lists user's uploaded models
 * - source='public': searches public text-generation models with inference providers
 */
export async function POST(req: NextRequest) {
  try {
    const { apiKey, query, source } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'apiKey required' }, { status: 400 })
    }

    let url: string
    let username: string | null = null

    if (source === 'mine') {
      // Get username from whoami first
      const whoamiRes = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!whoamiRes.ok) {
        return NextResponse.json({ error: 'Could not validate token' }, { status: 401 })
      }
      const whoami = await whoamiRes.json()
      username = whoami.name ?? whoami.fullname
      if (!username) {
        return NextResponse.json({ error: 'Could not determine username' }, { status: 400 })
      }

      url = `https://huggingface.co/api/models?author=${encodeURIComponent(username)}&expand[]=inferenceProviderMapping&expand[]=likes&expand[]=downloads&limit=50`
    } else {
      // Public search — filter by text-generation and optionally by query
      const q = (query ?? '').trim()
      const params = new URLSearchParams({
        pipeline_tag: 'text-generation',
        inference_provider: 'cerebras,nscale,novita,fireworks-ai,featherless-ai,hf-inference,together,sambanova',
        sort: 'likes',
        direction: '-1',
        limit: '10',
      })
      if (q) params.set('search', q)
      url = `https://huggingface.co/api/models?${params.toString()}&expand[]=inferenceProviderMapping&expand[]=likes&expand[]=downloads`
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!res.ok) {
      return NextResponse.json({
        error: `HuggingFace API error (${res.status})`,
      }, { status: 502 })
    }

    const rawModels: HfModel[] = await res.json()

    // Enrich each model with availability info
    // Provider mapping shape differs between list endpoint (array) and single endpoint (object)
    const models = rawModels.map(m => {
      const ipm = m.inferenceProviderMapping
      let liveProviders: string[] = []

      if (Array.isArray(ipm)) {
        // List endpoint shape: [{ provider, providerId, status, task, ... }]
        liveProviders = ipm
          .filter((p) => p.status === 'live' && p.task === 'conversational')
          .map((p) => p.provider)
      } else if (ipm && typeof ipm === 'object') {
        // Single endpoint shape: { providerName: { status, providerId, task, ... } }
        liveProviders = Object.entries(ipm)
          .filter(([, v]) => v.status === 'live' && v.task === 'conversational')
          .map(([name]) => name)
      }

      return {
        id: m.id,
        likes: m.likes ?? 0,
        downloads: m.downloads ?? 0,
        pipeline_tag: m.pipeline_tag ?? 'unknown',
        available: liveProviders.length > 0,
        providers: liveProviders,
        firstProvider: liveProviders[0] ?? null,
      }
    })

    return NextResponse.json({
      models,
      source: source ?? 'public',
      username,
      count: models.length,
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Search failed',
    }, { status: 500 })
  }
}
