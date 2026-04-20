export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'

/**
 * Validates an HF token by calling whoami-v2.
 * Returns user info on success, error on failure.
 */
export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json()

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ valid: false, error: 'apiKey required' }, { status: 400 })
    }

    const res = await fetch('https://huggingface.co/api/whoami-v2', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({
          valid: false,
          error: 'Invalid or revoked HuggingFace token',
        })
      }
      return NextResponse.json({
        valid: false,
        error: `HuggingFace API error (${res.status})`,
      })
    }

    const data = await res.json()

    return NextResponse.json({
      valid: true,
      username: data.name ?? data.fullname ?? 'unknown',
      userId: data.id,
      email: data.email,
      type: data.type ?? 'user',
    })
  } catch (err) {
    return NextResponse.json({
      valid: false,
      error: err instanceof Error ? err.message : 'Failed to validate token',
    })
  }
}
