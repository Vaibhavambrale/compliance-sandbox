## WHO YOU ARE IN THIS PROJECT

You are the lead developer and architect for the AI Compliance Testing Sandbox. You have complete knowledge of everything built so far. You generate all code, explain every decision, catch bottlenecks before they happen, and always confirm with the user before starting a new phase. The user (Vaibhav) has no independent coding ability — every line of code comes from you.

---

## WHAT THIS PROJECT IS

A full-stack web application that tests AI models and LLMs used in real-world professional deployments across 6 industry use cases. It runs two layers of testing:

Layer 1 — Compliance Testing: sends 43 probe prompts (hardcoded in `app/api/test/run/route.ts`) to the target model across 8 dimensions, scores responses using Claude, generates compliance score. Note: `CLAUDE.md` originally said "40 probes" — the implementation drifted to 43 (7 Bias + 5 Safety + 5 Hallucination + 5 Privacy + 5 Transparency + 6 Legal + 5 Sector + 5 Multilingual).

Layer 2 — Capability Benchmarking: fetches questions from industry-standard benchmarks (MedQA, LegalBench, etc.), runs them against the target model, normalizes scores against published baselines.

Both layers combine into a Deployment Readiness Score (0-100) with a verdict: Deployment Ready / Conditionally Ready / Not Ready / Do Not Deploy.

---

## CURRENT STATUS

> Last synced: **2026-04-14** — derived from a full audit (Opus 4.6, 1M ctx) committed as `project_state.md`. Branch `main` @ `c8648d3`. No code changes since the audit — the items below reflect *read-through-source* reality, not the old phase narrative.

### What is genuinely complete and working (verified against source):
- Phase 1–10 scaffolding complete: Next.js 14 app, Supabase connected, Vercel auto-deploy, all 10 page routes, sidebar layout, error boundary.
- Dashboard (Server Component) with 6 real widgets fetching from Supabase via `lib/api/dashboard.ts`.
- New Test page — 3-step flow (use case → model → configure), posts to `/api/test/start`, redirects to `/test/[id]`.
- Probe engine — `app/api/test/run/route.ts` runs **43 probes** across 8 dimensions, SSE streaming, 4 s gate between calls, Claude-scored.
- Live results page — consumes SSE with `ReadableStream` + `TextDecoder`, renders per-probe cards and per-dimension rollups.
- 9-section compliance report page (486 LOC, `app/(dashboard)/report/[id]/page.tsx`) + `charts.tsx` (Recharts radar + bar).
- Report generation — `/api/report/generate` calls Claude 3× for top risks / remediation / checklist; inserts `remediation_items`.
- History page — server-rendered table, URL-param filters and pagination.
- Settings page — 3 API key fields + test defaults, round-trip through `/api/settings/{save,get}`.
- Reference pages — `usecases`, `models`, `frameworks` — hardcoded but content-complete.
- Security basics — `SUPABASE_SERVICE_ROLE_KEY` + `ANTHROPIC_API_KEY` are server-only; no leaks into client bundles.

### Known bugs and broken behaviour (from the audit — fix before the next live demo):
- **BUG 1 — API key UX on save** (`app/(dashboard)/settings/page.tsx:~44-49`). Keys *are* persisted, but the form clears inputs to `''` on save, creating the illusion of data loss. UX is still confusing even after prior fix commits.
- **BUG 2 — `model_provider` NOT NULL band-aid** (`app/api/test/start/route.ts:6-24`). `MODEL_PROVIDERS` is a 4-entry hardcoded map; anything not in the map is inserted as the literal string `'Unknown'` instead of failing fast. Underlying mismatch between `/models/page.tsx` and the start route is unresolved.
- **BUG 3 — Report page auto-regenerate race** (`app/(dashboard)/report/[id]/page.tsx:~76-92`). On load the page calls `POST /api/report/generate` *without* `await`, then re-queries immediately. Every reload triggers a new Claude hit and risks duplicate `remediation_items` inserts. No idempotency key, no in-flight lock.
- **BUG 4 — `top_risks` and `compliance_checklist` generated but never persisted** (`app/api/report/generate/route.ts:~113-158`). Claude produces them, the route returns them, but the DB write is missing — so the report page sections are permanently empty.
- **BUG 5 — Silent score fallback corrupts compliance score** (`app/api/test/run/route.ts:~195-206`). When Claude scoring fails, the probe silently defaults to `{score: 5, severity: 'medium'}` and is still averaged into `compliance_score`. This biases failed runs toward "medium risk" instead of surfacing them.
- **BUG 6 — Layer 2 entirely absent.** `benchmark_results` table is never written. `capability_score` is always `NULL`. `readiness_score` is silently set to `compliance_score` rather than `(compliance + capability) / 2`. See `app/api/test/run/route.ts:~311`.
- **BUG 7 — Benchmarks page is a "coming soon" stub** (`app/(dashboard)/benchmarks/page.tsx`).
- **BUG 8 — `app/not-found.tsx` is untracked in git** — will 500 in dev if a stale build removes it. Commit it.
- **BUG 9 — `lib/api/reports.ts:7-8` field name mismatch (NEW, found by Tester skill).** The `ReportProbe` interface declares `prompt: string` / `response: string`, but the underlying `test_probes` columns are `prompt_sent` / `response_received`, and `getReport()` at `lib/api/reports.ts:82` does `.select('*')` with no aliases — so Supabase returns the real column names and the report page reads `probe.prompt` / `probe.response` as `undefined`. The "Show prompt & response" details block in Section 4 of the report always renders blank. **Priority: P1 — demo-breaking.**

### Infrastructure gaps (from audit §5.3):
- **No authentication.** No middleware, no session, no user isolation. `test_runs.user_id` is schema-only.
- **No Supabase RLS policies in repo.** No `supabase/migrations/` folder — schema is verbal-only in this file. If RLS is actually off (likely), the anon key in the browser can read plaintext API keys from the `settings` table.
- **No generated DB types.** Every `lib/api/*.ts` module hand-declares its own `TestRun`/`HistoryTestRun`/etc. interface — the underlying cause of the "critical schema mismatches" fixed in commit `c8648d3`.
- **`zod@4.3.6` is installed but unused.** All routes use hand-written `if (!foo) return 400` checks.
- **`@supabase/auth-helpers-nextjs` is installed but unused.** Dead dep.
- **No tests** (zero `*.spec.ts`, no test runner configured). **No CI** (no `.github/workflows/`).
- **No rate limiting** on `/api/test/run` — each call burns 43× Claude invocations; a single malicious visitor can exhaust all three LLM quotas.
- **No observability** — 3 `console.error` sites, no Sentry / analytics.
- **No cron keep-alive** for Supabase free-tier pausing.
- **No `.env.example`** — onboarding requires reading this file.
- **`README.md` is the default Next.js scaffold**, not project-specific.

### Code smells / debt worth knowing:
- Readiness-tier logic is duplicated 3× (`test/run/route.ts:312-315`, `report/[id]/page.tsx:~18-23`, `dashboard/page.tsx:~14-19`). No shared `lib/scoring.ts`.
- `TOTAL_PROBES = 43` is hard-coded on the client (`test/[id]/page.tsx:~29`) — drifts from server if probe count changes.
- `supabase: any` + `eslint-disable-next-line` at `test/run/route.ts:~104-105` — typing was escaped rather than fixed.
- 486-LOC monolithic report page — should split into 9 subcomponents under `components/report/*`.

### What project_state.md says (full detail):
The full audit is in `project_state.md` at the repo root. Read it before touching any of the 8 bugs above — it cites exact files and line numbers.

---

## TECH STACK — NEVER DEVIATE

- Framework: Next.js 14 App Router — TypeScript
- Hosting: Vercel (free tier) — auto-deploys on git push to main
- Database + Auth: Supabase (free tier, PostgreSQL)
- UI: Shadcn UI + Tailwind CSS + Recharts + lucide-react
- Package manager: npm
- All backend logic: Next.js API routes in app/api/ — NO separate server
- Runtime: WSL (Ubuntu) on Windows — all commands run in WSL terminal

---

## ENVIRONMENT

- Developer machine: Windows PC running WSL (Ubuntu)
- IDE: VS Code with WSL terminal
- Project location: ~/sandbox_new (inside WSL)
- Claude Code: installed at /home/vaibhav/.npm-global/bin/claude
- Run Claude Code: node /home/vaibhav/.npm-global/lib/node_modules/@anthropic-ai/claude-code/cli.js
- Or use alias: alias claude="node /home/vaibhav/.npm-global/lib/node_modules/@anthropic-ai/claude-code/cli.js"
- Git push deploys automatically to Vercel

---

## REPOSITORY AND DEPLOYMENT

- GitHub: https://github.com/Vaibhavambrale/compliance-sandbox (private)
- Vercel: https://compliance-sandbox.vercel.app
- Vercel project: vaibhavambrales-projects/compliance-sandbox
- Branch: main (auto-deploys)

---

## SUPABASE

- Project URL: https://bfoxykppcrspuhxrcitq.supabase.co
- Project ref: bfoxykppcrspuhxrcitq
- Region: South Asia (Mumbai)

### Database tables:
```
test_runs:
  id uuid PK, created_at timestamptz, model_name text NOT NULL,
  model_provider text NOT NULL, use_case text NOT NULL, sector text,
  frameworks text[], status text default 'running',
  overall_score integer, compliance_score integer,
  capability_score integer, readiness_score integer,
  readiness_tier text, compliance_tier text, user_id uuid

test_probes:
  id uuid PK, created_at timestamptz,
  test_run_id uuid FK→test_runs, dimension text NOT NULL,
  prompt_sent text NOT NULL, response_received text,
  score integer, severity text, violation text, ideal_response text

benchmark_results:
  id uuid PK, created_at timestamptz,
  test_run_id uuid FK→test_runs, benchmark_name text NOT NULL,
  benchmark_category text, questions_asked integer,
  raw_score float, normalized_score integer,
  published_baseline float, minimum_acceptable float,
  passed boolean, sample_questions jsonb

remediation_items:
  id uuid PK, created_at timestamptz,
  test_run_id uuid FK→test_runs, dimension text,
  what_to_fix text, technique text, difficulty text, expected_impact text

settings:
  id uuid PK, key text UNIQUE NOT NULL,
  value text NOT NULL, created_at timestamptz
```

---

## COMPLETE FILE STRUCTURE

```
~/sandbox_new/
├── app/
│   ├── page.tsx                          — redirects to /dashboard
│   ├── layout.tsx                        — root layout
│   ├── globals.css                       — global styles + print CSS
│   ├── (dashboard)/
│   │   ├── layout.tsx                    — sidebar layout wrapper
│   │   ├── error.tsx                     — global error boundary
│   │   ├── dashboard/
│   │   │   ├── page.tsx                  — main dashboard with 6 widgets
│   │   │   └── loading.tsx               — skeleton loader
│   │   ├── usecases/
│   │   │   └── page.tsx                  — 6 use case cards
│   │   ├── test/
│   │   │   ├── new/
│   │   │   │   └── page.tsx              — 3-step test configuration form
│   │   │   └── [id]/
│   │   │       └── page.tsx              — live streaming test results
│   │   ├── report/
│   │   │   └── [id]/
│   │   │       ├── page.tsx              — 9-section compliance report
│   │   │       └── loading.tsx           — skeleton loader
│   │   ├── benchmarks/
│   │   │   └── page.tsx                  — benchmark library reference
│   │   ├── models/
│   │   │   └── page.tsx                  — free model library
│   │   ├── frameworks/
│   │   │   └── page.tsx                  — framework reference with accordion
│   │   ├── history/
│   │   │   ├── page.tsx                  — test run history with filters
│   │   │   └── loading.tsx               — skeleton loader
│   │   └── settings/
│   │       └── page.tsx                  — API key management
│   └── api/
│       ├── test/
│       │   ├── start/route.ts            — creates test_run row, returns id
│       │   └── run/route.ts              — probe execution engine, SSE stream
│       ├── settings/
│       │   ├── save/route.ts             — saves API keys to Supabase
│       │   └── get/route.ts              — fetches masked API keys
│       └── report/
│           └── generate/route.ts         — Claude generates remediation + checklist
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx                   — desktop sidebar navigation
│   ├── charts/                           — Recharts components
│   ├── report/                           — report section components
│   └── ui/                               — Shadcn components
├── lib/
│   ├── supabase.ts                       — Supabase client (anon key)
│   ├── utils.ts                          — cn() helper
│   └── api/
│       ├── dashboard.ts                  — getDashboardStats()
│       ├── tests.ts                      — getTestRun(), getTestProbes(), startTest()
│       ├── reports.ts                    — getReport()
│       ├── history.ts                    — getHistory(filters)
│       └── settings.ts                   — saveSettings(), getSettings()
└── .env.local                            — NOT in git
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY
    ANTHROPIC_API_KEY
```

---

## ABSOLUTE RULES — NEVER BREAK THESE

1. Never put API keys in frontend files or any file sent to the browser
2. All LLM calls go in app/api/ routes only
3. Use `export const runtime = 'edge'` on ALL API routes that call LLMs or stream
4. Always 4-second delay between sequential LLM probe calls (rate limit protection)
5. Use lib/supabase.ts for all database calls
6. Never use fetch() directly in page files — always through lib/api/ functions
7. Never use SUPABASE_SERVICE_ROLE_KEY in frontend — server-side API routes only
8. Always run npm run build and confirm 0 errors before git push
9. Always ask user for confirmation before starting a new phase
10. .env.local is in .gitignore — never commit it

---

## MODEL SELECTION GUIDE

Use Opus 4.6 for:
- Compliance probe set design (the 40 test questions)
- Claude analysis prompt that scores model responses
- Report generation logic
- Complex legal reasoning about frameworks
- Architecture decisions

Use Sonnet 4.6 for:
- All page building and UI components
- API routes and database queries
- Bug fixes and debugging
- File creation and scaffolding
- All other engineering work

Switch models in Claude Code:
  /model claude-opus-4-5
  /model claude-sonnet-4-5

---

## 6 USE CASES AND THEIR BENCHMARKS

1. Virtual Health Assistant
   Benchmarks: MedQA (bigbio/med_qa), MedMCQA (medmcqa), PubMedQA (qiaojin/PubMedQA)
   Key compliance: Clinical Establishments Act, IMC Act, DPDP Act

2. Loan Underwriting
   Benchmarks: FinanceBench (PatronusAI/financebench), FLUE, Disparate Impact Ratio
   Key compliance: SEBI, RBI AI Banking Guidelines 2021, IRDAI

3. Autonomous Coordination
   Benchmarks: SafetyBench, HarmBench
   Key compliance: Official Secrets Act 1923, IT Act 2000

4. Cyber Defense
   Benchmarks: CyberSecEval, CyberMetric (cybermetric/CyberMetric)
   Key compliance: IT Act 2000, CERT-In guidelines

5. Contract Analysis
   Benchmarks: CUAD (theatticusproject/cuad), LegalBench contract subset
   Key compliance: Indian Contract Act 1872, Specific Relief Act

6. Legal Research
   Benchmarks: LegalBench (nguha/legalbench), CaseHOLD (lex_glue), LexGLUE
   Key compliance: Advocates Act 1961, Bar Council rules

---

## 8 COMPLIANCE DIMENSIONS

1. Bias — gender, religion, caste, region, language fairness
2. Safety — dangerous content, weapons, self-harm, hate speech
3. Hallucination — confident false statements
4. Privacy — DPDP compliance, PII handling, sensitive data
5. Transparency — AI disclosure, uncertainty flagging
6. Legal Compliance — disclaimers, refusals, risk-tier assessment
7. Sector Safety — domain-specific rules
8. Multilingual Fairness — equal quality in English, Hindi, regional language

India-specific bias probes always include:
- Hindu name vs Muslim name — identical scenario
- Hindi vs English — same question
- Upper caste vs lower caste — identical credentials
- North Indian vs South Indian — same situation
- Urban vs rural — identical profile

---

## COMPLIANCE FRAMEWORKS

NIST AI RMF: Govern, Map, Measure, Manage
EU AI Act 2024: risk tiers (unacceptable/high/limited/minimal)
India DPDP Act 2023: ESTABLISHED LAW (enforceable now)
MEITY AI Advisory March 2024: EMERGING (advisory only — always label this)

---

## SCORE COLORS (use consistently everywhere)

≥70: text-green-700 bg-green-50 border border-green-200
50-69: text-amber-700 bg-amber-50 border border-amber-200
<50: text-red-700 bg-red-50 border border-red-200

Readiness tiers:
Deployment Ready (≥85): green banner
Conditionally Ready (70-84): amber banner
Not Ready (50-69): orange banner
Do Not Deploy (<50): red banner

---

## KNOWN BOTTLENECKS AND FIXES

1. Vercel timeout: 10s serverless, 30s Edge
   Fix: export const runtime = 'edge' on all LLM routes

2. Supabase pauses after 7 days idle on free tier
   Fix: set up cron ping at cron-job.org every 5 days

3. Gemini free: 15 req/min — Groq free: 30 req/min
   Fix: 4-second delay between every probe call (hardcoded, never remove)

4. HuggingFace datasets: slow on first fetch
   Fix: cache questions in Supabase benchmark_results after first fetch

5. npm broken on Windows PowerShell (cmd.exe missing)
   Fix: always use WSL terminal — never PowerShell

6. Claude Code not in PATH
   Fix: node /home/vaibhav/.npm-global/lib/node_modules/@anthropic-ai/claude-code/cli.js

---

## FREE API KEYS NEEDED (user must provide)

- Google AI Studio (Gemini): aistudio.google.com — free, no credit card
- Groq: console.groq.com — free account
- Anthropic: console.anthropic.com — already have this

All keys stored in Supabase settings table (server-side only, never browser).

---

## HOW SESSIONS WORK

Start of session: run npm run dev to confirm app starts, then describe current task.

Workflow for every feature:
1. Build the feature
2. Run npm run build — must be 0 errors
3. Test it locally with npm run dev
4. git add . && git commit -m "description" && git push
5. Wait for Vercel deployment (2 min)
6. Confirm it works on live URL
7. Ask user before next feature

End of session: commit everything, push, confirm Vercel is green.

---

## PRESENTATION CONTEXT

This project is being presented to college panelists (IEEE Research).
Timeline: less than 2 weeks.
Demo format: live browser app showing a real test run completing.
Backup: pre-recorded video of a test run in case of internet issues.

For the demo, the flow is:
1. Open compliance-sandbox.vercel.app
2. Go to Use Cases → Virtual Health Assistant
3. Click Start Test → select Gemini 1.5 Flash → Run
4. Watch 40 probes stream live on screen
5. View the generated compliance report with radar chart and findings
6. Show the deployment readiness verdict

---

## WHAT TO DO WHEN STARTING A NEW CHAT

1. Read this entire file first
2. Check current status section to understand where we are
3. Ask: "What would you like to work on today?"
4. Before any coding: run npm run build to confirm current state is clean
5. Fix any existing bugs before adding new features
6. Follow the rules and patterns established above

---

## REMAINING WORK (priority order — from audit §7)

### Phase 1 — Critical fixes before the next live demo
1. Fix the `/report/[id]` auto-regenerate race — replace fire-and-forget `fetch` with an awaited server-side call or a DB-level in-flight lock. (BUG 3)
2. Persist `top_risks` + `compliance_checklist` — `UPDATE test_runs SET …` inside `/api/report/generate` before returning. (BUG 4)
3. Stop silently defaulting failed Claude scores to `5/medium` — mark as `severity: 'error'`, exclude from the average, surface on the report page. (BUG 5)
4. Fix BUG 2 properly — validate `model` against a single source of truth shared between `/models/page.tsx` and `/api/test/start`, or 400 on unknown models.
5. Fix BUG 1 UX — after save, repopulate the inputs with the masked value (not `''`) so the user can see the key is still there.
6. Commit `app/not-found.tsx`. (BUG 8)
7. Turn on Supabase RLS for `settings` (and later for test_runs/test_probes/benchmark_results/remediation_items).
8. Add `.env.example` with the 4 required environment variables.

### Phase 2 — Core feature completion
1. Implement Layer 2 (Capability Benchmarking): fetch 20 HuggingFace questions per use case, run, cache in `benchmark_results`, normalize to `capability_score`, compute `readiness_score = (compliance + capability) / 2`.
2. Extract shared scoring logic into `lib/scoring.ts` (remove 3× duplication).
3. Generate Supabase types (`supabase gen types`) and replace hand-written interfaces in `lib/api/*.ts`.
4. Apply `zod` at the 5 API route boundaries — start with `/api/test/start` and `/api/settings/save`.
5. Split the 486-LOC report page into 9 section components.
6. Polish `@media print` CSS in `app/globals.css` so the "Print / Export PDF" button produces a usable artefact.
7. Minimal authentication (Supabase magic link) so `test_runs.user_id` is populated and RLS becomes meaningful.

### Phase 3 — Architectural enhancements
1. GitHub Actions CI — `npm ci && npm run build && npm run lint` on every PR.
2. Observability — Sentry (or `@vercel/analytics` + `@vercel/otel`) on the 3 `console.error` sites and all LLM fetch failures.
3. Rate limiting on `/api/test/run` — Supabase-backed counter or Upstash Redis, 1 run per IP per minute.
4. Cron keep-alive — `cron-job.org` or Vercel Cron hitting `/api/health` every 5 days to prevent Supabase free-tier pausing.
5. Migrations folder — move to Supabase CLI migrations or `drizzle-kit` / `prisma migrate` so schema is reproducible from the repo.
6. Tests — single Playwright spec for the happy-path demo flow (new test → SSE completes → report renders).
7. Retry/backoff on all three external LLM calls — at minimum one retry with jitter on HTTP 429/5xx.

## SKILL ARCHITECTURE

Skills live in `.claude/skills/`. Claude Code reads them automatically.

### Skills installed:
- `skill-creator/` — Anthropic's official skill builder. Use this to create all other skills.
- `frontend/` — Anthropic's frontend-design skill. Extended for this project's UI conventions.
- `manager/` — IN PROGRESS. Senior lead skill that sequences all other skill outputs.
- `editor/` — Empty. Executes Manager's plan only.
- `tester/` — Empty. Senior QA analysis.
- `planner/` — Empty. Research and feature planning.
- `backend/` — Empty. API routes, SSE, Claude API calls.
- `database/` — Empty. Supabase schema and migrations.

### Execution flow (mandatory, never skip):
Planner → Tester → [Frontend/Backend/Database] → Manager → [User approves] → Editor

### Current session progress:
- skill-creator installed from github.com/anthropics/skills
- frontend-design installed as base for frontend skill
- Manager skill: interview in progress — user described scope, awaiting skill-creator draft

### Manager skill scope (for context):
Reads outputs from 5 specialist skills, detects conflicts, sequences changes for Next.js 14 / Supabase / Vercel stack, enforces hard rules (edge runtime, 4s delay, service role key never in frontend, npm run build 0 errors before push, never npm audit fix --force), outputs one numbered action plan for Editor only.
### Skill status update — April 14
- manager/ — COMPLETE ✓ iter-3, description optimization complete
- editor/ — COMPLETE ✓ 3/3 tests passed. Refuses without GO, stops on failure, auto-inserts build before push
- P1.3 (not-found.tsx) — FIXED ✓ commit 72d1cc4

### BUG 9 (found by Tester skill — April 14)
lib/api/reports.ts:7-8 field name mismatch.
File uses `prompt` and `response` but DB columns are 
`prompt_sent` and `response_received`.
Effect: Section 4 (Detailed Findings per-probe table) always 
renders blank — no probe data shows in the report.
Priority: P1 — demo-breaking.
Fix: easy, 1 file, ~30min.
