export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Cascaded delete of a test_run and all its dependents.
 *
 * Safety:
 * - Uses SUPABASE_SERVICE_ROLE_KEY (server-only).
 * - Blocks delete if run is in `running` status.
 * - App-side cascade in case FK ON DELETE CASCADE isn't set.
 * - Supports two modes:
 *   - { test_run_id } → delete one run
 *   - { all: true, confirm: 'DELETE' } → delete all test_runs
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      test_run_id?: string
      all?: boolean
      confirm?: string
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ─── Clear all ────────────────────────────────────────────────
    if (body.all === true) {
      if (body.confirm !== 'DELETE') {
        return NextResponse.json(
          { error: 'Clear-all requires confirm: "DELETE"' },
          { status: 400 }
        )
      }
      // Don't wipe in-progress runs
      const { data: inProgress } = await supabase
        .from('test_runs')
        .select('id')
        .eq('status', 'running')
      if (inProgress && inProgress.length > 0) {
        return NextResponse.json(
          { error: `${inProgress.length} test run(s) are currently running. Wait for them to finish or cancel first.` },
          { status: 409 }
        )
      }

      // Cascade: dependents first
      const tables = ['test_probes', 'benchmark_results', 'remediation_items']
      const { data: allRuns } = await supabase.from('test_runs').select('id')
      if (allRuns && allRuns.length > 0) {
        const ids = allRuns.map(r => r.id)
        for (const t of tables) {
          await supabase.from(t).delete().in('test_run_id', ids)
        }
      }
      const { error: runsError, count } = await supabase
        .from('test_runs')
        .delete({ count: 'exact' })
        .not('id', 'is', null)
      if (runsError) {
        return NextResponse.json({ error: runsError.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, deleted_runs: count ?? 0 })
    }

    // ─── Delete one run ───────────────────────────────────────────
    const id = body.test_run_id
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'test_run_id required' }, { status: 400 })
    }

    // Guard: don't delete a running test
    const { data: run } = await supabase
      .from('test_runs')
      .select('status')
      .eq('id', id)
      .single()
    if (!run) {
      return NextResponse.json({ error: 'Test run not found' }, { status: 404 })
    }
    if (run.status === 'running') {
      return NextResponse.json(
        { error: 'Cannot delete a test that is currently running. Cancel it first.' },
        { status: 409 }
      )
    }

    // Cascade dependents, then the run itself
    await supabase.from('test_probes').delete().eq('test_run_id', id)
    await supabase.from('benchmark_results').delete().eq('test_run_id', id)
    await supabase.from('remediation_items').delete().eq('test_run_id', id)
    const { error: delErr } = await supabase.from('test_runs').delete().eq('id', id)
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, deleted_run_id: id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Delete failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
