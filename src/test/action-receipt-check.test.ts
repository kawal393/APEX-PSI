import { webcrypto } from "node:crypto";
import * as ed from "@noble/ed25519";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { PSI_MERKLE_DOMAIN, sha256Hex } from "../../supabase/functions/_shared/action";

// An isolated test identity, not a deployed signer or a production pin update.
const identity = vi.hoisted(() => ({ key: "" }));
vi.mock("@/lib/proof-bundle-verify", async importOriginal => {
  const original = await importOriginal<typeof import("@/lib/proof-bundle-verify")>();
  return { ...original, get PINNED_LEDGER_KEYS() { return [identity.key]; } };
});
import { actionCheckReport, evaluateActionResponse } from "@/lib/action-receipt-check";

const hex = (bytes: Uint8Array) => Array.from(bytes, x => x.toString(16).padStart(2, "0")).join("");
const seed = new Uint8Array(32).fill(7);
const request = { receipt_id: "APEX-ACT-TEST1", claims: {} };
const checkedAt = "2026-11-25T03:33:00Z";
let signed: Record<string, unknown>;
beforeAll(async () => {
  vi.stubGlobal("crypto", webcrypto);
  identity.key = hex(await ed.getPublicKeyAsync(seed));
  const commit = "a".repeat(64);
  const leaf = await sha256Hex(`${PSI_MERKLE_DOMAIN}${request.receipt_id}|${commit}`);
  signed = { receipt_id: request.receipt_id, commit_hash: `sha256:${commit}`, merkle_leaf: `sha256:${leaf}`,
    ed25519_signature: hex(await ed.signAsync(new TextEncoder().encode(leaf), seed)),
    allowed: true, integrity_verified: true, found: true, revoked: false, expired: false, policy_ok: true, pq_verified: true };
});
const check = (row: unknown, status = 200, keyStatusCheckedAt: string | null = checkedAt) =>
  evaluateActionResponse(request, row, status, { keys: [identity.key], keyStatusCheckedAt });

describe("receiving-door record checks", () => {
  it("accepts an explicitly allowed record with a real signature and checked key status", async () => {
    const result = await check(signed);
    expect(result.recordCheckPassed).toBe(true);
    expect(result.signatureVerified).toBe(true);
  });
  it("refuses missing permission records", async () => {
    expect((await check({ allowed: false, found: false })).reason).toBe("no_such_receipt");
  });
  it("refuses an expired record even if the service says allowed", async () => {
    expect((await check({ ...signed, expired: true })).recordCheckPassed).toBe(false);
  });
  it("refuses a revoked receipt", async () => {
    expect((await check({ ...signed, revoked: true })).recordCheckPassed).toBe(false);
  });
  it("refuses a server denial", async () => {
    expect((await check({ ...signed, allowed: false })).recordCheckPassed).toBe(false);
  });
  it("never treats a string true as permission", async () => {
    expect((await check({ ...signed, allowed: "true" })).recordCheckPassed).toBe(false);
  });
  it("refuses failed policy checks", async () => {
    expect((await check({ ...signed, policy_ok: false })).recordCheckPassed).toBe(false);
  });
  it("refuses failed post-quantum checks", async () => {
    expect((await check({ ...signed, pq_verified: false })).recordCheckPassed).toBe(false);
  });
  it("refuses missing signatures", async () => {
    expect((await check({ ...signed, ed25519_signature: null })).signatureVerified).toBe(false);
  });
  it("refuses a forged signature", async () => {
    expect((await check({ ...signed, ed25519_signature: "00".repeat(64) })).recordCheckPassed).toBe(false);
  });
  it("refuses changed fingerprints", async () => {
    expect((await check({ ...signed, commit_hash: `sha256:${"b".repeat(64)}` })).signatureVerified).toBe(false);
  });
  it("refuses a receipt substituted for the requested one", async () => {
    expect((await check({ ...signed, receipt_id: "APEX-ACT-OTHER" })).recordCheckPassed).toBe(false);
  });
  it("does not re-trust a key excluded by revocation", async () => {
    const result = await evaluateActionResponse(request, signed, 200, { keys: [], keyStatusCheckedAt: checkedAt });
    expect(result.recordCheckPassed).toBe(false);
  });
  it("refuses a service error even when its body says allowed", async () => {
    expect((await check(signed, 503)).recordCheckPassed).toBe(false);
  });
  it("refuses when signing-key status cannot be read", async () => {
    expect((await check(signed, 200, null)).reason).toBe("key_status_unavailable");
  });
  it("refuses unestablished requested authority", async () => {
    const result = await evaluateActionResponse({ ...request, claims: { role: "buyer" } }, signed, 200,
      { keys: [identity.key], keyStatusCheckedAt: checkedAt });
    expect(result.recordCheckPassed).toBe(false);
  });
  it("exports an unsigned report separately from the signed receipt", async () => {
    const report = await actionCheckReport(await check(signed));
    expect(JSON.parse(report.json).signed).toBe(false);
    expect(report.sha256).toBe(await sha256Hex(report.json));
    expect(JSON.parse(report.json).response.ed25519_signature).toBe(signed.ed25519_signature);
  });
});