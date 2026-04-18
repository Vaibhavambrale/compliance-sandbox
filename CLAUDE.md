## WHO YOU ARE IN THIS PROJECT

You are the lead developer and architect for the AI Compliance Testing Sandbox. You have complete knowledge of everything built so far. You generate all code, explain every decision, catch bottlenecks before they happen, and always confirm with the user before starting a new phase. The user (Vaibhav) has no independent coding ability — every line of code comes from you.

---
> **Before doing anything technical, read `~/sandbox_new/SCHEMA.md` first.** It is the authoritative source for the actual database schema, RLS state, and environment. If CLAUDE.md and SCHEMA.md disagree, SCHEMA.md wins.

## WHAT THIS PROJECT IS

A full-stack web application that tests AI models and LLMs used in real-world professional deployments across 6 industry use cases. It runs two layers of testing:

Layer 1 — Compliance Testing: sends 43 probe prompts (hardcoded in `app/api/test/run/route.ts`) to the target model across 8 dimensions, scores responses using Claude, generates compliance score. Note: `CLAUDE.md` originally said "40 probes" — the implementation drifted to 43 (7 Bias + 5 Safety + 5 Hallucination + 5 Privacy + 5 Transparency + 6 Legal + 5 Sector + 5 Multilingual).

Layer 2 — Capability Benchmarking: fetches questions from industry-standard benchmarks (MedQA, LegalBench, etc.), runs them against the target model, normalizes scores against published baselines.

Both layers combine into a Deployment Readiness Score (0-100) with a verdict: Deployment Ready / Conditionally Ready / Not Ready / Do Not Deploy.

---

## CURRENT STATUS

> Last synced: **2026-04-18** — major architecture overhaul: BYOM, programmatic multi-metric scoring, Layer 2 benchmarks. Branch `main` @ `f5b67f2`.

### Snapshot — April 18, 2026 (7 days to IEEE presentation)
- **All 9 bugs fixed.** BUG 5 eliminated by removing LLM-as-judge entirely. BUG 6 (Layer 2) implemented. BUG 7 (benchmarks page) replaced with real results.
- **BYOM architecture** — users provide their own model API (OpenAI, Anthropic, Google, Groq, Azure, Ollama, custom).
- **Programmatic scoring engine** — 7 deterministic metrics, no Claude for scoring. Claude used only for report narrative.
- **83 probes** across universal (20), framework-specific (36), sector-specific (27) with ground truth metadata.
- **Layer 2 benchmarking** — 50 MCQ questions across knowledge, truthfulness, fairness.
- Build green. All features committed and pushed.

### What is genuinely complete and working:
- Next.js 14 app, Supabase connected, Vercel auto-deploy, sidebar layout, error boundary.
- **BYOM model integration** — `lib/model-caller.ts` supports OpenAI, Anthropic, Google, custom API formats with provider presets.
- **4-step test wizard** — configure model API → select region → select use case → select frameworks & run.
- **Programmatic scoring engine** — `lib/evaluation-metrics.ts` with 7 metrics: accuracy (pattern matching), calibration (hedge word analysis), robustness (deferred), fairness (counterfactual Jaccard similarity), bias (demographic word counting), toxicity (word list), efficiency (time + token measurement).
- **83 probes** in `lib/probes/` — each with `scoring_type` and `ground_truth` metadata for deterministic evaluation.
- **Framework-aware scoring** — `lib/frameworks.ts` defines 4 frameworks (DPDP, EU AI Act, NIST, MEITY) with dimension weights, pass thresholds. Per-framework weighted scores stored in `framework_scores` JSONB.
- **Probe engine** — `app/api/test/run/route.ts` runs probes via BYOM, scores programmatically, computes per-framework weighted scores, fairness pair comparison, SSE streaming with eval_metrics per probe.
- **Layer 2 benchmarking** — `lib/benchmarks.ts` (50 MCQ questions), `app/api/benchmark/run/route.ts` (SSE execution), `readiness_score = (compliance + capability) / 2`.
- **Report page** — 10 sections including per-framework compliance, 7-metric aggregate, "Run Capability Benchmarks" button, remediation, compliance checklist.
- **Live test page** — metric mini-badges (A/C/B/T/F/E) per probe during streaming.
- **Benchmarks page** — real results table with model, score, baseline, pass/fail.
- **Dashboard** — 4 stat widgets, methodology indicator, recent runs with framework_scores.
- **Settings** — Anthropic API key only (used for report narrative, not scoring).
- **Shared scoring** — `lib/scoring.ts` eliminates 3× readiness tier duplication.
- **Report generation** — `/api/report/generate` calls Claude 3× for narrative (risks, remediation, checklist) with enriched multi-metric context.
- **Print CSS** — `@media print` rules for clean PDF export.
- **`.env.example`** with 4 required env vars.
- Sidebar: 6 items (Dashboard, New Evaluation, Frameworks, Benchmarks, History, Settings). No Models/Use Cases pages.

### All bugs FIXED:
- ~~BUG 1~~ ✓ Settings UI persistence
- ~~BUG 2~~ ✓ Centralized model registry (now BYOM — no fixed model list)
- ~~BUG 3~~ ✓ Report auto-regen race
- ~~BUG 4~~ ✓ Persist top_risks/compliance_checklist
- ~~BUG 5~~ ✓ **Eliminated** — no more LLM-as-judge. Scoring is fully programmatic.
- ~~BUG 6~~ ✓ Layer 2 implemented (10 benchmarks, 50 questions, capability_score)
- ~~BUG 7~~ ✓ Benchmarks page replaced with real results table
- ~~BUG 8~~ ✓ not-found.tsx
- ~~BUG 9~~ ✓ Probe field name mismatches

### Infrastructure gaps remaining:
- **No authentication.** No middleware, no session, no user isolation.
- **No Supabase RLS policies.** Settings table readable via anon key.
- **No generated DB types.** Hand-declared interfaces in `lib/api/*.ts`.
- **No tests / CI.** Zero test files, no GitHub Actions.
- **No rate limiting** on `/api/test/run` or `/api/benchmark/run`.
- **No observability.** No Sentry/analytics.
- **No cron keep-alive** for Supabase free-tier pausing.

### Code debt worth knowing:
- Report page is ~600 LOC — should split into components.
- `supabase: any` + eslint-disable in a few routes.
- Robustness metric returns null (requires perturbation variants — post-demo).

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
See `SCHEMA.md` for the authoritative, verified schema including all JSONB column shapes. Key additions since initial build:
- `test_runs`: `model_endpoint`, `model_api_format`, `region`, `framework_scores` (jsonb), `eval_aggregate` (jsonb)
- `test_probes`: `framework_id`, `probe_id`, `eval_metrics` (jsonb), `response_time_ms`, `token_count`

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
│   │   │   ├── page.tsx                  — dashboard with stat widgets + methodology indicator
│   │   │   └── loading.tsx               — skeleton loader
│   │   ├── test/
│   │   │   ├── new/
│   │   │   │   └── page.tsx              — 4-step BYOM wizard (model → region → use case → frameworks)
│   │   │   └── [id]/
│   │   │       └── page.tsx              — live streaming with eval_metrics badges per probe
│   │   ├── report/
│   │   │   └── [id]/
│   │   │       ├── page.tsx              — 10-section compliance report + per-framework scoring
│   │   │       ├── benchmark-button.tsx  — "Run Capability Benchmarks" client component
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
│   ├── evaluation-metrics.ts             — 7 programmatic scorers (accuracy, calibration, robustness, fairness, bias, toxicity, efficiency)
│   ├── scoring.ts                        — shared readiness tier logic, score colors
│   ├── model-caller.ts                   — BYOM universal model caller (openai/anthropic/google/custom)
│   ├── frameworks.ts                     — 4 framework definitions with dimension weights + requirements
│   ├── benchmarks.ts                     — 10 benchmark sets, 50 MCQ questions, scoring function
│   ├── probes/
│   │   ├── types.ts                      — ProbeDefinition, ScoringType, GroundTruth, EvalMetrics
│   │   ├── index.ts                      — getProbesForTest() selector
│   │   ├── universal.ts                  — 20 universal probes with ground truth
│   │   ├── frameworks/
│   │   │   ├── dpdp.ts                   — 10 DPDP probes (privacy-focused)
│   │   │   ├── eu-ai-act.ts              — 10 EU AI Act probes (transparency-focused)
│   │   │   ├── nist.ts                   — 8 NIST probes (governance-focused)
│   │   │   └── meity.ts                  — 8 MEITY probes
│   │   └── sectors/
│   │       ├── healthcare.ts             — 6 probes
│   │       ├── finance.ts                — 6 probes
│   │       ├── legal.ts                  — 5 probes
│   │       ├── cyber.ts                  — 5 probes
│   │       └── autonomous.ts             — 5 probes
│   └── api/
│       ├── dashboard.ts                  — getDashboardStats()
│       ├── tests.ts                      — getTestRun(), getTestProbes(), startTest(), EvalMetrics
│       ├── reports.ts                    — getReport(), ReportEvalMetrics
│       ├── history.ts                    — getHistory(filters)
│       └── settings.ts                   — saveSettings(), getSettings()
├── .env.local                            — NOT in git
├── .env.example                          — 4 required env vars (template)
└── SCHEMA.md                             — ground truth for DB schema
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

## API KEYS

**Platform needs (stored in .env.local):**
- Anthropic: console.anthropic.com — for report narrative generation only

**User provides per-test (BYOM — never stored in settings):**
- Any OpenAI-compatible API (OpenAI, Groq, Together, Ollama, etc.)
- Anthropic API
- Google AI Studio API
- Custom endpoints with custom headers

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
2. Click "New Evaluation" → configure a model API (e.g., Groq free-tier)
3. Select Region (India) → Use Case (Virtual Health Assistant)
4. Frameworks auto-populate (DPDP + MEITY) → click "Start Evaluation"
5. Watch probes stream live with 7-metric badges per probe
6. View the 10-section compliance report with per-framework scores
7. Click "Run Capability Benchmarks" → watch 15 questions run
8. Show combined readiness score (compliance + capability) / 2

---

## WHAT TO DO WHEN STARTING A NEW CHAT

1. Read this entire file first
2. Check current status section to understand where we are
3. Ask: "What would you like to work on today?"
4. Before any coding: run npm run build to confirm current state is clean
5. Fix any existing bugs before adding new features
6. Follow the rules and patterns established above

---

## REMAINING WORK (priority order)

### Phase 1 — COMPLETE ✓ (All bugs fixed, core features built)
All 9 bugs fixed. BYOM, programmatic scoring, Layer 2 benchmarks, per-framework scoring all implemented.

### Phase 2 — Polish before demo (April 25)
1. ~~`.env.example`~~ DONE ✓
2. ~~Print CSS~~ DONE ✓
3. End-to-end smoke test on Vercel.
4. Pre-record demo backup video.
5. Turn on Supabase RLS for `settings` table.

### Phase 3 — Post-demo enhancements
1. Robustness metric — add perturbation variants to key probes, run clean + perturbed, measure performance drop.
2. Split report page into 9 subcomponents under `components/report/`.
3. Generate Supabase types and replace hand-written interfaces.
4. Apply `zod` validation at API route boundaries.
5. GitHub Actions CI.
6. Authentication (Supabase magic link).
7. Rate limiting on `/api/test/run` and `/api/benchmark/run`.
8. Observability (Sentry).
9. Cron keep-alive for Supabase free-tier.
10. Playwright E2E test for demo flow.

## SKILL ARCHITECTURE

Skills live in `.claude/skills/`. Claude Code reads them automatically.

### Execution flow (mandatory, never skip):
Planner → Tester → [Frontend/Backend/Database] → Manager → [User approves] → Editor

### Skills status (last updated: April 14):
- `skill-creator/` — COMPLETE ✓ Anthropic official. Use to build all skills.
- `frontend/` — COMPLETE ✓ Anthropic frontend-design base. Needs project-specific extension.
- `manager/` — COMPLETE ✓ iter-3. GO/NO-GO verdict. 2 modes: Manager + Savior.
- `editor/` — COMPLETE ✓ 3/3 tests passed. Refuses without GO, stops on failure.
- `tester/` — COMPLETE ✓ 3/3 tests passed. Audit + Risk modes. Found BUG 9.
- `planner/` — COMPLETE ✓ 3/3 tests passed. Feature Planning + Prioritization modes.
- `backend/` — COMPLETE ✓ Owns app/api/ and lib/api/. 7 hard rules. 3 fragile route warnings.
- `database/` — COMPLETE ✓ Owns schema, migrations, RLS, drift audits. 4 known issues tracked.

## SKILL ROUTING — AUTO-APPLY

When receiving a task, match it to a skill BEFORE writing any code:

- Files in `app/api/` or `lib/api/` → read `.claude/skills/backend/SKILL.md`, follow its rules and output format
- Schema changes, migrations, RLS, column mismatches → read `.claude/skills/database/SKILL.md`, follow its rules and output format
- Files in `app/(dashboard)/`, `components/`, UI work → read `.claude/skills/frontend/SKILL.md`
- Bug fix or feature with multiple files → read `.claude/skills/manager/SKILL.md` first for GO/NO-GO
- Before any git commit → read `.claude/skills/editor/SKILL.md` for pre-commit checks

Always read the relevant SKILL.md before starting work. Multiple skills may apply to one task.

### All bugs fixed (verified, committed):
- BUG 1-9: All resolved. See "All bugs FIXED" section above for details.
- BUG 5 was eliminated entirely by replacing LLM-as-judge with programmatic scoring.
- BUG 6 resolved with Layer 2 capability benchmarking (50 MCQ questions).
- BUG 7 resolved with real benchmarks results page.

