# Plan Validation: Reducing Probe Delay / Parallelizing Calls

**Verdict: NO-GO — Hard rule violation. Do not proceed.**

---

## What the proposal asks

1. Drop the 4-second inter-probe delay to 1 second, OR
2. Batch probes in groups of 5 using `Promise.all` (effectively 0 s delay within a batch)

---

## Why this is blocked — Hard Rule #4

`CLAUDE.md` Rule 4 is explicit and unconditional:

> "Always 4-second delay between sequential LLM probe calls (rate limit protection) — **hardcoded, never remove**"

The comment in source code (`app/api/test/run/route.ts`, line 263) echoes this directly:

```ts
// Rate limit protection - never remove this delay
await delay(4000)
```

This is not a soft guideline. The rule was written to prevent hitting rate limits on Gemini (15 req/min free tier) and Groq (30 req/min free tier). It applies to every model variant, including the free keys stored in Supabase settings.

---

## Why the engineer's reasoning is flawed

**"We haven't seen a 429 in weeks"**

Absence of 429 errors in recent testing does not mean headroom is safe at 1 s or in parallel batches. The free-tier limits are fixed by Google and Groq independently of observed behavior. A live panelist demo with a fresh run of 43 probes at 1 s intervals = 43 requests in ~43 seconds = ~60 req/min against Gemini's 15 req/min cap. That is a guaranteed 429 cascade mid-demo — exactly the worst possible moment.

**The `Promise.all` batching proposal is worse, not better**

Batches of 5 in parallel would fire 5 simultaneous requests per batch. With 43 probes that is roughly 9 batch rounds. Each batch round hits Gemini with 5 requests nearly simultaneously. Gemini's 15 req/min limit applies to concurrent requests too — a 5-wide burst will 429 almost immediately. Claude is also called once per probe for scoring (lines 266-272), so this doubles the concurrent API pressure. The route also runs inside an Edge runtime with a 30 s Vercel timeout — a 429 retry loop inside parallelized probes would blow that limit and kill the stream mid-run.

**"Actual rate limit headroom is higher in practice"**

There is no evidence in this codebase for that claim. The keys come from free-tier accounts (confirmed by CLAUDE.md's API key section). Gemini free is 15 req/min. Groq free is 30 req/min. At 4 s spacing, 43 probes = 172 s total elapsed, well within those limits. At 1 s spacing it is 43 s for model calls plus ~43 s for scoring = ~86 s — that overshoots Gemini's 15 req/min window.

---

## The actual problem and the right fix

The demo concern is legitimate — a 3+ minute run during a live presentation is a UX liability. But the solution is not to remove rate-limit protection that the project explicitly prohibits. Better approaches that do not violate hard rules:

1. **Use Groq instead of Gemini for the demo.** Groq's limit is 30 req/min vs Gemini's 15 req/min. At 4 s spacing this makes no difference to run time, but if the limit were ever relaxed Groq has twice the headroom.

2. **Pre-run the demo test before the panel.** Start the 43-probe run 3 minutes before presenting. Walk through the use-case selection UI live, then flip to the already-complete results page. The audience sees the completed output; you narrate the flow from the history page. No live waiting required.

3. **Show a pre-completed test run.** CLAUDE.md's own demo backup plan is a pre-recorded video. An identical strategy works with a real pre-seeded database row — open the report page for a run completed an hour earlier and walk through it live. The data is real; only the timing is shifted.

4. **Reduce probe count for a demo-mode flag (future work, not now).** A properly gated `?demo=true` path that runs a representative 10-probe subset at 4 s delay = 40 s total would be fast and compliant. This is a new feature requiring a new phase — not something to rush before the panel.

---

## Summary

| Criterion | Result |
|---|---|
| Violates a hard project rule | YES — Rule 4 explicitly forbids this |
| Risk of demo failure (429 cascade) | HIGH — Gemini free tier cannot sustain 1 s spacing |
| Risk with Promise.all batching | CRITICAL — concurrent bursts will 429 immediately |
| Safer alternatives exist | YES — pre-run or pre-seeded demo data |
| Recommended action | Reject the proposal; use pre-run demo strategy |

**Do not merge this change. Reject it and advise the demo preparation alternative instead.**
