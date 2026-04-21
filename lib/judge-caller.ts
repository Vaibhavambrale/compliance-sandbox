/**
 * Judge caller for LLM-as-judge semantic metrics.
 *
 * Uses the platform's own Anthropic key (not the user's BYOM model).
 * Designed for Edge runtime: no external deps, fetch-based, temp=0 for determinism.
 *
 * Safety design:
 * - Every call returns a result object — never throws to caller.
 * - Built-in retry with exponential backoff on 429/5xx.
 * - Global budget: JudgeBudget class limits total calls per test run.
 * - Temperature pinned to 0 for test-retest reproducibility.
 */

const JUDGE_MODEL = process.env.JUDGE_MODEL || 'claude-haiku-4-5-20251001'
const JUDGE_TEMPERATURE = Number(process.env.JUDGE_TEMPERATURE ?? 0)
const JUDGE_MAX_CALLS_DEFAULT = Number(process.env.JUDGE_MAX_CALLS_PER_RUN ?? 250)
const JUDGE_MAX_TOKENS = 1024
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

export interface JudgeResult {
  ok: boolean
  content: string
  parsed: unknown | null
  tokens: number
  latency_ms: number
  error?: string
  attempts: number
}

export interface JudgeOptions {
  maxRetries?: number      // default 2
  systemPrompt?: string    // optional system prompt
  timeoutMs?: number       // default 15000
}

/**
 * Per-test-run judge budget. Tracks remaining calls; zero means graceful skip.
 * Not thread-safe globally — each request creates its own instance.
 */
export class JudgeBudget {
  private _consumed = 0
  constructor(private readonly _max: number = JUDGE_MAX_CALLS_DEFAULT) {}

  get max(): number { return this._max }
  get consumed(): number { return this._consumed }
  get remaining(): number { return Math.max(0, this._max - this._consumed) }
  get exhausted(): boolean { return this.remaining <= 0 }
  get enabled(): boolean { return this._max > 0 }

  /**
   * Try to reserve `n` calls. Returns true if reserved.
   * If not enough remaining, returns false and doesn't consume.
   */
  tryReserve(n: number = 1): boolean {
    if (this._consumed + n > this._max) return false
    this._consumed += n
    return true
  }

  /** Refund an unused reservation (e.g., failed early). */
  refund(n: number = 1): void {
    this._consumed = Math.max(0, this._consumed - n)
  }

  snapshot() {
    return {
      max: this._max,
      consumed: this._consumed,
      remaining: this.remaining,
      exhausted: this.exhausted,
    }
  }
}

/**
 * Call the judge LLM with a prompt, expect a JSON response.
 *
 * Contract:
 * - Never throws; always resolves to JudgeResult.
 * - `parsed` is null unless response was valid JSON.
 * - On network/API failure, `ok=false, error=<message>`.
 * - Respects JUDGE_MAX_CALLS via caller-provided budget (not enforced internally).
 */
export async function callJudge(
  prompt: string,
  options: JudgeOptions = {}
): Promise<JudgeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      ok: false,
      content: '',
      parsed: null,
      tokens: 0,
      latency_ms: 0,
      error: 'ANTHROPIC_API_KEY not configured',
      attempts: 0,
    }
  }

  const maxRetries = options.maxRetries ?? 2
  const timeoutMs = options.timeoutMs ?? 15000
  const startTime = Date.now()
  let lastError = ''
  let attempts = 0

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attempts++
    try {
      const controller = new AbortController()
      const tid = setTimeout(() => controller.abort(), timeoutMs)

      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: JUDGE_MODEL,
          max_tokens: JUDGE_MAX_TOKENS,
          temperature: JUDGE_TEMPERATURE,
          system: options.systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      clearTimeout(tid)

      // Retry on 429 / 5xx
      if (res.status === 429 || res.status >= 500) {
        lastError = `HTTP ${res.status}`
        if (attempt < maxRetries) {
          await sleep(backoffMs(attempt))
          continue
        }
        return failure(lastError, startTime, attempts)
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        return failure(`HTTP ${res.status}: ${body.slice(0, 120)}`, startTime, attempts)
      }

      const data = await res.json() as {
        content?: { type: string; text?: string }[]
        usage?: { input_tokens: number; output_tokens: number }
      }

      const text = data.content?.find(c => c.type === 'text')?.text ?? ''
      const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0)

      return {
        ok: true,
        content: text,
        parsed: safeParseJson(text),
        tokens,
        latency_ms: Date.now() - startTime,
        attempts,
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      if (attempt < maxRetries) {
        await sleep(backoffMs(attempt))
        continue
      }
      return failure(lastError, startTime, attempts)
    }
  }

  return failure(lastError || 'unknown error', startTime, attempts)
}

/**
 * Convenience: call judge and return parsed JSON of expected shape, or null.
 */
export async function callJudgeForJson<T = unknown>(
  prompt: string,
  options: JudgeOptions = {}
): Promise<{ data: T | null; result: JudgeResult }> {
  const result = await callJudge(prompt, options)
  if (!result.ok || !result.parsed) {
    return { data: null, result }
  }
  return { data: result.parsed as T, result }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function backoffMs(attempt: number): number {
  // 500ms, 1s, 2s
  return 500 * Math.pow(2, attempt)
}

function failure(error: string, startTime: number, attempts: number): JudgeResult {
  return {
    ok: false,
    content: '',
    parsed: null,
    tokens: 0,
    latency_ms: Date.now() - startTime,
    error,
    attempts,
  }
}

/**
 * Extract JSON from LLM response. Handles:
 * - Raw JSON
 * - JSON inside ```json ... ``` blocks
 * - JSON after preamble text
 */
function safeParseJson(text: string): unknown | null {
  if (!text) return null

  // Try raw first
  const raw = text.trim()
  const direct = tryJson(raw)
  if (direct !== undefined) return direct

  // Try code-fenced block
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) {
    const fenced = tryJson(fence[1].trim())
    if (fenced !== undefined) return fenced
  }

  // Try first {...} or [...] substring
  const objMatch = raw.match(/\{[\s\S]*\}/)
  if (objMatch) {
    const obj = tryJson(objMatch[0])
    if (obj !== undefined) return obj
  }
  const arrMatch = raw.match(/\[[\s\S]*\]/)
  if (arrMatch) {
    const arr = tryJson(arrMatch[0])
    if (arr !== undefined) return arr
  }

  return null
}

function tryJson(s: string): unknown | undefined {
  try {
    return JSON.parse(s)
  } catch {
    return undefined
  }
}

export const JUDGE_CONFIG = {
  model: JUDGE_MODEL,
  temperature: JUDGE_TEMPERATURE,
  maxCallsPerRun: JUDGE_MAX_CALLS_DEFAULT,
  maxTokens: JUDGE_MAX_TOKENS,
}
