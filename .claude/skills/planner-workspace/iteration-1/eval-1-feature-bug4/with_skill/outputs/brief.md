## Planner brief — Feature Planning mode

### Goal

Persist the Claude-generated `top_risks` array and `compliance_checklist` array to the database inside `/api/report/generate`, then render both on the report page so that Section 2 (Top Risks) and Section 6 (Compliance Checklist) are populated for every completed test run.

---

### Context from CLAUDE.md

- **BUG 4** (`app/api/report/generate/route.ts:~113-158`): Claude produces `top_risks` and `compliance_checklist` on every report-generate call, but neither is written to the database. The route returns them in the JSON response body and then they are lost — the report page reads `testRun.top_risks` and `testRun.compliance_checklist` from the `test_runs` row, which are always `null`.
- **BUG 3** (`app/(dashboard)/report/[id]/page.tsx:~76-92`): The report page fires `POST /api/report/generate` with `await`, but the guard condition is `report.remediations.length === 0`. Fixing BUG 4 (persisting `top_risks` / `compliance_checklist` to `test_runs`) does not change this guard — the race will still exist. BUG 4 and BUG 3 are separate fixes and should be sequenced independently.
- **Schema gap**: The `test_runs` table schema in CLAUDE.md does **not** include `top_risks` or `compliance_checklist` columns. The `ReportTestRun` interface in `lib/api/reports.ts:41-53` already declares them (`top_risks: string[] | null`, `compliance_checklist: ComplianceCheckItem[] | null`), but the underlying Postgres table lacks those columns. The fix requires an `ALTER TABLE` migration before the backend write will work.
- **BUG 9** (`lib/api/reports.ts:7-8`): `ReportProbe` interface declares `prompt`/`response` but the actual `test_probes` columns are `prompt_sent`/`response_received`. This is a separate bug on the same fragile file (`lib/api/reports.ts`) and must not be inadvertently broken or fixed in the same PR as BUG 4 unless explicitly scoped together.

---

### Tasks by specialist

**Database:**

Add two columns to `test_runs` in Supabase. Run the following migration via the Supabase SQL editor (no migrations folder exists in the repo yet — this is a manual step):

```sql
ALTER TABLE test_runs
  ADD COLUMN IF NOT EXISTS top_risks       jsonb,
  ADD COLUMN IF NOT EXISTS compliance_checklist jsonb;
```

Both columns store JSON arrays: `top_risks` is `string[]`, `compliance_checklist` is `[{ framework, requirement, status }]`. Using `jsonb` is correct — no new table, no FK, no index needed for the demo.

**Backend:**

File: `app/api/report/generate/route.ts`

Current state (lines ~167-187): the route only calls `.update({ readiness_tier: readinessTier })` on `test_runs`. It does not include `top_risks` or `compliance_checklist` in the UPDATE.

Change required: extend the existing `supabase.from('test_runs').update(...)` call to also write `top_risks` and `compliance_checklist`:

```
.update({
  readiness_tier: readinessTier,
  top_risks: topRisks,
  compliance_checklist: checklist,
})
```

No new Claude calls, no new DB queries, no new route. The values `topRisks` and `checklist` are already computed above the update block (lines ~115 and ~158 respectively). This is a one-line change to the update payload.

**Frontend:**

The report page (`app/(dashboard)/report/[id]/page.tsx`) already reads `testRun.top_risks` (line 100) and `testRun.compliance_checklist` (line 101). Both are used to drive the Top Risks list in Section 2 and the Compliance Checklist table in Section 6. The rendering logic is already complete and correct — once the backend persists the data and the DB column exists, both sections will populate automatically.

No frontend code change is required unless the columns were not present in the DB and Supabase silently discarded the extra fields (which it does when columns don't exist). After the migration runs, confirm via a test run that the data appears — no JSX changes expected.

**Tester:**

Pre-change checks (run before touching any code):
1. Open an existing completed test run report (`/report/[id]`). Confirm that Section 2 (Top Risks) shows no items and Section 6 (Compliance Checklist) shows the "not yet generated" placeholder. This establishes the baseline broken state.
2. Query `test_runs` in Supabase Table Editor — confirm `top_risks` and `compliance_checklist` columns do not exist. If they already exist (from a prior migration), note the column types.
3. Confirm `app/api/report/generate/route.ts` lines ~167-175 contain only `readiness_tier` in the `.update()` payload — no `top_risks` or `compliance_checklist`.

Post-change regression checks:
1. Run a fresh test against Virtual Health Assistant + Gemini (the demo flow). Wait for SSE to complete. Navigate to `/report/[id]`. Section 2 should show 3 risk bullets. Section 6 should show a table with items grouped by framework.
2. Navigate away and reload the report page. Both sections must still render (confirming DB persistence, not just in-memory response).
3. Verify `remediation_items` are still being inserted (regression on BUG 4 fix must not disturb the remediation write path at lines 176-187).
4. Verify Section 4 (Detailed Findings) is unaffected — do not fix or worsen `probe.prompt` / `probe.response` rendering (BUG 9 is a separate fix).
5. Check the Supabase `test_runs` row directly to confirm `top_risks` is a JSON array of strings and `compliance_checklist` is a JSON array of objects with `framework`, `requirement`, `status` keys.
6. Run `npm run build` — confirm 0 TypeScript errors. The `ReportTestRun` interface in `lib/api/reports.ts` already declares both fields, so no interface change is needed; build should pass cleanly.

---

### Acceptance criteria

- [ ] `test_runs` table has a `top_risks jsonb` column and a `compliance_checklist jsonb` column in the live Supabase database.
- [ ] After `POST /api/report/generate` completes for a given `test_run_id`, the `test_runs` row for that ID has a non-null `top_risks` value containing an array of 1–3 string items.
- [ ] After `POST /api/report/generate` completes, the `test_runs` row has a non-null `compliance_checklist` value containing an array of objects, each with `framework`, `requirement`, and `status` keys.
- [ ] Navigating to `/report/[id]` for a run that has been through report generation renders at least one item in the "Top Risks" list in Section 2 (the `topRisks.length > 0` guard on line 192 of the page resolves to true).
- [ ] Section 6 (Compliance Checklist) renders a grouped table by framework with Pass/Fail/Partial badges — the `Object.keys(checklistByFramework).length > 0` guard on line 329 resolves to true.
- [ ] Reloading the report page does not regenerate the report a second time (this tests that the existing BUG 3 auto-regenerate guard still functions after the BUG 4 fix; the guard is `remediations.length === 0`, which remains intact).
- [ ] `remediation_items` continue to be written as before — Section 5 (Remediation Guide) is not regressed.
- [ ] `npm run build` exits with 0 errors.

---

### Dependencies

1. **Database first.** The `ALTER TABLE` migration must be run in Supabase before the backend change is deployed. If the backend tries to write `top_risks` to a column that does not exist, Supabase will silently discard the field (or error, depending on RLS/schema strictness). Run the SQL migration, confirm both columns appear in Table Editor, then proceed.

2. **Backend second.** Extend the `.update()` payload in `app/api/report/generate/route.ts`. This is a one-line change. No new imports, no new logic.

3. **Frontend.** No code change required. Confirm rendering after the backend is deployed.

4. **Tester.** Run acceptance checks end-to-end against the live Vercel deployment after `git push`.

5. **BUG 3 is not a blocker for BUG 4, but must not be regressed.** The auto-regenerate guard (`remediations.length === 0`) is separate from `top_risks`/`compliance_checklist` population. Do not change the guard condition while fixing BUG 4.

6. **BUG 9 must not be touched.** `lib/api/reports.ts` is a fragile file. The `ReportTestRun` interface at lines 41-53 already declares `top_risks` and `compliance_checklist` correctly — no changes needed. Do not edit `ReportProbe` (lines 3-13) as part of this fix.

Default execution order: Database → Backend → (no Frontend change) → Tester → Manager GO → Editor.

---

### Known bug interactions

- **BUG 3** (`app/(dashboard)/report/[id]/page.tsx:~76-92`): This plan does not change the auto-regenerate guard or the `await fetch(...)` call. BUG 3 remains open after BUG 4 is fixed. However, because BUG 4's fix adds `top_risks` and `compliance_checklist` to the same DB row that the auto-regenerate path writes, a separate future BUG 3 fix could add an idempotency check on whether `top_risks IS NOT NULL` instead of `remediations.length === 0`. That is out of scope here.

- **BUG 9** (`lib/api/reports.ts:7-8`, `ReportProbe.prompt`/`ReportProbe.response` vs actual column names `prompt_sent`/`response_received`): This plan does not touch `ReportProbe`. The `ReportTestRun` interface on lines 41-53 is already correct for `top_risks` and `compliance_checklist`. Do not edit lines 3-13 of `lib/api/reports.ts` during this fix.

- **`app/api/report/generate/route.ts`** is on the fragile-file list. The existing `.update()` call at lines ~167-175 is the only change point. The three `callClaude(...)` invocations above it are not touched — this plan does not add any new LLM calls, does not change the call count, and does not affect sequencing or rate limiting.

- **BUG 6 (Layer 2 absent)**: `compliance_checklist` and `top_risks` are generated by the Layer 1 report route and are not dependent on Layer 2. `capability_score` is still `NULL` and `readiness_score` still mirrors `compliance_score`. This plan explicitly does not attempt to fix that — Layer 2 is deferred.

- **MEITY AI Advisory March 2024** (advisory/emerging only): The `checklistPrompt` in `generate/route.ts` at line ~144 passes `testRun.frameworks` to Claude. If a user selected MEITY as a framework during test configuration, the checklist Claude generates may reference MEITY requirements. The generated checklist text is authored by Claude, not by this plan. However, any display of MEITY items in the Compliance Checklist table on the report page should not imply enforceability. If the Frontend skill is later asked to style the checklist, it must label MEITY items as "advisory only" wherever they appear. This is out of scope for BUG 4 itself but worth noting.

---

### Time estimate and demo-risk assessment

- **Database migration**: 15 minutes (SQL editor, confirm columns appear).
- **Backend change**: 30 minutes (one-line edit, `npm run build`, confirm 0 errors).
- **Frontend**: 0 minutes (no code change).
- **Tester verification**: 30 minutes (one full test run through the demo flow, DB spot-check, reload test).
- **Total**: ~1.25 hours.

Days remaining until April 25, 2026: 11 days (from current date April 14, 2026).

**Verdict: On track.** This is the simplest P1 fix in the backlog — one SQL migration and one line of backend code. It fits comfortably within the timeline with significant buffer. There are no external dependencies, no new packages, and no architectural risk. The only failure mode is if `test_runs` already has those columns from a prior undocumented migration, in which case the `IF NOT EXISTS` guard makes the migration a no-op and the backend fix still proceeds identically.

---

### Cut line

There is no meaningful cut here — the fix is already at minimum viable scope. The full fix (migration + one-line backend change) is the cut version. If time somehow evaporated:

- **Must ship before demo**: the DB migration + backend UPDATE extension. Without these, Top Risks and Compliance Checklist are always empty, which is visually broken in front of IEEE panelists.
- **Can defer**: improving the checklist prompt to label MEITY items as "advisory only" — that is editorial polish, not a data-persistence fix.
- **Cannot cut**: the `ALTER TABLE` step. Skipping it means the backend write silently discards the data and both sections stay empty regardless of the code change.
