// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — AUTHORIZATION RECEIPT SCHEMA  (PSI-ACT/1)   "the Gate"
//
// notarize/PSI-SEAL proves an OUTPUT after it happened (a dashcam).
// This proves a PROPOSED ACTION before it happens (a permission slip):
// "agent X, at time T, under policy P, intended action Z" — sealed,
// Ed25519 + LMS-W4-SHA256 signed, Merkle-rooted, Bitcoin-anchorable.
//
// A counterparty calls verify-action BEFORE honouring the action. If the
// recomputation fails, or the receipt is revoked/expired/off-policy, the
// counterparty refuses. That refusal is the Gate. Apex never executes,
// never judges, never guarantees — it only makes a prior authorization
// cheap and permanent to check. (Gravity, not force.)
//
// LICENCE (mirrors PSI-SEAL/1): the recompute/verify side is MIT, free
// forever. Outputs are AS-IS mathematical statements about a record's
// integrity and existence — NEVER a warranty, certification, opinion,
// compliance statement, or statement that the action itself was correct,
// safe, or lawful. (Empire §4 / EMPIRE_STATE line 412: no warranty/guarantee.)
// ═══════════════════════════════════════════════════════════════════════

export const PSI_ACT_SCHEMA_ID = "PSI-ACT/1.0.0";

// Domain separation (PSI-MANCHOR/v1). The Gate is new and no historical
// evidence depends on its digests yet, so the domain-prefixed binding is the
// frozen form from day one: a Mandate leaf can never be mistaken for a Seal
// leaf. Mirrors PSI-SEAL/1's own "PSI1:" prefix discipline.
export const PSI_MANCHOR_DOMAIN = "PSI-MANCHOR/v1:";
export const PSI_MERKLE_DOMAIN = "PSI-MERKLE/v1:";

export const ACT_TERMS =
  "APEX PSI Authorization Receipt (PSI-ACT/1). This is a tamper-evident record " +
  "that an agent, at a stated time, proposed a stated action under a stated " +
  "policy. It proves the EXISTENCE and INTEGRITY of that authorization record " +
  "and nothing else. It is NOT a warranty, guarantee, indemnity, opinion, or " +
  "certificate of compliance, and it does NOT assert the action was correct, " +
  "safe, lawful, or executed. Provided AS-IS as a recomputable mathematical " +
  "statement per PSI-ACT/1.";

/** Actions an AI agent may seek to seal before performing. Extend deliberately. */
export const ACTION_TYPES = [
  "send-email",
  "execute-payment",
  "write-record",
  "publish-output",
  "sign-document",
  "invoke-tool",
  "spawn-agent",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export function isKnownAction(t: unknown): t is ActionType {
  return typeof t === "string" && (ACTION_TYPES as readonly string[]).includes(t);
}

/** A receipt as persisted / returned. Intents are opaque to Apex. */
export interface AuthorizationReceipt {
  receipt_id: string;
  agent_id: string;
  action_type: ActionType;
  intent: Record<string, unknown>;
  policy_ref: string;
  predicate_id: string;
  issued_at: string;
  expires_at: string | null;
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function randomReceiptId(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `APEX-ACT-${hex.toUpperCase()}`;
}

/**
 * Deterministic serialization of the authorized action. Field order is fixed
 * and keys are sorted inside `intent` so the counterparty can recompute the
 * identical string byte-for-byte. This string is what gets sealed.
 */
export function canonicalActionPayload(r: {
  agent_id: string;
  action_type: string;
  intent: Record<string, unknown>;
  policy_ref: string;
  predicate_id: string;
  issued_at: string;
  expires_at: string | null;
}): string {
  return JSON.stringify({
    agent_id: r.agent_id,
    action_type: r.action_type,
    intent: stableStringify(r.intent),
    policy_ref: r.policy_ref,
    predicate_id: r.predicate_id,
    issued_at: r.issued_at,
    expires_at: r.expires_at,
  });
}

/** Recursive key-sorted JSON so object key order never changes the digest. */
export function stableStringify(v: unknown): unknown {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(stableStringify);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v as Record<string, unknown>).sort()) {
    out[k] = stableStringify((v as Record<string, unknown>)[k]);
  }
  return JSON.parse(JSON.stringify(out));
}

/**
 * Recompute the seal chain from the stored canonical payload + receipt_id.
 * Used by BOTH the issuer and the gate so they agree on what was signed.
 * commit = SHA-256(canonical_payload); leaf = SHA-256(receipt_id || '|' || commit).
 * The Ed25519 + LMS signatures are taken over `leaf`.
 */
export async function recomputeLeaf(
  canonicalPayload: string,
  receiptId: string,
): Promise<{ commitHash: string; merkleLeaf: string }> {
  const commitHash = await sha256Hex(`${PSI_MANCHOR_DOMAIN}${canonicalPayload}`);
  const merkleLeaf = await sha256Hex(`${PSI_MERKLE_DOMAIN}${receiptId}|${commitHash}`);
  return { commitHash, merkleLeaf };
}

/** Counterparty-facing helper (MIT): decide from a verify-action response. */
export function gateDecision(v: {
  integrity_verified: boolean;
  post_quantum_verified: boolean | null;
  revoked: boolean;
  expired: boolean;
  policy_ok: boolean;
}): { allowed: boolean; reason: string } {
  if (!v.integrity_verified) return { allowed: false, reason: "integrity_recompute_failed" };
  if (v.revoked) return { allowed: false, reason: "receipt_revoked" };
  if (v.expired) return { allowed: false, reason: "receipt_expired" };
  if (!v.policy_ok) return { allowed: false, reason: "action_not_within_policy" };
  if (v.post_quantum_verified === false) return { allowed: false, reason: "post_quantum_failed" };
  return { allowed: true, reason: "ok" };
}
