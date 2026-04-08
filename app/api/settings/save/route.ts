export const runtime = 'edge'

// SQL to create the settings table in Supabase:
// CREATE TABLE settings (
//   id uuid default gen_random_uuid() primary key,
//   key text unique not null,
//   value text not null,
//   created_at timestamptz default now()
// );
// ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Allow all" ON settings FOR ALL USING (true);

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const VALID_KEYS = ['gemini_api_key', 'groq_api_key', 'anthropic_api_key']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = getSupabase()

    for (const key of VALID_KEYS) {
      const value = body[key]
      if (typeof value !== 'string') continue

      const { error } = await supabase
        .from('settings')
        .upsert({ key, value }, { onConflict: 'key' })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', VALID_KEYS)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const settings: Record<string, string> = {
      gemini_api_key: '',
      groq_api_key: '',
      anthropic_api_key: '',
    }

    for (const row of (data as { key: string; value: string }[] | null) ?? []) {
      settings[row.key] = row.value
    }

    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
