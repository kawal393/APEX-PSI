import { PSI_MERKLE_DOMAIN, sha256Hex } from "../../supabase/functions/_shared/action";
import { checkLedgerSignature, PINNED_LEDGER_KEYS } from "./proof-bundle-verify";
import { loadSealTrustRoots } from "./psi-trust-roots";

export const CLAIM_FIELDS = ["action_type", "policy_ref", "role", "policy_hash", "delegated_by", "delegation_ref"] as const;
export type ReceiptClaims = Partial<Record<(typeof CLAIM_FIELDS)[number], string>>;
export interface ActionCheck {
  request: { receipt_id: string; claims: ReceiptClaims };
  response: Record<string, unknown>;
  checkedAt: string;
  httpStatus: number;
  recordCheckPassed: boolean;
  signatureVerified: boolean;
  keyStatusCheckedAt: string | null;
  reason: string;
}

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const digest = (v: unknown) => typeof v === "string" ? v.replace(/^sha256:/, "") : "";

/** This checks PSI-ACT receipts, not agent-03 envelopes or payment authority. */
export async function evaluateActionResponse(
  request: ActionCheck["request"], response: unknown, httpStatus: number,
  trust: { keys: readonly string[]; keyStatusCheckedAt: string | null },
): Promise<ActionCheck> {
  const row = object(response) ? response : {};
  let signatureVerified = false;
  const commit = digest(row.commit_hash);
  if (row.receipt_id === request.receipt_id && /^[0-9a-f]{64}$/.test(commit)) {
    const leaf = await sha256Hex(`${PSI_MERKLE_DOMAIN}${request.receipt_id}|${commit}`);
    if (leaf === digest(row.merkle_leaf)) {
      const keys = trust.keys.filter(k => PINNED_LEDGER_KEYS.includes(k));
      signatureVerified = (await checkLedgerSignature(leaf, row.ed25519_signature, null, keys)).ok;
    }
  }
  const httpOk = httpStatus >= 200 && httpStatus < 300;
  const recordCheckPassed = httpOk && row.allowed === true && row.integrity_verified === true
    && row.found === true && row.revoked === false && row.expired === false
    && row.policy_ok === true && row.pq_verified !== false
    && (Object.keys(request.claims).every(k => !["role", "policy_hash", "delegated_by", "delegation_ref"].includes(k)) || row.authority_ok === true)
    && signatureVerified && trust.keyStatusCheckedAt !== null;
  const reason = !httpOk ? "service_error"
    : !object(response) ? "invalid_response"
    : row.found === false ? "no_such_receipt"
    : !signatureVerified ? "signature_not_verified"
    : trust.keyStatusCheckedAt === null ? "key_status_unavailable"
    : recordCheckPassed ? "record_checks_passed"
    : typeof row.reason === "string" ? row.reason : "record_checks_not_passed";
  return { request, response: row, checkedAt: new Date().toISOString(), httpStatus,
    recordCheckPassed, signatureVerified, keyStatusCheckedAt: trust.keyStatusCheckedAt, reason };
}

export async function checkActionReceipt(receiptId: string, claims: ReceiptClaims): Promise<ActionCheck> {
  const cleaned = receiptId.trim();
  if (!/^APEX-ACT-[A-Z0-9-]{1,80}$/.test(cleaned)) throw new Error("invalid_receipt_id");
  const request = { receipt_id: cleaned, claims: Object.fromEntries(
    CLAIM_FIELDS.filter(k => claims[k]?.trim()).map(k => [k, claims[k]?.trim()]),
  ) as ReceiptClaims };
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) throw new Error("service_unavailable");
  const [res, trust] = await Promise.all([
    fetch(`${url}/functions/v1/verify-action`, { method: "POST", signal: AbortSignal.timeout(20_000),
      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify(request) }),
    loadSealTrustRoots(true),
  ]);
  const response: unknown = await res.json();
  return evaluateActionResponse(request, response, res.status, {
    keys: trust.keys.map(k => k.public_key), keyStatusCheckedAt: trust.keyStatusCheckedAt,
  });
}

/** Unsigned observation, deliberately distinct from the underlying signed receipt. */
export async function actionCheckReport(check: ActionCheck) {
  const report = { format: "APEX-PSI-ACTION-CHECK-REPORT/1", signed: false,
    scope: "PSI-ACT receipt check; not agent-03 gate enforcement, payment evidence, or legal certification",
    ...check };
  const json = JSON.stringify(report, null, 2);
  return { json, sha256: await sha256Hex(json) };
}