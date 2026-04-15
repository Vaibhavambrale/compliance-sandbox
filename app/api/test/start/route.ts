export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getModelById } from '@/lib/models'

export async function POST(req: NextRequest) {
  try {
    const { use_case, model, frameworks } = await req.json()

    if (!use_case || !model || !frameworks?.length) {
      return NextResponse.json(
        { error: 'use_case, model, and frameworks are required' },
        { status: 400 }
      )
    }

    const modelDef = getModelById(model)
    if (!modelDef) {
      return NextResponse.json(
        { error: `Unknown model: ${model}` },
        { status: 400 }
      )
    }
    const model_provider = modelDef.provider

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('test_runs')
      .insert({
        use_case,
        model_name: model,
        model_provider,
        frameworks,
        status: 'running',
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
