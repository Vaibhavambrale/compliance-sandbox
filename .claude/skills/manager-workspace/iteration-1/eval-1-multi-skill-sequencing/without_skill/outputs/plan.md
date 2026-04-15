# Multi-Skill Sequencing Review: Trends Feature
Date: 2026-04-14
Branch: main @ c8648d3

---

## Summary Verdict: CONDITIONAL GO

The three proposals are directionally compatible — they all touch disjoint layers (DB schema, API route, UI). However, there are **4 concrete issues** that must be resolved before execution, and the sequence must be enforced strictly. Proceed only after the issues below are addressed.

---

## Issue Analysis

### Issue 1 — BLOCKING: `readiness_score` is currently meaningless (BUG 6)

**Severity: Critical**

`app/api/test/run/route.ts:~311-324` writes `readiness_score = complianceScore` because Layer 2 (capability benchmarking) is entirely unimplemented. `capability_score` is always `NULL` in the DB.

The Trends page would chart `readiness_score` over time — but every single value stored is actually just a copy of `compliance_score` under a different column name. Displaying this as "readiness over time" is actively misleading. A user (or a college panelist) reading the chart would believe they are seeing a richer metric than what exists.

**Resolution before proceeding:** Either:
- (a) Plot `compliance_score` instead and label it honestly as "Compliance Score Trend" until Layer 2 is built, OR
- (b) Add a visible disclaimer banner to the Trends page ("Readiness score currently reflects compliance layer only — capability benchmarking coming soon").

Option (a) is simpler and more honest. Recommend option (a).

---

### Issue 2 — BLOCKING: Database skill's `trend_bucket` column is unnecessary and adds schema debt

**Severity: High**

The Database skill proposes adding a `trend_bucket text` column to `test_runs` so the frontend can group by weekly bucket. This is premature optimisation that creates real costs:

- There is no migration system in this repo (`supabase/migrations/` does not exist — confirmed in CLAUDE.md §Infrastructure gaps). Adding a column means manually running a DDL statement in the Supabase console with no reproducibility.
- Weekly bucketing is trivial to compute in-process from `created_at` using JavaScript's `Date` API (or SQL's `DATE_TRUNC`). The backend route already returns `created_at`; the frontend or the API route can group it without a stored column.
- The column would need to be kept in sync every time a `test_run` row is written — another surface for drift bugs, exactly what caused commit `c8648d3` (critical schema mismatches).

**Resolution:** Drop the `trend_bucket` column entirely. The GET `/api/trends` route returns `created_at`; `lib/api/trends.ts` or the page component groups by ISO week client-side. No schema change required.

The proposed index on `(created_at DESC)` is fine and low-risk — keep it. But since there is no migration tooling, it must be applied as a one-liner in the Supabase SQL editor and documented in CLAUDE.md under the schema section.

---

### Issue 3 — IMPORTANT: Backend route must use the service role client pattern consistently

**Severity: Medium**

The Backend skill says it will use the service role Supabase client. The project pattern for this (established in `app/api/settings/get/route.ts` and `app/api/settings/save/route.ts`) is:

```ts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

This is correct for a trends endpoint since it reads `test_runs` — a table that will eventually be protected by RLS per user. However, the Trends endpoint only needs to read `readiness_score`, `compliance_score`, `created_at`, `model_name`, `readiness_tier`, and `id`. It must NOT select `*` (which could expose internal columns). The Backend skill's proposed field list `{ id, created_at, readiness_score, readiness_tier, model_name }` is correctly scoped — enforce that the actual select call lists only those five columns explicitly.

`export const runtime = 'edge'` is correct and required per CLAUDE.md rule 3.

---

### Issue 4 — LOW: Sidebar icon for Trends is missing from the proposal

**Severity: Low**

The Frontend skill says add a "Trends" item between History and Settings in the Sidebar. The current `Sidebar.tsx` imports specific lucide-react icons (`LayoutDashboard`, `History`, `Settings`, etc.). The proposal does not name which icon to use.

Recommend `TrendingUp` from lucide-react — it is already in the lucide-react package bundled with the project and semantically correct.

---

## Conflict Matrix

| | Frontend | Backend | Database |
|---|---|---|---|
| **Frontend** | — | No conflict: page consumes API output | Conflict: page expects `trend_bucket` from DB; if DB skill is rejected, frontend must do bucketing itself |
| **Backend** | No conflict | — | Minor: if `trend_bucket` column is dropped, backend must NOT include it in the select list |
| **Database** | See above | See above | — |

There are no file-level conflicts (no two skills touch the same file). The only coupling is the shape of the data contract between the three layers.

---

## Execution Sequence

Execute strictly in this order. Do not start a step until the previous step's build passes.

### Step 0 — Prerequisite: apply the `created_at DESC` index
- Open the Supabase SQL editor for project `bfoxykppcrspuhxrcitq`.
- Run: `CREATE INDEX IF NOT EXISTS idx_test_runs_created_at_desc ON test_runs (created_at DESC);`
- No code change required. Document the index in CLAUDE.md's schema section.
- **Do NOT add `trend_bucket` column. This is dropped from scope.**

### Step 1 — Backend: create `app/api/trends/route.ts`
Files to create:
- `app/api/trends/route.ts`

Requirements:
- `export const runtime = 'edge'`
- Use service role Supabase client (same pattern as `app/api/settings/get/route.ts`)
- Query: `.from('test_runs').select('id, created_at, compliance_score, readiness_tier, model_name').order('created_at', { ascending: false }).limit(30)`
- Note: use `compliance_score` not `readiness_score` (per Issue 1, Option a). Rename the JSON key to `score` in the response to keep the frontend decoupled from the column name debate.
- Return `NextResponse.json({ runs: data })`
- Run `npm run build` — must be 0 errors before proceeding.

### Step 2 — Client API wrapper: create `lib/api/trends.ts`
Files to create:
- `lib/api/trends.ts`

Requirements:
- Export an interface `TrendPoint { id: string; created_at: string; score: number | null; readiness_tier: string | null; model_name: string }`
- Export `async function getTrends(): Promise<TrendPoint[]>` that fetches `GET /api/trends` and returns the `runs` array.
- This is a client-callable fetch (no service role key needed here — it hits the Next.js API route, not Supabase directly).
- Run `npm run build` — must be 0 errors.

### Step 3 — Frontend: create `app/(dashboard)/trends/page.tsx` and update Sidebar
Files to create/modify:
- `app/(dashboard)/trends/page.tsx` (new)
- `components/layout/Sidebar.tsx` (add Trends entry between History and Settings)

Requirements for the page:
- `'use client'` directive (Recharts requires client rendering).
- Fetch data using `getTrends()` from `lib/api/trends.ts`.
- Render a Recharts `LineChart` with `created_at` on the X-axis (formatted as date) and `score` on the Y-axis (0–100).
- Y-axis domain fixed to `[0, 100]` to avoid misleading scale compression.
- Color the line using the score color thresholds from CLAUDE.md: green ≥70, amber 50-69, red <50. Since a single line cannot be multicolor in basic Recharts, use a neutral color (e.g., `#6366f1` indigo) for the line and add a `ReferenceLine` at y=70 (green threshold) and y=50 (amber threshold).
- Include a visible disclaimer: "Chart shows compliance score. Readiness score (compliance + capability) will update when Layer 2 benchmarking is complete."
- Add `loading.tsx` skeleton alongside the page for consistency with the rest of the dashboard.

Requirements for Sidebar update:
- Import `TrendingUp` from `lucide-react`.
- Insert `{ href: '/trends', label: 'Trends', icon: TrendingUp }` between the History and Settings entries.

- Run `npm run build` — must be 0 errors before committing.

### Step 4 — Commit and deploy
- `git add app/api/trends/route.ts lib/api/trends.ts app/(dashboard)/trends/ components/layout/Sidebar.tsx`
- Commit message: `feat: add Trends page with compliance score line chart (last 30 runs)`
- Push to main; confirm Vercel deployment passes.
- Smoke-test: navigate to `/trends`, verify chart renders with real data points.

---

## What is explicitly OUT OF SCOPE for this feature

- `trend_bucket` column — rejected, no schema change.
- `readiness_score` on the chart — deferred until BUG 6 (Layer 2) is resolved.
- Authentication / per-user trend isolation — deferred (no auth in the app yet).
- Trend filtering by model or use case — can be added in a follow-up pass once the basic chart is confirmed working.

---

## Pre-existing bugs that are NOT worsened by this change

BUGs 1-8 listed in CLAUDE.md are unaffected by this feature. This change does not write to any existing table, does not touch any existing API route, and does not alter any existing page. The only shared file touched is `Sidebar.tsx`, which is a pure append of one nav item.

---

## Final Verdict

| Dimension | Assessment |
|---|---|
| Frontend proposal | GO — with icon fix (TrendingUp) and score column correction (compliance_score, not readiness_score) |
| Backend proposal | GO — with field list confirmed as 5 specific columns, no wildcard select |
| Database proposal | PARTIAL GO — index only; `trend_bucket` column is rejected |
| Overall sequence | GO — execute Steps 0 → 1 → 2 → 3 → 4 in order, with a build check after each step |
