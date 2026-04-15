## Summary
Three specialists (Frontend, Backend, Database) are proposing a new Trends feature: a line chart of `readiness_score` over time for the last 30 test runs, backed by a new `GET /api/trends` route, a new `lib/api/trends.ts` client wrapper, a `trend_bucket` column on `test_runs`, and a `created_at DESC` index. The `/api/trends` route does not call any LLM and does not stream SSE, so Rule 1 (edge runtime on LLM/SSE routes) does not apply here. No probe code is touched. The changes are internally consistent but carry several sequencing and RLS concerns addressed below.

## Conflicts detected
- [Backend] proposes `export const runtime = 'edge'` on `app/api/trends/route.ts`. [Hard Rule 1] limits the edge-runtime requirement to routes that call LLMs or stream SSE. `/api/trends` does neither — it is a plain JSON read from Supabase. Edge runtime is not *prohibited* here, but Backend's stated rationale (following project convention) is imprecise. **Winner: Backend, conditionally.** Adding `runtime = 'edge'` to a non-LLM route is harmless and consistent with the project's other API routes; it is acceptable. No conflict blocks progress.
- [Database] adds `trend_bucket text` column. [Backend] never references `trend_bucket` in the proposed route response shape `{ id, created_at, readiness_score, readiness_tier, model_name }`. The column would be added but never read or written by the new feature. **Winner: Database wins on schema shape per conflict-resolution rule 2, but the column is unused by Backend.** This is a scope ambiguity, not a blocking conflict — the column can be added as a forward-looking bucket for grouping, but Backend must either include it in the response or explicitly leave it for a follow-up. Noted in Bottleneck warnings.
- [Frontend] proposes a `lib/api/trends.ts` client wrapper that fetches from `/api/trends`. [Backend] owns the route contract. Backend's proposed response shape `{ id, created_at, readiness_score, readiness_tier, model_name }` is sufficient for a line chart of readiness score over time. Frontend's wrapper must match that shape exactly. No conflict on the data fields themselves — Frontend has not specified a mismatching shape. No blocking conflict.

## Hard-rule violations
None — all 5 hard rules satisfied.

## Execution order
1. **Database** — Add `trend_bucket text` column to `test_runs` via Supabase SQL editor (or migration file). Add index on `(created_at DESC)` on `test_runs`. Add or confirm RLS policy for `test_runs` allows authenticated reads on the new column (see Bottleneck warnings — RLS is currently off; at minimum document this explicitly).
2. **Backend** — Create `app/api/trends/route.ts`: `SELECT id, created_at, readiness_score, readiness_tier, model_name FROM test_runs ORDER BY created_at DESC LIMIT 30` using the service-role Supabase client (server-side only; acceptable per Rule 3). Include `export const runtime = 'edge'` (harmless, consistent with project convention). Create `lib/api/trends.ts` as the client-side fetch wrapper — this file must use `fetch('/api/trends')` and must **not** import or reference `SUPABASE_SERVICE_ROLE_KEY`.
3. **Frontend** — Create `app/(dashboard)/trends/page.tsx` rendering a Recharts `LineChart` with `readiness_score` on the Y-axis and `created_at` on the X-axis, consuming data via `lib/api/trends.ts`. Add 'Trends' sidebar entry in `components/layout/Sidebar.tsx` between History and Settings. Apply score-color conventions (≥70 green, 50–69 amber, <50 red) to any score display on the page.
4. **Build check** — Run `npm run build` locally. Must report 0 errors and 0 TypeScript failures before proceeding.
5. **Tests** — No automated test suite exists. Walk the happy-path manually: navigate to `/trends`, confirm the line chart renders with real data from the last 30 test runs, confirm the Sidebar link appears in the correct position, confirm no console errors.
6. **Push** — `git add app/api/trends/route.ts lib/api/trends.ts app/(dashboard)/trends/page.tsx components/layout/Sidebar.tsx` (add migration file or SQL note if tracked). `git commit`. `git push`. Confirm Vercel deployment succeeds.

## Bottleneck warnings
- **`trend_bucket` column is added but unused by the Backend route and Frontend page in this plan.** If the intent is to use it for weekly grouping in a future iteration, the column is fine to add now. If it was meant to be used *in this feature*, the Backend route response shape must be updated and the Frontend chart must implement the grouping logic. Clarify scope before implementing.
- **RLS is currently off on all tables** (CLAUDE.md infrastructure gaps). The new `trend_bucket` column on `test_runs` inherits the same world-readable state. Anyone with the anon key can read all test run data. This plan does not add RLS on `test_runs` — that is tracked as a Phase 1 item in CLAUDE.md. Flag explicitly: adding a new column to `test_runs` without pairing it with an RLS policy leaves the new column exposed under the same condition as the existing columns. This is not a new regression, but it must be noted and tracked.
- **`readiness_score` is currently set to `compliance_score` rather than `(compliance + capability) / 2`** (BUG 6, CLAUDE.md). The Trends chart will therefore visualise compliance score mislabelled as readiness score for all historical and future runs until Layer 2 is implemented. The chart is not *broken*, but the data label is misleading. Add a UI note on the Trends page ("Readiness score reflects compliance layer only until Layer 2 benchmarking is enabled") or hold this feature until BUG 6 is resolved.
- **Supabase free tier pauses after 7 days idle.** No keep-alive cron exists. The Trends page makes a live Supabase query — if the database is paused during the demo, the chart will render empty or error. Set up a cron-job.org keep-alive before the IEEE demo.
- **Active BUG 2 (`model_provider` null) is unaffected by this change**, but `test_runs` is being touched by Database. Confirm the migration/column-add SQL does not alter any existing NOT NULL constraints or default values on `test_runs`.
- **Backend proposes using the service-role Supabase client** for a read-only route where the anon client would suffice. This is not a hard-rule violation (Rule 3 permits service-role inside `app/api/**`), but it is gratuitous — flag as best-practice concern. Prefer the anon client for read-only public queries; reserve the service role client for writes and settings-table access.

## Pre-push checklist
- [ ] `npm run build` shows 0 errors
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` references in `lib/api/trends.ts`, `app/(dashboard)/trends/page.tsx`, or `components/layout/Sidebar.tsx`
- [ ] All new or modified LLM-calling routes have `export const runtime = 'edge'` — `/api/trends` calls no LLM; verify no LLM call was accidentally added
- [ ] 4-second probe delay intact in `app/api/test/run/route.ts` — this plan does not touch that file; confirm no diff
- [ ] `.env.local` not staged
- [ ] Active bugs not worsened — BUG 1 (API keys on reload) and BUG 2 (model_provider null) unaffected; confirm `test_runs` migration does not alter existing columns or constraints
- [ ] `trend_bucket` scope confirmed with user before implementation: used in this feature or deferred to follow-up?
- [ ] Trends page includes UI note about BUG 6 (`readiness_score` currently equals `compliance_score`) OR BUG 6 is resolved first
- [ ] Sidebar 'Trends' entry positioned between History and Settings — verify order in `components/layout/Sidebar.tsx`
- [ ] Recharts `LineChart` uses score-color conventions (≥70 green, 50–69 amber, <50 red) for any score badges or annotations

**VERDICT: GO** — one scope question must be answered before the Editor starts: is `trend_bucket` meant to be used in this feature (requiring Backend and Frontend updates) or is it a forward-looking column to be wired up later? All hard rules are satisfied; sequence and bottlenecks are documented above.

## Session handoff
- **CLAUDE.md:** After implementation, add `app/(dashboard)/trends/page.tsx`, `lib/api/trends.ts`, and `app/api/trends/route.ts` to the COMPLETE FILE STRUCTURE section. Update the `trend_bucket text` column into the `test_runs` schema block. Note the RLS-still-off status for `test_runs`. If BUG 6 remains unresolved, add a note that the Trends chart displays compliance_score mislabelled as readiness_score.
- **Project instructions:** Nothing — no rule changes required.
- **Memories:** Note that `test_runs` now has a `trend_bucket text` column and a `(created_at DESC)` index. Note that the Trends page is a read-only feature with no LLM calls. Note that BUG 6 (readiness_score = compliance_score) affects the accuracy of the Trends chart until Layer 2 is implemented.
