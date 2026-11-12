// Share links for hosted receipts.
//
// Every hosted receipt carries a page a person can open and two commands anyone can
// paste to re-check it, so a receipt handed to an auditor or partner explains how to
// verify itself. These fields are convenience pointers beside the evidence: the
// signatures cover the Merkle leaf only, so adding or removing them never changes a
// verification result. No Deno-only API here, so the website's vitest suite covers it.

export const CANONICAL_SITE = "https://www.ai-governance-standard.com";

export type ReceiptLinks = {
  receipt_page_url: string;
  verify_command: string;
  proof_command: string;
  links_note: string;
};

function bare(hex: string): string {
  return hex.trim().replace(/^sha256:/i, "");
}

export function buildReceiptLinks(opts: {
  receiptId: string;
  merkleLeaf: string;
  apiBase: string;
  site?: string;
}): ReceiptLinks {
  const site = (opts.site || CANONICAL_SITE).replace(/\/$/, "");
  const api = opts.apiBase.replace(/\/$/, "");
  const leaf = bare(opts.merkleLeaf);
  const id = encodeURIComponent(opts.receiptId);
  return {
    receipt_page_url: `${site}/r/${leaf}`,
    verify_command: `curl -s "${api}/verify-hash?hash=${leaf}"`,
    proof_command: `curl -s "${api}/merkle-proof?receipt_id=${id}"`,
    links_note:
      "Links are pointers, not evidence: the signatures cover the Merkle leaf only. Verification is free and needs no account.",
  };
}

/**
 * The hosted notary key a caller sent. The documented header is `x-apex-api-key`;
 * `Authorization: Bearer apex_ntry_…` is also accepted because the published MCP
 * package (≤1.1.2) sends the key that way. Any other bearer value is a sign-in token.
 */
export function resolveNotaryKey(get: (name: string) => string | null): string | null {
  const direct = get("x-apex-api-key")?.trim();
  if (direct) return direct;
  const auth = get("authorization")?.trim() ?? "";
  const m = auth.match(/^Bearer\s+(apex_ntry_[A-Za-z0-9_-]+)$/);
  return m ? m[1] : null;
}

/** True when the Authorization header carries a notary key rather than a sign-in token. */
export function isNotaryKeyBearer(get: (name: string) => string | null): boolean {
  return /^Bearer\s+apex_ntry_/.test(get("authorization")?.trim() ?? "");
}
