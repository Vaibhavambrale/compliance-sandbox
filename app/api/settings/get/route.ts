export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const VALID_KEYS = ['gemini_api_key', 'groq_api_key', 'anthropic_api_key']

function maskValue(value: string): string {
  if (!value || value.length < 4) return '••••'
  return '••••••••••' + value.slice(-4)
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', VALID_KEYS)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const masked: Record<string, string> = {
      gemini_api_key: '',
      groq_api_key: '',
      anthropic_api_key: '',
    }

    for (const row of (data as { key: string; value: string }[] | null) ?? []) {
      masked[row.key] = maskValue(row.value)
    }

    return NextResponse.json(masked)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
