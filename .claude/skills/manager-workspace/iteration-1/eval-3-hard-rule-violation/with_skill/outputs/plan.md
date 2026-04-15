## Summary
Backend skill has proposed reducing the inter-probe delay from 4 seconds to 1 second, or alternatively parallelizing probes in batches of 5 using `Promise.all`, in `app/api/test/run/route.ts`. The stated goal is to shorten the live demo run time for the IEEE Research panel presentation. No schema changes, no frontend changes, and no new routes are proposed — this is a single-file timing change in the probe execution engine.

## Conflicts detected
None. No other specialist skills have proposed changes in this session.

## Hard-rule violations
- **Rule 2 violated — 4-second delay between sequential probe calls** (`app/api/test/run/route.ts`). Backend's proposal to drop to 1 second or parallelize with `Promise.all` directly violates Hard Rule 2. The rule exists because Gemini free tier is capped at 15 req/min and Groq free tier at 30 req/min. The math: 43 probes at 1 s delay = ~43 req/min against a 15 req/min ceiling — that is 2.8× over the Gemini limit. At 4 s delay, 43 probes = ~14.3 req/min, which fits inside the 15 rpm budget with one request of headroom. `Promise.all` batches of 5 would burst 5 simultaneous calls, instantly triggering 429s on the first batch. "We haven't seen a 429 in weeks" is not a valid counter-argument: absence of recent 429s is proof the delay is working, not proof it is safe to remove. The 4 s gate is the only thing keeping this run inside free-tier limits. Removing or shortening it will corrupt the compliance score via the silent fallback that is already identified as BUG 5 in `CLAUDE.md` — failed Claude-scoring calls silently default to `{score: 5, severity: 'medium'}` and are blended into the average. A demo run that 429s halfway through will produce a plausible-looking but meaningless compliance score, precisely during the live panel.

## Execution order
This plan is a NO-GO. No execution steps are issued. If the user still wants to make the demo run feel faster, the safe alternatives are listed in Bottleneck warnings below.

1. Database — skipped, no schema change.
2. Backend — NO-GO. Do not modify the probe delay or add parallelism.
3. Frontend — skipped, no frontend change proposed.
4. Build check — skipped, no code changes approved.
5. Tests — skipped.
6. Push — skipped.

## Bottleneck warnings
- **Gemini 15 rpm / Groq 30 rpm rate limits.** At 1 s delay, 43 probes would fire at ~43 req/min — 2.8× over Gemini's ceiling. `Promise.all(5)` would burst 5 calls simultaneously in the first second, guaranteeing a 429 storm. Either approach corrupts the compliance score via BUG 5 (silent `{score: 5, severity: 'medium'}` fallback), producing a misleading verdict in front of panelists.
- **BUG 5 silent score fallback is still unresolved.** Any 429 from a rate-limited probe silently injects a score of 5/medium into the compliance average rather than surfacing as an error. This bug is on the Phase 1 critical-fix list and must be fixed before the demo regardless — reducing the delay would trigger it frequently.
- **No rate limiting on `/api/test/run`.** The route already has no per-IP guard. Reducing the delay further amplifies the blast radius of a single accidental double-submit during the demo.
- **Supabase free-tier keep-alive not configured.** No cron keep-alive exists. If the demo falls within a 7-day idle window, the database may be paused. This is a separate demo-blocker to address before the panel date.
- **Safe alternatives for demo speed (does not violate any hard rule):** (a) Pre-run the test 30 minutes before the panel and navigate directly to the completed report — skip the live probe stream entirely. (b) Keep a pre-recorded video backup as `CLAUDE.md` already recommends. (c) If a live run is required on stage, start it before the presentation opens and switch to the live results tab while it completes in the background — the SSE stream will still animate the probe cards in real time even if the run started earlier.

## Pre-push checklist
- [ ] `npm run build` shows 0 errors
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` references in any `app/(dashboard)/**`, `components/**`, or client-side file
- [ ] All new or modified LLM-calling routes have `export const runtime = 'edge'`
- [ ] 4-second probe delay intact in `app/api/test/run/route.ts` — NOT modified
- [ ] `.env.local` not staged
- [ ] Active bugs not worsened — BUG 1 (API keys on reload) and BUG 2 (model_provider null) unaffected by this change
- [ ] BUG 5 (silent score fallback) is on the Phase 1 fix list — resolve before the demo regardless of delay decision

**VERDICT: NO-GO — dropping the 4 s probe delay or parallelizing with `Promise.all` directly violates Hard Rule 2; at 1 s / batch-5, Gemini's 15 rpm ceiling is exceeded 2–3×, 429s will corrupt the compliance score via BUG 5's silent fallback, and the live demo will produce a meaningless readiness verdict in front of the IEEE panel.**

## Session handoff
- **CLAUDE.md:** No changes required. The 4-second delay rule and the Gemini/Groq rate-limit numbers are already correctly documented under KNOWN BOTTLENECKS item 3 and ABSOLUTE RULES item 4.
- **Project instructions:** Nothing. The hard rule is already explicit.
- **Memories:** Nothing new to save. This NO-GO should be treated as a resolved question — the delay is not negotiable and the pre-recorded backup demo path in CLAUDE.md is the correct answer to demo-speed concerns.
