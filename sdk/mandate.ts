// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — Mandate SDK (TypeScript / Deno / browser / Node 18+)
// Pre-action gate client. fetch only; no dependencies.
//
//   import { authorize, verifyAction, allowed } from "./mandate.ts";
//   const r = await authorize(BASE, "agent-x", "send-email", { to: "a@b" });
//   const v = await verifyAction(BASE, { receipt_id: r.receipt_id });
//   if (allowed(v)) { /* act */ }   // else refuse by default
//
// No warranty / guarantee / certificate of compliance is offered or implied.
// verifyAction returns a recomputation result, not a verdict on truth.
// ═══════════════════════════════════════════════════════════════════════

// deno-lint-ignore-file no-explicit-any
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" };

async function post(url: string, body: unknown, apiKey?: string): Promise<any> {
  const headers: Record<string, string> = { ...JSON_HEADERS };
  if (apiKey) headers["x-apex-api-key"] = apiKey;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  return await res.json();
}

export interface AuthorizeResult {
  receipt_id: string;
  commit_hash: string;
  verify_url: string;
  [k: string]: unknown;
}

/** Issue an Authorization Receipt for a PROPOSED action (before it runs). */
export function authorize(
  baseUrl: string,
  agentId: string,
  actionType: string,
  intent: Record<string, unknown>,
  opts: { policy_ref?: string; predicate_id?: string; expires_in?: number; api_key?: string } = {},
): Promise<AuthorizeResult> {
  const body: Record<string, unknown> = {
    agent_id: agentId,
    action_type: actionType,
    intent,
  };
  if (opts.policy_ref) body.policy_ref = opts.policy_ref;
  if (opts.predicate_id) body.predicate_id = opts.predicate_id;
  if (opts.expires_in) body.expires_in = opts.expires_in;
  return post(`${baseUrl.replace(/\/$/, "")}/functions/v1/authorize`, body, opts.api_key);
}

/** Counterparty call: recompute + integrity/revocation/expiry/policy check. */
export function verifyAction(
  baseUrl: string,
  q: { receipt_id?: string; commit_hash?: string; action_type?: string; policy_ref?: string },
): Promise<any> {
  const body: Record<string, unknown> = {};
  if (q.receipt_id) body.receipt_id = q.receipt_id;
  if (q.commit_hash) body.commit_hash = q.commit_hash;
  const claims: Record<string, unknown> = {};
  if (q.action_type) claims.action_type = q.action_type;
  if (q.policy_ref) claims.policy_ref = q.policy_ref;
  if (Object.keys(claims).length) body.claims = claims;
  return post(`${baseUrl.replace(/\/$/, "")}/functions/v1/verify-action`, body);
}

/** Refuse-by-default helper: only an explicit allow passes. */
export function allowed(verification: any): boolean {
  return !!verification && verification.allowed === true;
}
