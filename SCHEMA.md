# Ground Truth — Infrastructure & Schema

> This file is the SINGLE SOURCE OF TRUTH for the actual state of the database, environment, and external services. If anything in CLAUDE.md or project_state.md contradicts this file, THIS FILE WINS. Update this file IMMEDIATELY when any schema/env/infra change is made — never rely on memory.

> Last verified: 2026-04-15 (schema confirmed via Supabase SQL editor dump)

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
  compliance_checklist jsonb
);
```
**Verified 2026-04-16:** `top_risks` and `compliance_checklist` confirmed present via `information_schema` query. All columns accounted for.

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
  ideal_response text
);
```

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
| `ANTHROPIC_API_KEY` | yes | For scoring + report generation |

User-supplied Gemini and Groq keys are stored in the `settings` table, NOT in env.

---

## External Services (verified)

- **Supabase project:** `bfoxykppcrspuhxrcitq` (Mumbai region, free tier)
- **Vercel:** `vaibhavambrales-projects/compliance-sandbox`, auto-deploys on push to `main`
- **GitHub:** `Vaibhavambrale/compliance-sandbox` (private)
- **No CI, no cron, no Sentry, no rate limiting**

---

## How to update this file

When you change the schema, env vars, or infrastructure:
1. Run the change in Supabase / Vercel / etc.
2. Update this file IMMEDIATELY in the same commit.
3. If you only updated this file's text but didn't run the change, mark the section with `[PROPOSED — NOT APPLIED]`.

This file is the ground truth. CLAUDE.md describes intentions and rules; SCHEMA.md describes reality.