## Summary
Three specialist skills (Frontend, Backend, Database) have proposed a new "Trends" feature: a line chart page showing `readiness_score` over the last 30 test runs, backed by a new GET `/api/trends` route, a `lib/api/trends.ts` client wrapper, a Sidebar entry, and a new `trend_bucket text` column + `created_at DESC` index on `test_runs`. The proposals are largely compatible but contain one hard-rule violation, one unnecessary schema change that introduces unresolved RLS risk, and two sequencing dependencies that must be enforced.

## Conflicts detected
- [Database] wants to add column `trend_bucket text` to `test_runs`. [Backend] never references this column — the proposed route returns `{ id, created_at, readiness_score, readiness_tier, model_name }` with no mention of `trend_bucket`. [Frontend] doesn't render it either. **Winner: Backend/Frontend.** Why: the column is unused by both consumers; adding it without wiring it up creates dead schema, incurs an unaddressed RLS surface, and violates the rule of not layering new changes on unresolved ground — defer `trend_bucket` until a grouping feature is actually scoped and specced.

- [Database] proposes an index on `(created_at DESC)`. [Backend] plans `ORDER BY created_at DESC LIMIT 30`. **Winner: Database.** Why: the index directly serves Backend's query and is safe to add; this is not a conflict, it is alignment — keep the index, drop only the `trend_bucket` column.

- [Frontend] wants `lib/api/trends.ts` to fetch from `/api/trends`. [Backend] is building `/api/trends/route.ts`. **Winner: no conflict.** These are complementary — Backend must be merged before Frontend for the client wrapper to have a target. Sequence enforces this automatically.

## Hard-rule violations
- **Rule 1 violated — `export const runtime = 'edge'` missing from the Backend proposal.** Backend says "Proposes adding `export const runtime = 'edge'`" which sounds like it is included, but the phrasing "proposes" is ambiguous — it must be the *first line* of `app/api/trends/route.ts`, not an afterthought. The route does not call an LLM, but it does perform a Supabase query that could be slow on cold start and the project's convention (CLAUDE.md Rule 3) is `runtime = 'edge'` on all API routes that call LLMs *or stream*. This route does not stream and does not call an LLM, so Rule 1 (strictly about LLM/SSE routes) is not technically violated — however CLAUDE.md Rule 3 is broader: "Use `export const runtime = 'edge'` on ALL API routes that call LLMs or stream." This route does neither, so `runtime = 'edge'` is optional but still recommended for consistency. **No hard-rule violation on Rule 1.** Marking as a recommendation, not a blocker.

- **Rule 3 — SUPABASE_SERVICE_ROLE_KEY in the Backend route.** Backend explicitly states "Plans to use the service role Supabase client." The service role key is env-only and server-side, and an API route under `app/api/` is server-side. This does NOT violate Rule 3 (which forbids it in pages, components, client hooks, or anything in the browser bundle). **No hard-rule violation.** The use is correct — service role is appropriate here if RLS is not configured on `test_runs` for anon reads (which it currently is not, per CLAUDE.md infrastructure gaps). Leaving this as a bottleneck warning.

- **None — all 5 hard rules satisfied** given the analysis above, with the recommendation to confirm `export const runtime = 'edge'` appears as the literal first line in the final route file.

## Execution order

1. **Database** — Add index on `test_runs (created_at DESC)` only. Do NOT add `trend_bucket text` column (deferred — see Conflicts). Write the raw SQL as a migration comment in `project_state.md` or a `supabase/migrations/` file if the folder is created.
   - Exact SQL: `CREATE INDEX IF NOT EXISTS idx_test_runs_created_at_desc ON test_runs (created_at DESC);`
   - Note: no RLS change is required for this index, but the existing absence of RLS on `test_runs` means the anon key can read all rows. Track as open risk.

2. **Backend** — Create `app/api/trends/route.ts`. Must include:
   - `export const runtime = 'edge'` as the first line (convention, strongly recommended).
   - Service role Supabase client (correct — anon client would be blocked by RLS once RLS is turned on; using service role now future-proofs the route).
   - Query: `SELECT id, created_at, readiness_score, readiness_tier, model_name FROM test_runs ORDER BY created_at DESC LIMIT 30`.
   - Return JSON array. No streaming, no LLM calls.
   - Do NOT reference `trend_bucket` — column is not being added.

3. **Backend (continued)** — Create `lib/api/trends.ts` client wrapper.
   - Must use `fetch('/api/trends')` — not direct Supabase calls (Rule 6: never use fetch() directly in page files, always through lib/api/).
   - Export a typed `getTrends()` function returning `TrendPoint[]` where `TrendPoint = { id: string; created_at: string; readiness_score: number | null; readiness_tier: string | null; model_name: string }`.
   - This file is server-side or used only by a Server Component — confirm it does not import `SUPABASE_SERVICE_ROLE_KEY`.

4. **Frontend** — Create `app/(dashboard)/trends/page.tsx`.
   - Server Component fetching via `getTrends()` from `lib/api/trends.ts`.
   - Recharts `LineChart` — `readiness_score` on Y-axis, `created_at` on X-axis, last 30 runs.
   - Use existing score color conventions from CLAUDE.md (≥70 green, 50–69 amber, <50 red) for reference lines or dot fill if desired.
   - Add `'Trends'` nav item to `components/layout/Sidebar.tsx` between `/history` and `/settings` entries (currently lines 24–25 in `Sidebar.tsx`).
   - Import an appropriate lucide-react icon (e.g., `TrendingUp`) — already available in the package.

5. **Build check** — Run `npm run build` locally. Must show 0 errors and 0 TypeScript failures before proceeding. No exceptions.

6. **Tests** — No test suite exists (confirmed in CLAUDE.md). Manual walkthrough required:
   - `npm run dev` → navigate to `/trends` → confirm chart renders with real data from Supabase.
   - Confirm Sidebar shows "Trends" between History and Settings.
   - Confirm `/api/trends` returns JSON array with correct shape in browser DevTools Network tab.
   - Confirm no `SUPABASE_SERVICE_ROLE_KEY` appears in browser bundle (DevTools → Sources → search).

7. **Push** — Stage files by name (never `git add -A`):
   - `app/api/trends/route.ts`
   - `lib/api/trends.ts`
   - `app/(dashboard)/trends/page.tsx`
   - `components/layout/Sidebar.tsx`
   - Any migration note file if created.
   - Commit with descriptive message, then `git push`.

## Bottleneck warnings
- **BUGs 1–8 are unresolved.** CLAUDE.md Phase 1 critical fixes have not been applied. Adding a Trends feature layers new code on top of known broken ground: BUG 6 means `readiness_score` is currently always set to `compliance_score` (not a true readiness score), so the Trends chart will visualise a mislabelled metric until BUG 6 (Layer 2) is resolved. This does not block GO but must be disclosed to the user — the chart is technically accurate to the current data but the data itself is known to be incorrect.
- **No RLS on `test_runs`.** The new `/api/trends` route uses the service role key server-side (safe), but the `test_runs` table has no RLS policy. Once any auth is added, the route will need a user filter. Flag as deferred: add `WHERE user_id = auth.uid()` filter once authentication (Phase 2 item 7) is implemented.
- **Supabase free-tier pausing.** No keep-alive cron exists. If Supabase pauses during the demo window, the Trends page will silently render an empty chart with no error. The existing risk applies to this new feature identically.
- **`trend_bucket` deferred — reopen when grouping is scoped.** If weekly bucketing is needed in the future, it should be computed in the query (e.g., `date_trunc('week', created_at)`) rather than stored as a denormalised column. This avoids a perpetual backfill problem.
- **No tests, no CI.** Build pass + manual walkthrough is the only gate. This is consistent with the project's current state but is a known gap flagged in CLAUDE.md.

## Pre-push checklist
- [ ] `npm run build` shows 0 errors
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` references in `app/(dashboard)/trends/page.tsx`, `lib/api/trends.ts`, or `components/layout/Sidebar.tsx`
- [ ] `app/api/trends/route.ts` has `export const runtime = 'edge'` as its first line (recommended convention)
- [ ] 4-second probe delay untouched — this change does not touch `app/api/test/run/route.ts`
- [ ] `.env.local` not staged
- [ ] Active bugs not worsened — BUG 1 (settings UX) and BUG 2 (model_provider null) are in unrelated files; confirm neither file was modified
- [ ] `trend_bucket` column NOT added to `test_runs` — Database specialist's column proposal was rejected; verify no migration SQL for it is staged
- [ ] Sidebar has "Trends" link between `/history` and `/settings` (lines 24–25 of `components/layout/Sidebar.tsx`)
- [ ] `getTrends()` return type is explicitly typed as `TrendPoint[]` — no `any` escapes
- [ ] Chart renders gracefully when `readiness_score` is NULL (BUG 6 means some rows may have NULL) — add a null filter or a fallback `0` value with a tooltip note

**VERDICT: GO** — with the condition that `trend_bucket` column is dropped from scope and the null-`readiness_score` chart handling is verified before push.

## Session handoff
- **CLAUDE.md:** Update the "What is genuinely complete and working" section to include the Trends page and `/api/trends` route once the change is pushed and verified on the live URL. Also add a note under "Known bugs" that BUG 6 causes the Trends chart to display `compliance_score` disguised as `readiness_score` until Layer 2 is implemented.
- **Project instructions:** No structural changes needed. The file structure section should be updated to add `app/(dashboard)/trends/page.tsx`, `app/api/trends/route.ts`, and `lib/api/trends.ts` once the feature is confirmed live.
- **Memories:** Remember that `trend_bucket` was explicitly rejected by Manager review — do not re-introduce it without a concrete grouping spec. Remember that the Trends chart data quality is contingent on BUG 6 being fixed (Layer 2 / `readiness_score` computed correctly).
