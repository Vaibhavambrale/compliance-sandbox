# Ground Truth — Infrastructure & Schema

> This file is the SINGLE SOURCE OF TRUTH for the actual state of the database, environment, and external services. If anything in CLAUDE.md or project_state.md contradicts this file, THIS FILE WINS. Update this file IMMEDIATELY when any schema/env/infra change is made — never rely on memory.

> Last verified: 2026-04-18 (schema confirmed via Supabase MCP `information_schema` query)

---

## Supabase Schema (verified live)

### test_runs
```sql
CREATE TABLE test_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  model_name text NOT NULL,
  model_provider text NOT NULL,
  use_case text NOT NULL,
  sector text,
  frameworks text[],
  status text DEFAULT 'running',
  overall_score integer,
  compliance_score integer,
  capability_score integer,
  readiness_score integer,
  readiness_tier text,
  compliance_tier text,
  user_id uuid,
  top_risks text[],
  compliance_checklist jsonb,
  model_endpoint text,
  model_api_format text,
  region text,
  framework_scores jsonb,
  eval_aggregate jsonb
);
```
**Verified 2026-04-18:** `model_endpoint`, `model_api_format`, `region`, `framework_scores`, `eval_aggregate` added via Supabase MCP.

### test_probes
```sql
CREATE TABLE test_probes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  test_run_id uuid REFERENCES test_runs(id) ON DELETE CASCADE,
  dimension text NOT NULL,
  prompt_sent text NOT NULL,
  response_received text,
  score integer,
  severity text,
  violation text,
  ideal_response text,
  framework_id text,
  probe_id text,
  eval_metrics jsonb,
  response_time_ms integer,
  token_count integer
);
```
**Verified 2026-04-18:** `framework_id`, `probe_id`, `eval_metrics`, `response_time_ms`, `token_count` added via Supabase MCP.

### benchmark_results
```sql
CREATE TABLE benchmark_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  test_run_id uuid REFERENCES test_runs(id) ON DELETE CASCADE,
  benchmark_name text NOT NULL,
  benchmark_category text,
  questions_asked integer,
  raw_score float,
  normalized_score integer,
  published_baseline float,
  minimum_acceptable float,
  passed boolean,
  sample_questions jsonb
);
```

### remediation_items
```sql
CREATE TABLE remediation_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  test_run_id uuid REFERENCES test_runs(id) ON DELETE CASCADE,
  dimension text,
  what_to_fix text,
  technique text,
  difficulty text,
  expected_impact text
);
```

### settings
```sql
CREATE TABLE settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```
**Note:** Only `anthropic_api_key` is stored here now (used for report generation). User model API keys are passed per-test via BYOM — never persisted.

---

## RLS Status (verified live)

| Table | RLS Enabled | Active Policies | Effective Protection |
|---|---|---|---|
| test_runs | YES | `"Allow all" FOR ALL USING (true)` | NONE — anon key has full access |
| test_probes | YES | `"Allow all" FOR ALL USING (true)` | NONE |
| benchmark_results | YES | `"Allow all" FOR ALL USING (true)` | NONE |
| remediation_items | YES | `"Allow all" FOR ALL USING (true)` | NONE |
| settings | YES | `"Allow all" FOR ALL USING (true)` | **NONE — API keys world-readable via anon key** |

**Foreign keys all use ON DELETE CASCADE** — deleting a test_run cascades to its probes, benchmark_results, and remediation_items.

---

## Environment Variables (`.env.local`)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Browser-safe |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | SERVER ONLY — bypasses RLS |
| `ANTHROPIC_API_KEY` | yes | For report generation (Claude narrative only) |

User model API keys are provided per-test via BYOM configuration — NOT stored in settings or env.

---

## External Services (verified)

- **Supabase project:** `bfoxykppcrspuhxrcitq` (Mumbai region, free tier)
- **Vercel:** `vaibhavambrales-projects/compliance-sandbox`, auto-deploys on push to `main`
- **GitHub:** `Vaibhavambrale/compliance-sandbox` (private)
- **No CI, no cron, no Sentry, no rate limiting**

---

## JSONB Column Schemas

### `eval_metrics` (on test_probes)
```json
{
  "accuracy": 0.85,
  "calibration": 0.72,
  "robustness": null,
  "fairness": null,
  "bias": 0.95,
  "toxicity": 0.98,
  "efficiency": 0.80
}
```

### `eval_aggregate` (on test_runs)
Same shape as `eval_metrics` — averaged across all probes in the test run.

### `framework_scores` (on test_runs)
```json
{
  "india-dpdp-2023": {
    "score": 72,
    "passed": true,
    "dimensions": {
      "Privacy": 78,
      "Bias": 65,
      "Transparency": 80
    }
  }
}
```

### `sample_questions` (on benchmark_results)
```json
[
  {
    "question": "A 55-year-old male presents with...",
    "modelAnswer": "Based on the symptoms...",
    "correct": true
  }
]
```

---

## How to update this file

When you change the schema, env vars, or infrastructure:
1. Run the change in Supabase / Vercel / etc.
2. Update this file IMMEDIATELY in the same commit.
3. If you only updated this file's text but didn't run the change, mark the section with `[PROPOSED — NOT APPLIED]`.

This file is the ground truth. CLAUDE.md describes intentions and rules; SCHEMA.md describes reality.
