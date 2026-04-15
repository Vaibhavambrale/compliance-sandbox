## Planner brief — Feature Planning mode

### Goal

Add a 7th use case (Supply Chain Compliance) to the AI Compliance Testing Sandbox, covering all touch points — use case card, probe set, sector-specific benchmark mapping, and report display — without breaking the existing demo flow or any of the 4 fragile files with active P1 bugs.

### Context from CLAUDE.md

- **Current state:** Branch `main` @ `c8648d3`, April 14 2026. 11 days until the April 25 IEEE deadline. The demo flow runs Virtual Health Assistant end-to-end; 5 P1 bugs remain open on that same path (BUG 3, BUG 4, BUG 5, BUG 9 are demo-breaking; BUG 2 corrupts model provider data silently).
- **This is a scope-expansion request competing against 5 open P1 bugs.** The demo panel flow is Dashboard → Use Cases → New Test (Virtual Health Assistant) → Live Probes → Report → Verdict. A 7th use case card is additive to the reference page and does not change that path — BUT adding Supply Chain probe coverage requires editing `app/api/test/run/route.ts` (fragile file, BUG 5 + BUG 6) and `app/api/test/start/route.ts` (fragile file, BUG 2). Any edit to those files while P1 bugs are live carries non-trivial regression risk.
- **BUG 6 (Layer 2 absent)** means `capability_score` is always NULL. A new use case needs benchmarks assigned, but those benchmarks can never actually run until Layer 2 is implemented. Benchmark mapping here is labeling work only — it cannot produce scores until BUG 6 is fixed.
- **BUG 9** (`lib/api/reports.ts` field mismatch) means the per-probe detail block in every report is blank. Adding a new use case does not fix this and a Supply Chain report will have the same blank section.
- **MEITY AI Advisory March 2024** is emerging/advisory only — if cited in Supply Chain probe copy it must be labeled accordingly.

### Tasks by specialist

**Database:** Not required. No schema changes needed — `test_runs.use_case` is a free-text `text` column; `sector` is already nullable text. The new use case value `'supply_chain'` (or a display label) can be inserted by the start route without a migration. No new tables, no index changes.

**Backend:**
1. `app/api/test/start/route.ts` — extend the `MODEL_PROVIDERS` map if needed and, more critically, add `'supply_chain'` (or the exact string the frontend sends) to the accepted `use_case` values. This file has BUG 2 active; the edit must not widen the band-aid — it should instead fix BUG 2 by introducing a shared `VALID_USE_CASES` constant that is also imported by the frontend. That constant becomes the single source of truth.
2. `app/api/test/run/route.ts` — add Supply Chain sector probes to `generateProbes()`. The existing 43 probes are generic across all 6 use cases for the 8 compliance dimensions; the "Sector Safety" dimension (5 probes) contains use-case-specific language. Add a Supply Chain branch to that dimension's probe array. **This file is fragile (BUG 5, BUG 6) — the edit must be surgical: only the Sector Safety probe array, no changes to scoring logic, no changes to the 4-second delay, no changes to the SSE stream or score-averaging path.**
3. `lib/api/tests.ts` — if `startTest()` has a hardcoded list of valid use cases, add `'supply_chain'` there too.

**Frontend:**
1. `app/(dashboard)/usecases/page.tsx` — add a 7th card for Supply Chain Compliance. The card is hardcoded HTML; no data-layer change. Copy the card pattern from any of the 6 existing cards. Include: use case title, icon (lucide-react `Package` or `Truck`), description sentence, compliance frameworks (see below), and a "Start Test" link that passes `use_case=supply_chain` to the New Test page.
2. `app/(dashboard)/test/new/page.tsx` — confirm the 3-step wizard's use-case selector includes Supply Chain. If the selector is also a hardcoded list, add the entry. If it reads from a shared constant (it does not currently — this is part of BUG 2), import the new shared constant from step Backend-2 above.
3. `app/(dashboard)/benchmarks/page.tsx` — this is currently a "coming soon" stub (BUG 7). No need to fix BUG 7 here; simply ensure that when BUG 7 is eventually fixed, a Supply Chain row exists in whatever static data structure is used. For now: add a commented placeholder to the stub noting the Supply Chain benchmarks (SupplyChainBench, LogisticsQA).

**Tester:** Before any code is written, confirm current build state (`npm run build` — 0 errors). After each fragile-file edit, re-run `npm run build`. Regression-check: navigate to Use Cases page (all 7 cards render), start a Virtual Health Assistant test (existing demo flow must still stream 43 probes), open the report (no blank sections introduced by the new code). Do not start a Supply Chain test on the demo instance until BUG 5 is fixed — a failed Claude scoring call would silently corrupt the compliance score.

### Acceptance criteria

- [ ] `app/(dashboard)/usecases/page.tsx` renders exactly 7 use case cards; the Supply Chain card shows title, description, at least 2 applicable compliance frameworks, and a working "Start Test" link.
- [ ] Clicking "Start Test" on the Supply Chain card pre-selects `use_case = 'supply_chain'` in the New Test wizard's step 1 dropdown — no manual selection required.
- [ ] `app/api/test/start/route.ts` accepts `use_case = 'supply_chain'` and creates a `test_runs` row without inserting `model_provider = 'Unknown'` — BUG 2 must be fixed as part of this change, not widened.
- [ ] `app/api/test/run/route.ts` generates at least 5 Supply Chain–specific Sector Safety probes (covering topics such as vendor vetting bias, cross-border data transfer under DPDP Act, AI-generated procurement recommendations without human oversight disclosure, hallucinated certifications/standards). Total probe count remains 43 — the new probes replace the generic Sector Safety branch for this use case, they do not add to the count.
- [ ] A completed Supply Chain test run produces a report at `/report/[id]` that passes `npm run build` and renders without React errors; the radar chart displays all 8 dimensions.
- [ ] The existing Virtual Health Assistant demo flow (Dashboard → Use Cases → New Test → Live Probes SSE → Report → Verdict) is unaffected — regression-checked by Tester after every fragile-file edit.
- [ ] `TOTAL_PROBES` constant on the client (`app/(dashboard)/test/[id]/page.tsx:~29`) does not need to change (count stays 43); confirm no drift.
- [ ] No MEITY AI Advisory March 2024 references appear in Supply Chain probe copy or compliance framework labels unless explicitly marked "emerging / advisory only".

### Dependencies

1. **Backend first — shared use-case constant.** Create a shared `lib/use-cases.ts` (or equivalent) that exports `VALID_USE_CASES` including `'supply_chain'`. This constant is the prerequisite for all other steps; BUG 2 cannot be correctly fixed without it.
2. **Backend — probe additions.** Edit `app/api/test/run/route.ts` (Sector Safety branch only). Must happen after the shared constant exists so the start route is validated before the run route is reachable.
3. **Frontend — use case card and wizard.** Can proceed in parallel with step 2 once the shared constant is in place. Imports `VALID_USE_CASES` rather than maintaining its own list.
4. **Tester — regression check.** After every fragile-file edit. Final check after all three backend/frontend steps are committed but before git push.
5. **Manager GO gate.** Required before Editor runs any of the above. Manager must review the fragile-file edits (start route and run route) for conflict with the active BUG 2 and BUG 5 fixes.

Default order applies: Database (skip) → Backend → Frontend → Tester → Manager GO → Editor.

### Known bug interactions

- **`app/api/test/start/route.ts` (BUG 2 — `model_provider` band-aid).** This plan requires editing this file to add Supply Chain as a valid use case. The edit must fix BUG 2 properly (shared constant + 400 on unknown) rather than extend the band-aid. If BUG 2 is not fixed in the same PR, the new use case will silently insert `model_provider = 'Unknown'` whenever an unrecognised model string is passed, corrupting the `test_runs` row.
- **`app/api/test/run/route.ts` (BUG 5 — silent score fallback; BUG 6 — Layer 2 absent).** Adding Sector Safety probes for Supply Chain is a read-and-extend operation on `generateProbes()`. It does not touch the scoring path where BUG 5 lives (lines ~195-206) or the `readiness_score` override where BUG 6 lives (line ~311). However, if the edit accidentally modifies the score-averaging block or removes the 4-second delay, it will worsen BUG 5 and BUG 6. **The Editor must be instructed to limit its diff strictly to the `generateProbes()` Sector Safety array.** BUG 5 should be fixed as a separate PR before or concurrently — a Supply Chain test with BUG 5 live will silently bias its compliance score if any of the 43 Claude-scoring calls time out.
- **`app/(dashboard)/report/[id]/page.tsx` (BUG 3 — auto-regenerate race; BUG 4 — top_risks not persisted).** The Supply Chain report will exhibit both bugs identically to all existing reports. No new risk introduced; existing risk is not resolved by this feature.
- **`lib/api/reports.ts` (BUG 9 — field mismatch).** The Supply Chain report's Section 4 (per-probe detail block) will be blank for the same reason every other report's Section 4 is blank. No new risk; BUG 9 must be fixed separately.
- **`TOTAL_PROBES = 43` client constant (`app/(dashboard)/test/[id]/page.tsx:~29`).** Plan keeps probe count at 43 (Supply Chain replaces the generic Sector Safety branch for this use case; it does not add probes). If the count is accidentally raised, the client's hardcoded constant will drift and the progress bar will show incorrect percentages.

### Time estimate and demo-risk assessment

| Task | Estimate |
|---|---|
| Create shared `lib/use-cases.ts` constant + fix BUG 2 in start route | 1.5 h |
| Write 5 Supply Chain Sector Safety probes (Opus 4.6 for probe quality) | 1 h |
| Edit `generateProbes()` Sector Safety branch in run route | 1 h |
| Add 7th use case card to usecases page + wizard update | 1 h |
| Tester regression check + Manager GO review | 0.5 h |
| **Total** | **~5 hours** |

**Days remaining:** 11 (April 14 → April 25).

**Verdict: Tight — but the real constraint is not time, it is sequencing.**

5 P1 bugs are open today. BUG 3 (report race), BUG 4 (top_risks not persisted), BUG 5 (silent score fallback), and BUG 9 (field mismatch → blank report sections) are all demo-breaking on the Virtual Health Assistant path — the actual demo flow. Adding a 7th use case while those bugs are open means:

- The demo still uses Virtual Health Assistant, not Supply Chain. The Supply Chain card is additive polish that the panel may never click.
- Every edit to a fragile file for this feature adds merge risk on top of the P1 bug fixes that must land first.
- If P1 fixes are not done by April 22, there will be no time to regression-check the Supply Chain additions.

**Recommendation:** Fix BUG 3, BUG 4, BUG 5, and BUG 9 first (estimated 4–6 h combined). Then, if at least 4 days remain before April 25, proceed with Supply Chain. If fewer than 4 days remain, take the Cut line below.

### Cut line

**Minimum viable version (if time is short or P1 fixes run long):**

1. Add the Supply Chain card to `app/(dashboard)/usecases/page.tsx` only — static HTML, no backend changes, 30 minutes. The card is visible in the demo and signals breadth without touching any fragile file.
2. Do not edit `app/api/test/run/route.ts` or `app/api/test/start/route.ts`. The Supply Chain card's "Start Test" link can point to the New Test wizard pre-filtered to Supply Chain — but if the wizard's use-case list is hardcoded and does not include it, the selector simply won't pre-select. That is acceptable for a demo that uses Virtual Health Assistant.
3. Defer the 5 Supply Chain sector probes, BUG 2 fix integration, and benchmark mapping until after April 25.

**What this cut preserves:** demo flow is entirely unaffected (still runs Virtual Health Assistant); the panel sees 7 use case cards on the reference page, which is a talking point about breadth; zero fragile-file edits.

**What this cut defers:** actual runnable Supply Chain tests; BUG 2 fix via shared constant; Layer 2 benchmark labels for Supply Chain.

The Cut line is the recommended path if P1 bugs are not resolved by April 21.
