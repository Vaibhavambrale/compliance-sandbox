## Planner brief — Prioritization mode

### Goal
Rank all remaining work by demo impact given 8 days until April 25, so you know what to ship first, what is optional, and what to cut entirely if time runs short.

### Context from CLAUDE.md
- Current state: branch `main` @ `c8648d3`, last audited 2026-04-14. All 10 routes scaffold, probe engine, live-results SSE, and 9-section report page are in place. BUG 8 / `app/not-found.tsx` was already committed (commit 72d1cc4) — exclude from this list.
- **BUG 9** (`lib/api/reports.ts:7-8`) is P1 demo-breaking: `ReportProbe` declares `prompt`/`response` but DB columns are `prompt_sent`/`response_received`. Section 4 of the report (Detailed Findings per-probe table) always renders blank. This is the single highest-priority fix.
- **BUG 3 + BUG 4** interact on the same two fragile files (`app/(dashboard)/report/[id]/page.tsx` and `app/api/report/generate/route.ts`): the auto-regenerate race (BUG 3) means every reload burns Claude credits and risks duplicate `remediation_items`, while BUG 4 means `top_risks` and `compliance_checklist` sections are always empty — both are visible failures on the demo report page.
- **BUG 6** (Layer 2 absent): `readiness_score` is silently set to `compliance_score`; `capability_score` is always NULL. The Deployment Readiness Verdict shown at demo end is currently computed from compliance data only — this must be either honestly labelled or Layer 2 shipped before the demo.

### Tasks by specialist
Ranked work order — do items in this order. Do not start item N+1 until item N is committed and `npm run build` passes.

1. **Backend + Frontend** — BUG 9: Fix `ReportProbe` field names in `lib/api/reports.ts` (rename `prompt`→`prompt_sent`, `response`→`response_received`); verify Section 4 of `/report/[id]` renders probe text. [~30 min]

2. **Backend** — BUG 3: Fix auto-regenerate race in `app/(dashboard)/report/[id]/page.tsx:~76-92`. Add a `generated_at` column check or a `status = 'report_ready'` guard before calling `POST /api/report/generate` — so reloads do not re-trigger Claude. [~1 h]

3. **Backend** — BUG 4: In `app/api/report/generate/route.ts:~113-158`, add `UPDATE test_runs SET top_risks = …, compliance_checklist = …` before the route returns, so the report page can read these columns from the DB. [~45 min]

4. **Backend** — BUG 5: In `app/api/test/run/route.ts:~195-206`, stop defaulting failed Claude scores to `{score: 5, severity: 'medium'}`. Mark failed probes as `severity: 'error'` and exclude them from the compliance score average. Surface the count of errored probes in the SSE stream and on the report page. [~1 h]

5. **Frontend** — BUG 1: In `app/(dashboard)/settings/page.tsx:~44-49`, after a successful save, re-fetch masked values from `/api/settings/get` and populate inputs — instead of resetting to `''`. This prevents the "key deleted" illusion mid-demo if a panelist clicks Settings. [~30 min]

6. **Backend** — BUG 2: In `app/api/test/start/route.ts:6-24`, replace the 4-entry hardcoded `MODEL_PROVIDERS` map with a single shared constant imported from the same source used by `/models/page.tsx`. Return HTTP 400 on unknown models rather than inserting `'Unknown'`. [~45 min]

7. **Frontend** — BUG 6 label (Layer 2 honest labelling, no implementation): In the report page and dashboard verdict banner, add a visible footnote "Readiness score is based on compliance data only — capability benchmarking (Layer 2) is not yet active." This is faster than implementing Layer 2 and prevents a credibility question from the panel. [~30 min]

8. **Infrastructure** — Supabase cron keep-alive: Set up cron-job.org to ping `/api/health` every 5 days. Supabase free tier pauses after 7 days idle. If the database pauses on demo day, the entire app 500s. This takes 10 minutes to set up and the risk of skipping it is total demo failure. [~10 min]

9. **Infrastructure** — `.env.example`: Add file with the 4 required env var names (no values). Low effort, needed for panelist credibility if they inspect the repo. [~5 min]

10. **Backend / Phase 2** — Layer 2 Capability Benchmarking (implement, not just label): Fetch 20 HuggingFace questions per use case, run against target model, cache in `benchmark_results`, normalize to `capability_score`, compute `readiness_score = (compliance + capability) / 2`. This is the correct fix for BUG 6 but carries significant implementation risk close to the deadline. See Cut line below. [~2–3 days]

11. **Infrastructure / Phase 3** — Rate limiting on `/api/test/run`: Supabase-backed or Upstash Redis counter, 1 run per IP per minute. Prevents quota exhaustion if the demo URL is shared. [~2–3 h, deferrable]

12. **Infrastructure / Phase 3** — Cron GitHub Actions CI (`npm ci && npm run build && npm run lint`): Prevents regressions on future pushes. No demo impact. [~1 h, post-demo]

**Database:** Schema is complete for all P1 fixes. BUG 4 requires confirming `test_runs` has `top_risks` (text or jsonb) and `compliance_checklist` (text or jsonb) columns — verify against Supabase dashboard before coding. If columns are absent, a migration ALTER TABLE is required before BUG 4 can be fixed.

**Backend:** Items 1–6 and 10 above.

**Frontend:** Items 1, 5, 7 above.

**Tester:** Before touching any fragile file: confirm current `npm run build` exits 0. After each item: smoke test the demo flow (Dashboard → Use Cases → New Test → Live Probes → Report → Verdict). Regression check for items that touch `app/api/test/run/route.ts`: confirm the 4-second gate is still present and probe count stays at 43.

### Acceptance criteria
Per item time estimates and blockers:

- [ ] **Item 1** (BUG 9) — 30 min. No blockers. Section 4 of `/report/[id]` must show `prompt_sent` and `response_received` text for every probe with score < 10. Touches fragile file `lib/api/reports.ts`. Verify no TypeScript errors after rename.
- [ ] **Item 2** (BUG 3) — 1 h. Depends on item 1 completing first so the report page is not touched twice. After fix: reload `/report/[id]` 3× in quick succession — `remediation_items` count in the DB must not increase. Touches fragile file `app/(dashboard)/report/[id]/page.tsx`.
- [ ] **Item 3** (BUG 4) — 45 min. Depends on item 2 (race fix must land first or item 3 fix itself triggers duplicates). After fix: `test_runs.top_risks` and `test_runs.compliance_checklist` must be non-null after one report generation. Sections 5 and 6 of the report must render content. Touches fragile file `app/api/report/generate/route.ts`. Blocker: confirm `top_risks` and `compliance_checklist` columns exist in `test_runs` — if not, Database step required first.
- [ ] **Item 4** (BUG 5) — 1 h. No blockers besides items 1–3. After fix: deliberately trigger a Claude scoring failure (bad API key) and confirm the run does not produce a falsely "medium" score — probe should be marked `severity: 'error'` and excluded from the average. Touches fragile file `app/api/test/run/route.ts`. Confirm 4-second delay is untouched after this edit.
- [ ] **Item 5** (BUG 1) — 30 min. No blockers. After save, Settings page inputs must show masked key (e.g. `sk-ant-...xxxx`), not empty string.
- [ ] **Item 6** (BUG 2) — 45 min. No blockers. Sending an unknown model name to `/api/test/start` must return HTTP 400. Known model names must continue to produce correct `model_provider` values. Touches fragile file `app/api/test/start/route.ts`.
- [ ] **Item 7** (BUG 6 label) — 30 min. No blockers. Readiness verdict banner must include visible disclaimer text about Layer 2 not being active. No score logic changes.
- [ ] **Item 8** (cron keep-alive) — 10 min. No blockers. Supabase project must respond to a manual ping at `/api/health` (create route if absent). Cron job verified active on cron-job.org dashboard.
- [ ] **Item 9** (`.env.example`) — 5 min. No blockers.
- [ ] **Item 10** (Layer 2) — 2–3 days. Hard blocker: items 1–7 must all be complete and stable before touching `app/api/test/run/route.ts` for Layer 2. See Cut line.
- [ ] **Items 11–12** (rate limiting, CI) — post-demo. No demo impact.

### Dependencies
Default execution order for each item: Backend/Database change → Frontend change → Tester smoke test → `npm run build` (0 errors) → `git push` → Vercel deploy confirmed → next item.

Specific ordering constraints:
- Item 2 (BUG 3 race fix) must land before Item 3 (BUG 4 persist fix) — fixing the persistence without fixing the race will cause the persist to fire on every reload.
- Item 4 (BUG 5 score fallback) must not touch the 4-second gate. Tester must verify gate is intact after every edit to `app/api/test/run/route.ts`.
- Item 10 (Layer 2) is blocked by all P1 items (1–7) being stable. Do not start Layer 2 until the demo flow works cleanly end to end.
- Item 8 (cron keep-alive) is independent — can be done any time, but do it by day 3 so there is time for Supabase to wake before the demo.
- Database column check for `top_risks`/`compliance_checklist` on `test_runs` is a blocker for Item 3. Confirm in Supabase dashboard before writing any code for BUG 4.

### Known bug interactions
All items 1–4 touch one or more of the 5 fragile files:

- `lib/api/reports.ts` — Item 1 (BUG 9). Direct edit to `ReportProbe` interface. Risk: any other query in `reports.ts` that uses the same field names must also be updated. Read the full file before editing.
- `app/(dashboard)/report/[id]/page.tsx` — Item 2 (BUG 3). This 486-LOC file also contains BUG 3 and the readiness-tier logic duplication. The race fix is scoped to lines ~76-92; do not refactor the rest of the file before the demo.
- `app/api/report/generate/route.ts` — Item 3 (BUG 4). Adding the `UPDATE test_runs` call must use `SUPABASE_SERVICE_ROLE_KEY` (server-side only). Confirm `export const runtime = 'edge'` is already present; if not, add it.
- `app/api/test/run/route.ts` — Item 4 (BUG 5). This is the most fragile file in the project: it houses the 4-second probe delay, BUG 5, and BUG 6. Any edit here requires a full end-to-end smoke test (run a probe set to completion) before pushing. Do not combine Item 4 with Item 10 in the same commit.
- `app/api/test/start/route.ts` — Item 6 (BUG 2). Houses the `model_provider` band-aid. Replacing it with a shared constant requires creating or locating the shared constant first — do not hardcode a new list in the route.

BUG 6 (Layer 2 absent) is acknowledged in Item 7 (honest label) and Item 10 (full implementation). The current silent behaviour (`readiness_score = compliance_score`) must be either labelled or replaced before the demo — the IEEE panel will ask about the Deployment Readiness Score formula.

MEITY AI Advisory March 2024: none of the P1 fixes touch compliance framework labelling. If Layer 2 (Item 10) adds checklist content that references MEITY, it must be labelled "emerging / advisory only" everywhere it appears.

### Time estimate and demo-risk assessment
| Item | Estimate | Cumulative | Demo-critical? |
|------|----------|------------|----------------|
| 1 — BUG 9 field names | 30 min | 0.5 h | Yes — Section 4 blank |
| 2 — BUG 3 race fix | 1 h | 1.5 h | Yes — duplicate inserts |
| 3 — BUG 4 persist | 45 min | 2.25 h | Yes — Top Risks empty |
| 4 — BUG 5 score fallback | 1 h | 3.25 h | Yes — corrupts score |
| 5 — BUG 1 settings UX | 30 min | 3.75 h | Medium — confusing UX |
| 6 — BUG 2 model_provider | 45 min | 4.5 h | Medium — 500 on unknown model |
| 7 — BUG 6 label | 30 min | 5 h | Yes — credibility |
| 8 — Cron keep-alive | 10 min | 5.2 h | Yes — total failure risk |
| 9 — .env.example | 5 min | 5.25 h | Low |
| 10 — Layer 2 full | 2–3 days | +3 days | Nice-to-have |
| 11–12 — Rate limit / CI | 3–4 h | post-demo | No |

Items 1–9 total: ~5.5 hours of focused work across 2 days maximum, leaving 6 days of buffer before April 25.

**Verdict: On track** for items 1–9. Items 1–4 are the demo critical path; they must be done in the first 1–2 days. Layer 2 (item 10) is **Tight** — doable if items 1–9 are clean by day 3, but if any P1 item takes longer than estimated, Layer 2 should be cut in favour of the honest label (item 7 already in the plan).

### Cut line
**Mandatory before demo (must ship):** Items 1, 2, 3, 4, 7, 8. These are the items whose absence produces visible failures or total outage on the demo day flow: Section 4 blank, empty Top Risks, corrupted compliance score, Supabase paused, or a Deployment Readiness verdict with no explanation.

**Ship if there is time:** Items 5, 6, 9. BUG 1 (settings UX) and BUG 2 (model_provider) will not break the demo flow for the pre-selected Virtual Health Assistant + Gemini 1.5 Flash path, but they are embarrassing if a panelist clicks around. `.env.example` is a 5-minute win.

**Cut if pressed for time:** Item 10 (Layer 2 full implementation). The honest label in item 7 is a credible substitute for the demo. Do not start Layer 2 implementation if items 1–4 are not already stable — shipping unstable Layer 2 on top of unfixed P1 bugs is the most likely way to break the demo path entirely.

**Never cut:** The 4-second probe delay. The demo plan in CLAUDE.md lists a pre-recorded backup video — if the live run timing is a concern, use the backup rather than touching the gate.
