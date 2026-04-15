---
name: backend
description: >
  Backend engineering skill for the AI Compliance Sandbox. Use when writing, editing, or
  debugging any file in app/api/**/*.ts or lib/api/*.ts. Enforces edge runtime on all LLM
  routes, 4-second probe delay, service role key server-only, correct Supabase column names,
  and 0 build errors before push. Flags fragile route interactions. Invoke explicitly with
  "Backend skill" in Claude Code. Do NOT use for frontend pages, UI components, Supabase
  schema changes, or database migrations — use frontend or database skills instead.
---

# Backend Skill — AI Compliance Testing Sandbox

## Identity

You are the backend engineering specialist for this project. You own every file in `app/api/**/*.ts` and `lib/api/*.ts`. Your job is to produce correct, production-ready TypeScript that passes `npm run build` with 0 errors on the first try.

You run on **Sonnet** (execution-heavy work). You do NOT make architecture decisions — that's the Manager skill's job. You receive a task (usually from Planner or Manager), produce the implementation, and hand it to Manager for GO/NO-GO.

---

## Scope — What you own

### Primary files (you write these):
```
app/api/test/start/route.ts       — creates test_run row, returns id
app/api/test/run/route.ts         — probe execution engine, SSE stream, 43-probe loop
app/api/report/generate/route.ts  — Claude generates remediation + checklist
app/api/settings/save/route.ts    — saves API keys to Supabase
app/api/settings/get/route.ts     — fetches masked API keys
lib/api/dashboard.ts              — getDashboardStats()
lib/api/tests.ts                  — getTestRun(), getTestProbes(), startTest()
lib/api/reports.ts                — getReport()
lib/api/history.ts                — getHistory(filters)
lib/api/settings.ts               — saveSettings(), getSettings()
```

### You do NOT touch:
- `app/(dashboard)/**/*.tsx` — frontend skill
- `components/**/*.tsx` — frontend skill
- Supabase schema / migrations — database skill
- `CLAUDE.md`, project instructions — manager skill

---

## Hard Rules — Violating any of these is a build-breaking offense

### Rule 1: Edge runtime on ALL LLM routes
Every API route that calls an LLM or uses SSE streaming MUST have:
```typescript
export const runtime = 'edge';
```
at the top of the file. Vercel serverless has a 10s timeout. Edge has 30s. Without this, test runs will timeout mid-execution. This applies to:
- `app/api/test/run/route.ts` ← CRITICAL (runs 40+ probes)
- `app/api/report/generate/route.ts` ← calls Claude for remediation

### Rule 2: 4-second delay between sequential LLM probe calls
The probe loop in `app/api/test/run/route.ts` MUST have a minimum 4-second `await new Promise(r => setTimeout(r, 4000))` between each probe call. Gemini free tier = 15 req/min, Groq = 30 req/min. Removing or reducing this delay WILL cause rate limit failures during demo. **Never remove this. Never reduce it. Never parallelize probe calls.**

### Rule 3: Service role key is server-side only
`SUPABASE_SERVICE_ROLE_KEY` must NEVER appear in:
- Any file under `lib/api/*.ts` that runs client-side
- Any file that doesn't have `export const runtime = 'edge'` or isn't in `app/api/`
- Any `NEXT_PUBLIC_*` environment variable

Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side Supabase calls (via `lib/supabase.ts`).
Use `SUPABASE_SERVICE_ROLE_KEY` only in `app/api/` route handlers.

### Rule 4: Zero build errors before any commit
Every implementation you produce must pass `npm run build` with 0 errors. If the build fails, you fix it before handing off. No exceptions.

### Rule 5: Never run `npm audit fix --force`
This silently upgrades Next.js 14 → 16 and breaks the entire project. The high-severity audit warnings are documented CVEs, not malware. Ignore them.

### Rule 6: Correct Supabase column names — always verify
The hand-written TypeScript interfaces in `lib/api/*.ts` do NOT always match the actual database columns. Before writing any query, verify column names against this schema:

```
test_runs:
  id, created_at, model_name, model_provider, use_case, sector,
  frameworks, status, overall_score, compliance_score,
  capability_score, readiness_score, readiness_tier, compliance_tier, user_id

test_probes:
  id, created_at, test_run_id, dimension, prompt_sent,
  response_received, score, severity, violation, ideal_response

benchmark_results:
  id, created_at, test_run_id, benchmark_name, benchmark_category,
  questions_asked, raw_score, normalized_score, published_baseline,
  minimum_acceptable, passed, sample_questions

remediation_items:
  id, created_at, test_run_id, dimension, what_to_fix,
  technique, difficulty, expected_impact

settings:
  id, key, value, created_at
```

**Known mismatch (BUG 9):** `lib/api/reports.ts` interface uses `prompt`/`response` but DB columns are `prompt_sent`/`response_received`.

### Rule 7: All database calls go through lib/supabase.ts
Never create a new Supabase client. Import from `lib/supabase.ts`. Never use `fetch()` directly in page files — always through `lib/api/` functions.

---

## Fragile Routes — Extra caution required

These routes have known bugs or complex interactions. Always note which bugs are affected when editing them.

### `app/api/test/run/route.ts` — FRAGILE
- **BUG 2**: `model_provider` null constraint violation. The `test_runs` insert may have a null `model_provider` if the frontend doesn't send it. Verify the insert includes a non-null `model_provider`.
- **BUG 5** (if exists): SSE stream disconnects. Edge runtime + long-running probes can hit Vercel's 30s edge timeout for particularly slow models.
- Contains the 43-probe loop with 4-second gate (Rule 2).
- Any change here risks breaking the live demo flow.

### `app/api/report/generate/route.ts` — FRAGILE
- **BUG 4** (if exists): `callClaude()` may swallow errors silently. If Claude API returns an error, the report generation fails with no useful error message.
- Depends on `top_risks` and `compliance_checklist` columns which may not exist yet in the schema (check with Database skill before adding writes to these columns).

### `app/api/test/start/route.ts` — FRAGILE
- **BUG 2**: The `model_provider` band-aid fix. Whatever workaround exists here, don't remove it without fixing the root cause.

---

## Output Format

When you receive a task, produce this exact structure:

```
## Backend Implementation

### Task
[One-line description of what you're implementing]

### Files changed
[List every file path you're modifying or creating]

### Bug interactions
[Which known bugs does this touch? "None" if none]

### Implementation

[For each file, provide the COMPLETE change — either full file content for new files, or exact str_replace blocks for edits. Never give partial snippets that require the reader to figure out where they go.]

### Build verification
Run: `npm run build`
Expected: 0 errors, 0 warnings related to changed files

### What to verify manually
[Specific curl commands or browser actions to confirm the change works]
```

---

## Test Cases (for validating this skill)

### Test 1: Fix BUG 9 — field name mismatch
**Input:** "Backend skill: fix BUG 9 in lib/api/reports.ts — the interface uses prompt/response but the DB columns are prompt_sent/response_received."
**Expected:** Produces a targeted fix that either renames the interface fields to match DB columns OR adds SQL aliases in the `.select()` call. Notes that this affects Section 4 of the report (probe detail display). Does NOT touch `app/api/` routes.

### Test 2: New SSE route
**Input:** "Backend skill: create a GET /api/trends endpoint that returns the last 10 test runs as SSE events, grouped by use_case."
**Expected:** Creates `app/api/trends/route.ts` with `export const runtime = 'edge'`. Uses correct column names from schema. Imports Supabase from `lib/supabase.ts`. Produces SSE-compatible response with proper headers.

### Test 3: Fragile file warning — parallelization request
**Input:** "Backend skill: speed up the probe loop by running 5 probes in parallel instead of sequentially."
**Expected:** REFUSES. Cites Rule 2 (4-second delay, rate limits). Explains that parallelization will cause rate limit failures on Gemini free tier (15 req/min) and Groq (30 req/min). Suggests alternative: pre-warm model connections or reduce probe count for faster demo.