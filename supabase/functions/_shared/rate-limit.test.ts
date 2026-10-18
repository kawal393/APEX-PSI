// Behaviour tests for the free-lookup flood guard.
//
// These run in the website's own vitest, which is why ../_shared/rate-limit.ts
// contains no Deno-only API. A throttle that is never tested is a throttle that
// silently allows everything -- the exact failure mode this repository has been
// catching elsewhere (a guard that printed OK while skipping its own comparison).

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  callerLabel,
  clientAddress,
  createThrottle,
  throttleHeaders,
} from "./rate-limit.ts";

function clockAt(start = 0) {
  let now = start;
  return {
    now: () => now,
    advance: (ms: number) => { now += ms; },
  };
}

describe("createThrottle", () => {
  it("lets a full burst through and blocks the request after it", () => {
    const clock = clockAt(1_000);
    const guard = createThrottle({ capacity: 3, refillPerMinute: 3, now: clock.now });

    for (let i = 0; i < 3; i += 1) {
      expect(guard.check("a").allowed).toBe(true);
    }
    const fourth = guard.check("a");
    expect(fourth.allowed).toBe(false);
    if (!fourth.allowed) expect(fourth.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("refills at the stated rate: one token per 60s/refillPerMinute", () => {
    const clock = clockAt(0);
    // 20/min => one token every 3 seconds.
    const guard = createThrottle({ capacity: 1, refillPerMinute: 20, now: clock.now });

    expect(guard.check("a").allowed).toBe(true);
    expect(guard.check("a").allowed).toBe(false);

    clock.advance(2_999);
    expect(guard.check("a").allowed).toBe(false);

    clock.advance(1);
    expect(guard.check("a").allowed).toBe(true);
  });

  it("never refills past capacity, so idling cannot bank an unlimited burst", () => {
    const clock = clockAt(0);
    const guard = createThrottle({ capacity: 5, refillPerMinute: 300, now: clock.now });

    clock.advance(10 * 60_000); // 50 tokens' worth of elapsed time
    let allowed = 0;
    for (let i = 0; i < 50; i += 1) {
      if (guard.check("a").allowed) allowed += 1;
    }
    expect(allowed).toBe(5);
  });

  it("tracks callers independently", () => {
    const clock = clockAt(0);
    const guard = createThrottle({ capacity: 1, refillPerMinute: 1, now: clock.now });

    expect(guard.check("a").allowed).toBe(true);
    expect(guard.check("b").allowed).toBe(true);
    expect(guard.check("a").allowed).toBe(false);
  });

  it("counts what it did, which is the whole point of logging the hit count", () => {
    const clock = clockAt(0);
    const guard = createThrottle({ capacity: 2, refillPerMinute: 2, now: clock.now });
    guard.check("a");
    guard.check("a");
    guard.check("a");

    const stats = guard.stats();
    expect(stats.checks).toBe(3);
    expect(stats.allowed).toBe(2);
    expect(stats.blocked).toBe(1);
    expect(stats.tracked).toBe(1);
  });

  it("drops idle buckets on sweep so memory cannot grow without bound", () => {
    const clock = clockAt(0);
    const guard = createThrottle({
      capacity: 2,
      refillPerMinute: 2,
      idleEvictMs: 60_000,
      now: clock.now,
    });
    for (let i = 0; i < 10; i += 1) guard.check(`caller-${i}`);
    expect(guard.stats().tracked).toBe(10);

    clock.advance(61_000);
    guard.sweep();
    expect(guard.stats().tracked).toBe(0);
  });

  it("refuses a nonsensical configuration instead of quietly allowing everything", () => {
    expect(() => createThrottle({ capacity: 0, refillPerMinute: 20 })).toThrow();
    expect(() => createThrottle({ capacity: 20, refillPerMinute: 0 })).toThrow();
  });
});

describe("clientAddress", () => {
  it("prefers cf-connecting-ip, which the proxy sets and the client cannot forge", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.9",
      "x-forwarded-for": "198.51.100.1, 10.0.0.1",
    });
    expect(clientAddress(headers)).toBe("203.0.113.9");
  });

  it("takes the original client from a forwarded chain", () => {
    const headers = new Headers({ "x-forwarded-for": "198.51.100.7, 10.0.0.1, 10.0.0.2" });
    expect(clientAddress(headers)).toBe("198.51.100.7");
  });

  it("returns null rather than guessing, so callers decide the fallback policy", () => {
    expect(clientAddress(new Headers())).toBeNull();
    // A blank first entry is NOT replaced by a later one: only the leftmost address is
    // the client's own claim, and trusting a forged prefix to fall through to an
    // attacker-chosen second entry would be a worse bug than the shared bucket.
    expect(clientAddress(new Headers({ "x-forwarded-for": "  , 10.0.0.1" }))).toBeNull();
  });
});

describe("throttleHeaders", () => {
  it("sends Retry-After and exposes it cross-origin, or a browser page cannot honour it", () => {
    const guard = createThrottle({ capacity: 1, refillPerMinute: 20 });
    guard.check("a");
    const decision = guard.check("a");
    if (decision.allowed) throw new Error("expected the second call to be blocked");

    const headers = throttleHeaders(decision, { "Access-Control-Allow-Origin": "*" });
    expect(headers["Retry-After"]).toBe(String(decision.retryAfterSeconds));
    expect(headers["X-RateLimit-Limit"]).toBe("1");
    expect(headers["X-RateLimit-Remaining"]).toBe("0");
    expect(headers["Access-Control-Expose-Headers"]).toContain("Retry-After");
    expect(headers["Access-Control-Allow-Origin"]).toBe("*");
  });
});

// Structural guard, in the same spirit as the CI check that refuses to deploy a stubbed
// MCP endpoint. The throttle's real behaviour is unit-tested above; this asserts that the
// free endpoint is actually wired to it, so a future edit cannot drop the guard and still
// print a green suite.
describe("verify-hash wiring", () => {
  // Under jsdom, import.meta.url is an http: URL, so file-relative resolution is not
  // available here. vitest runs from the repository root, which is the stable anchor.
  const source = readFileSync(`${process.cwd()}/supabase/functions/verify-hash/index.ts`, "utf8");

  it("imports the shared throttle", () => {
    expect(source).toMatch(/from "\.\.\/_shared\/rate-limit\.ts"/);
  });

  it("refuses the caller before touching the database", () => {
    const guardAt = source.indexOf("lookupGuard.check(");
    // Regex, not a literal: this repository is checked out with CRLF on Windows, and a
    // multi-line string literal here would pass on one machine and fail on another.
    const queryAt = source.search(/\.from\(/);
    expect(guardAt).toBeGreaterThan(-1);
    expect(queryAt).toBeGreaterThan(guardAt);
  });

  it("answers a blocked caller with 429 and a Retry-After", () => {
    expect(source).toMatch(/status: 429/);
    expect(source).toMatch(/throttleHeaders\(/);
  });

  it("counts what the guard sees, so abuse is measurable", () => {
    expect(source).toMatch(/lookupGuard\.stats\(\)/);
  });
});

describe("callerLabel", () => {
  it("is stable, short, hex, and does not contain the address", () => {
    const label = callerLabel("203.0.113.9");
    expect(label).toBe(callerLabel("203.0.113.9"));
    expect(label).toMatch(/^[0-9a-f]{8}$/);
    expect(label).not.toContain("203.0.113");
    expect(callerLabel("203.0.113.10")).not.toBe(label);
  });
});
