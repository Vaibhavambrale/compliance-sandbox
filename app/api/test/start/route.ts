export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { model_config, region, use_case, frameworks } = await req.json()

    if (!model_config?.name || !model_config?.apiEndpoint || !model_config?.apiKey || !model_config?.modelId) {
      return NextResponse.json(
        { error: 'Model configuration is incomplete. Provide name, apiEndpoint, apiKey, and modelId.' },
        { status: 400 }
      )
    }

    if (!use_case || !frameworks?.length) {
      return NextResponse.json(
        { error: 'use_case and frameworks are required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('test_runs')
      .insert({
        use_case,
        model_name: model_config.name,
        model_provider: model_config.apiFormat || 'openai',
        model_endpoint: model_config.apiEndpoint,
        model_api_format: model_config.apiFormat || 'openai',
        region: region || null,
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
