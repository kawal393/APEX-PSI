import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Rule: the published trust anchor must be readable by a browser on another
// origin, and it must exist in exactly one place.
//
// Measured 17 Nov 2026: the anchor came back with no Access-Control-Allow-Origin,
// so a verifier running in someone else's browser could not read it and failed
// closed for a reason that had nothing to do with the signature. The edge
// function below fixes the header. The second half of the rule is that the fix
// never becomes a second anchor: the function serves the published bytes and
// restates no key material of its own.
const ROOT = join(__dirname, "..", "..");
const CANONICAL = "https://ai-governance-standard.com/.well-known/apex-psi-trust-anchor.json";

const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("trust anchor cross-origin reachability", () => {
  const fn = read("supabase/functions/trust-anchor/index.ts");

  it("serves the anchor with an open CORS header", () => {
    expect(fn).toMatch(/"Access-Control-Allow-Origin"\s*:\s*"\*"/);
    expect(fn).toMatch(/"Access-Control-Allow-Methods"\s*:\s*"[^"]*GET[^"]*"/);
  });

  it("serves the published anchor rather than a copy of it", () => {
    expect(fn).toContain(CANONICAL);
    // 64 hex characters is the shape of both public keys.
    expect(fn).not.toMatch(/["'][0-9a-fA-F]{64,}["']/);
  });

  it("answers a preflight without a key", () => {
    expect(fn).toMatch(/req\.method === "OPTIONS"/);
  });

  it("publishes an anchor that carries both public halves", () => {
    const anchor = JSON.parse(read("public/.well-known/apex-psi-trust-anchor.json"));
    expect(typeof anchor.ed25519_public_key).toBe("string");
    expect(anchor.ed25519_public_key.length).toBeGreaterThanOrEqual(32);
    expect(typeof anchor.mldsa65_public_key).toBe("string");
    expect(anchor.mldsa65_public_key.length).toBeGreaterThanOrEqual(32);
    expect(anchor.trust_anchor_url).toBe(CANONICAL);
  });
});
