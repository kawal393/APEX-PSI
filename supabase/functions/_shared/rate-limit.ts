// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — per-caller throttle for the free public endpoints
// ═══════════════════════════════════════════════════════════════════════
//
// Why this file exists and why it is separate from the edge functions:
//
// verify-hash is the one endpoint that answers without a key, without a plan and
// without any quota. It is also the most expensive read in the estate: every hit
// runs two database queries and, when a row carries a post-quantum signature, a
// real LMS-W4-SHA256 verification. Nothing in this repository stopped a stranger
// from calling it in a loop.
//
// The bucket is a classic token bucket: `capacity` tokens, refilled continuously
// at `refillPerMinute` tokens per minute, so a page that fires three lookups at
// once is served from burst allowance while a sustained loop is cut off at the
// refill rate.
//
// WHAT THIS IS NOT, stated plainly: Supabase runs each edge function in isolates,
// and this counter lives in one isolate's memory. It is a per-instance throttle,
// not a global one. A cold start resets it and a target with many concurrent
// instances multiplies the allowance by the instance count. That is the same
// guarantee `public-attestation` and `inspect-header` already give, and it is what
// the 429 documentation must say. The durable version is a Postgres reservation
// RPC like the one `notarize` uses for its daily sealing quota; adopting it here
// means a migration plus a `supabase db push`, which is an operator action, so the
// soft bucket ships now and the comment says which way is up.
//
// No Deno-only API appears in this file, deliberately: it is unit-tested by the
// website's own vitest run, which cannot load `Deno.env`.

/** Tolerance for the float accumulation in a token bucket. See createThrottle.check. */
const TOKEN_EPSILON = 1e-9;

export type ThrottleDecision =
  | { allowed: true; remaining: number; limit: number }
  | { allowed: false; remaining: 0; limit: number; retryAfterSeconds: number };

export interface ThrottleOptions {
  /** Burst allowance. A caller may exceed the steady rate by this many requests at once. */
  capacity: number;
  /** Sustained allowance, in requests per 60 seconds. */
  refillPerMinute: number;
  /** Idle buckets older than this are dropped so the Map cannot grow without bound. */
  idleEvictMs?: number;
  /** Injectable clock, in milliseconds; tests use it instead of sleeping. */
  now?: () => number;
}

export interface Throttle {
  /** Consume one token for `key`. Never throws; unknown keys start full. */
  check(key: string): ThrottleDecision;
  /** Running totals, so a caller can log how much traffic the guard is actually seeing. */
  stats(): { checks: number; allowed: number; blocked: number; tracked: number };
  /** Drop forgotten buckets. Called automatically as the table grows. */
  sweep(): void;
  readonly capacity: number;
  readonly refillPerMinute: number;
}

/**
 * A short, non-reversible log label for a caller. FNV-1a over the address is not
 * security -- it is there so the build log can count traffic per source without
 * writing an IP address, which is personal data, into the log.
 */
export function callerLabel(ip: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < ip.length; i += 1) {
    h ^= ip.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function createThrottle(options: ThrottleOptions): Throttle {
  const { capacity, refillPerMinute } = options;
  if (!(capacity > 0) || !(refillPerMinute > 0)) {
    throw new Error("capacity and refillPerMinute must both be positive");
  }
  const now = options.now ?? (() => Date.now());
  const idleEvictMs = options.idleEvictMs ?? 10 * 60_000;
  const tokensPerMs = refillPerMinute / 60_000;

  const buckets = new Map<string, { tokens: number; updatedAt: number }>();
  let checks = 0;
  let allowed = 0;
  let blocked = 0;

  function sweep(): void {
    const cutoff = now() - idleEvictMs;
    for (const [key, bucket] of buckets) {
      if (bucket.updatedAt < cutoff) buckets.delete(key);
    }
  }

  function check(key: string): ThrottleDecision {
    checks += 1;
    if (buckets.size > 4096) sweep();

    const at = now();
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { tokens: capacity, updatedAt: at };
      buckets.set(key, bucket);
    }

    // Refill against elapsed time, then clamp to capacity.
    bucket.tokens = Math.min(capacity, bucket.tokens + (at - bucket.updatedAt) * tokensPerMs);
    bucket.updatedAt = at;

    // The epsilon is not decoration: at exactly the stated rate the accumulated float
    // lands on 0.9999999999999999, and a caller who is behaving perfectly gets a 429.
    // A test caught that here rather than a user finding it later.
    if (bucket.tokens >= 1 - TOKEN_EPSILON) {
      bucket.tokens -= 1;
      allowed += 1;
      return { allowed: true, remaining: Math.floor(bucket.tokens + TOKEN_EPSILON), limit: capacity };
    }

    blocked += 1;
    // Whole seconds until one token exists again; never zero, or a client hammers the retry.
    const msUntilToken = (1 - bucket.tokens) / tokensPerMs;
    const retryAfterSeconds = Number.isFinite(msUntilToken)
      ? Math.max(1, Math.ceil(msUntilToken / 1000))
      : 60;
    return { allowed: false, remaining: 0, limit: capacity, retryAfterSeconds };
  }

  return {
    check,
    sweep,
    stats: () => ({ checks, allowed, blocked, tracked: buckets.size }),
    capacity,
    refillPerMinute,
  };
}

/**
 * The address the caller actually came from, as Supabase's proxy presents it.
 * `cf-connecting-ip` is authoritative when present; `x-forwarded-for` is a comma
 * list whose first entry is the original client. Returns null when neither exists,
 * which the callers treat as one shared bucket rather than as "no limit".
 */
export function clientAddress(headers: Headers): string | null {
  const direct = headers.get("cf-connecting-ip")?.trim();
  if (direct) return direct;
  const chain = headers.get("x-forwarded-for");
  if (chain) {
    const first = chain.split(",")[0]?.trim();
    if (first) return first;
  }
  return null;
}

/**
 * Headers a 429 must carry. `Retry-After` is the part browsers and clients act on;
 * it is invisible to a cross-origin page unless it is exposed, so it is listed here
 * every time.
 */
export function throttleHeaders(
  decision: ThrottleDecision & { allowed: false },
  corsHeaders: Record<string, string>,
  retryAfterSeconds?: number,
): Record<string, string> {
  const seconds = retryAfterSeconds ?? decision.retryAfterSeconds;
  return {
    ...corsHeaders,
    "Content-Type": "application/json",
    "Retry-After": String(seconds),
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": "0",
    "X-RateLimit-Interval-Seconds": "60",
    "Access-Control-Expose-Headers": "Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Interval-Seconds",
  };
}
