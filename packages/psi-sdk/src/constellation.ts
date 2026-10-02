// APEX-INTENT / APEX-SETTLE reference helpers (DRAFT v0, see specs/).
// Zero dependencies: WebCrypto SHA-256 + RFC 8785-style key ordering.
// These helpers record and check; they never hold funds or decide truth.

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export function canonicalize(v: Json): string {
  if (v === null || typeof v !== "object") {
    if (typeof v === "number" && !Number.isFinite(v)) throw new Error("non-finite number");
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return "[" + v.map(canonicalize).join(",") + "]";
  const keys = Object.keys(v).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize((v as Record<string, Json>)[k])).join(",") + "}";
}

export async function sha256Hex(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export interface Mandate {
  version: "APEX-INTENT/0";
  issuer: string;
  agent: string;
  allowed_actions: string[];
  max_amount?: number;
  expires_at: string; // ISO-8601
}

/** APEX-INTENT: fingerprint a mandate before any action. */
export async function createMandate(m: Omit<Mandate, "version">) {
  const mandate: Mandate = { version: "APEX-INTENT/0", ...m };
  const digest = await sha256Hex(canonicalize(mandate as unknown as Json));
  return { mandate, mandate_hash: `sha256:${digest}` };
}

export type IntentCheck = { allowed: true } | { allowed: false; reason: string };

/** Refuse by default: an action passes only if inside the mandate. */
export function checkIntent(m: Mandate, action: string, amount = 0, now = new Date()): IntentCheck {
  if (new Date(m.expires_at).getTime() <= now.getTime()) return { allowed: false, reason: "EXPIRED" };
  if (!m.allowed_actions.includes(action)) return { allowed: false, reason: "ACTION_NOT_IN_MANDATE" };
  if (m.max_amount !== undefined && amount > m.max_amount) return { allowed: false, reason: "AMOUNT_EXCEEDS_MANDATE" };
  return { allowed: true };
}

/** APEX-SETTLE: release only when a payload recomputes to the receipt digest. */
export async function checkSettlement(payload: Json, expectedDigest: string) {
  const got = `sha256:${await sha256Hex(canonicalize(payload))}`;
  const want = expectedDigest.startsWith("sha256:") ? expectedDigest : `sha256:${expectedDigest}`;
  return got === want
    ? { release: true as const, digest: got }
    : { release: false as const, reason: "DIGEST_MISMATCH", digest: got };
}
