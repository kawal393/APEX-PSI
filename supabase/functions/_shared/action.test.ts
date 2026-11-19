// Authority binding on the pre-action Gate (PSI-ACT/1). Each rule below is one
// the counterparty relies on when it decides whether to honour an action.
import { describe, expect, it } from "vitest";
import {
  authorityFromCanonical,
  canonicalActionPayload,
  checkAuthorityClaims,
  gateDecision,
  parseAuthority,
  recomputeLeaf,
} from "./action";

const POLICY = "sha256:" + "ab".repeat(32);
const base = {
  agent_id: "agent-7",
  action_type: "execute-payment",
  intent: { amount: 120, to: "acct-9" },
  policy_ref: "TREASURY/4",
  predicate_id: "EU_ART_50",
  issued_at: "2026-11-19T08:00:00.000Z",
  expires_at: null,
};
const clean = { integrity_verified: true, post_quantum_verified: null, revoked: false, expired: false, policy_ok: true };

describe("authority binding", () => {
  it("leaves receipts without authority byte-identical to the original format", () => {
    expect(canonicalActionPayload(base)).toBe(
      '{"agent_id":"agent-7","action_type":"execute-payment","intent":{"amount":120,"to":"acct-9"},' +
        '"policy_ref":"TREASURY/4","predicate_id":"EU_ART_50","issued_at":"2026-11-19T08:00:00.000Z","expires_at":null}',
    );
  });

  it("puts role and policy hash under the signed leaf: changing the role changes the leaf", async () => {
    const a = canonicalActionPayload({ ...base, authority: { role: "treasurer_l2", policy_hash: POLICY } });
    const b = canonicalActionPayload({ ...base, authority: { role: "treasurer_l3", policy_hash: POLICY } });
    const la = await recomputeLeaf(a, "APEX-ACT-1");
    const lb = await recomputeLeaf(b, "APEX-ACT-1");
    expect(la.merkleLeaf).not.toBe(lb.merkleLeaf);
    expect(authorityFromCanonical(a)).toEqual({ role: "treasurer_l2", policy_hash: POLICY });
  });

  it("rejects a policy hash that is not sha256 of a document", () => {
    expect(parseAuthority({ role: "r", policy_hash: "v2" }).ok).toBe(false);
  });

  it("rejects unknown authority fields so nothing else rides inside the signature", () => {
    expect(parseAuthority({ role: "r", policy_hash: POLICY, email: "a@b.c" }).ok).toBe(false);
  });

  it("rejects a role longer than 128 characters", () => {
    expect(parseAuthority({ role: "x".repeat(129), policy_hash: POLICY }).ok).toBe(false);
  });

  it("normalises policy_hash to lowercase with the sha256: prefix", () => {
    const r = parseAuthority({ role: "r", policy_hash: "AB".repeat(32) });
    expect(r.ok && r.value?.policy_hash).toBe(POLICY);
  });
});

describe("counterparty authority checks", () => {
  const bound = { role: "treasurer_l2", policy_hash: POLICY, delegation_ref: "GRANT-44" };

  it("passes when the expected role and policy hash match", () => {
    expect(checkAuthorityClaims(bound, { role: "treasurer_l2", policy_hash: POLICY }).ok).toBe(true);
  });

  it("fails when the policy hash differs", () => {
    const r = checkAuthorityClaims(bound, { policy_hash: "sha256:" + "cd".repeat(32) });
    expect(r).toEqual({ ok: false, mismatches: ["policy_hash"] });
  });

  it("fails when the receipt binds no authority but the counterparty asked for one", () => {
    expect(checkAuthorityClaims(null, { role: "treasurer_l2" })).toEqual({ ok: false, mismatches: ["authority_not_bound"] });
  });

  it("denies the action with reason authority_mismatch", () => {
    expect(gateDecision({ ...clean, authority_ok: false })).toEqual({ allowed: false, reason: "authority_mismatch" });
  });

  it("still allows a clean receipt when nobody asked about authority", () => {
    expect(gateDecision(clean)).toEqual({ allowed: true, reason: "ok" });
  });
});
