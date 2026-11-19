// Key revocation in the published trust anchor. A withdrawn key must stop
// authenticating anything, and revocation may only ever remove trust.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadSealTrustRoots,
  pinnedAnchorKeys,
  pinnedPostQuantumKeys,
  resetTrustRootCache,
  revokedPublicKeys,
} from "@/lib/psi-trust-roots";

const anchor = JSON.parse(readFileSync("public/.well-known/apex-psi-trust-anchor.json", "utf8"));
const LEDGER = "59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724";
const NEXT = "111284cd6462a1eeeae71f58d68745e75a7c3de7a69b7328d5953af1fe840e46";
const HYBRID = "9a6bdab92234f3bd6a3b1e9081e5ce3d646c129f1f6abdf7b52338e4cca1c9ca";

const withRevoked = (...keys: string[]) => ({
  ...anchor,
  revocations: keys.map((public_key) => ({ public_key, revoked_at: "2026-11-20T00:00:00Z", reason: "test" })),
});

afterEach(() => {
  resetTrustRootCache();
  vi.unstubAllGlobals();
});

describe("trust anchor revocation", () => {
  it("publishes an append-only revocation list, empty today", () => {
    expect(anchor.revocations).toEqual([]);
    expect(anchor.revocation_policy.append_only).toBe(true);
  });

  it("stops trusting a pinned key once it is listed as revoked", () => {
    const kept = pinnedAnchorKeys(withRevoked(LEDGER)).map((k) => k.public_key);
    expect(kept).not.toContain(LEDGER);
    expect(kept).toContain(NEXT);
  });

  it("treats keys[] status \"revoked\" the same as a revocation entry", () => {
    const doc = { ...anchor, keys: anchor.keys.map((k: { public_key: string }) => (k.public_key === NEXT ? { ...k, status: "revoked" } : k)) };
    expect(pinnedAnchorKeys(doc).map((k) => k.public_key)).not.toContain(NEXT);
  });

  it("cannot add trust: a revocation entry for an unknown key changes nothing", () => {
    const before = pinnedAnchorKeys(anchor).map((k) => k.public_key);
    const after = pinnedAnchorKeys(withRevoked("ff".repeat(32))).map((k) => k.public_key);
    expect(after).toEqual(before);
  });

  it("withdraws the post-quantum key when it is revoked", () => {
    expect(pinnedPostQuantumKeys(withRevoked(anchor.mldsa65_public_key))).toEqual([]);
  });

  it("trusts nothing, rather than falling back to built-ins, when every pinned key is revoked", async () => {
    const doc = withRevoked(LEDGER, NEXT, HYBRID, anchor.mldsa65_public_key);
    expect(revokedPublicKeys(doc).size).toBe(4);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(doc), { status: 200 })));
    const loaded = await loadSealTrustRoots(true);
    expect(loaded.roots).toEqual([]);
    expect(loaded.pqKeys).toEqual([]);
    expect(loaded.revokedKeys.length).toBe(4);
    expect(loaded.keyStatusCheckedAt).not.toBeNull();
  });

  it("says revocation was not checked when only the built-in copy is available", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const loaded = await loadSealTrustRoots(true);
    expect(loaded.keyStatusCheckedAt).toBeNull();
    expect(loaded.source).toContain("revocation status not checked");
  });
});
