// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — strict, offline verification of ledger proof bundles and
// ledger receipts (fail-closed, added 24 Oct 2026).
//
// Rules enforced here — each one closes a bypass found in the audit:
//  1. A missing or empty Ed25519 signature is a FAIL, never "pre-Ed25519 pass".
//  2. The signature is checked ONLY against pinned APEX ledger keys. A public
//     key carried inside the bundle is never trusted; if present it must equal
//     a pinned key or the bundle fails ("untrusted signing key").
//  3. The signed message is the Merkle leaf THIS code recomputed from
//     commitId|commitHash — never the leaf or root the bundle asserts.
//  4. The verdict is VALID only when every step passed.
// ═══════════════════════════════════════════════════════════════════════

import { hashSHA256, verifyMerkleProof } from "./engine-core";
import { verifyEd25519Signature, PSI_PUBLIC_KEY } from "./psi-signatures";

/** Keys that sign ledger receipts. The in-band hybrid key is deliberately excluded. */
export const PINNED_LEDGER_KEYS: readonly string[] = [PSI_PUBLIC_KEY];

const HEX64 = /^[0-9a-f]{64}$/;
const HEX128 = /^[0-9a-f]{128}$/;

export type StepStatus = "pass" | "fail";
export interface VerifyStep { label: string; status: StepStatus; value?: string }

export interface BundleVerdict {
  valid: boolean;
  steps: VerifyStep[];
  /** Recomputed leaf the signature was checked over (null if it could not be recomputed). */
  recomputedLeaf: string | null;
}

export interface VerifyOptions {
  /** Override pinned keys (tests only). */
  trustedKeys?: readonly string[];
}

const norm = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase().replace(/^sha256:/, "") : "");

/**
 * Check an Ed25519 ledger signature over a recomputed leaf against pinned keys.
 * `declaredKey` (optional) must itself be pinned, otherwise the check fails.
 */
export async function checkLedgerSignature(
  leaf: string,
  signature: unknown,
  declaredKey: unknown,
  trustedKeys: readonly string[] = PINNED_LEDGER_KEYS,
): Promise<{ ok: boolean; detail: string }> {
  const sig = norm(signature);
  if (!sig) return { ok: false, detail: "Missing Ed25519 signature — unsigned bundles are rejected" };
  if (!HEX128.test(sig)) return { ok: false, detail: "Malformed signature — not a 64-byte Ed25519 signature" };
  const pins = trustedKeys.map((k) => k.toLowerCase());
  const declared = norm(declaredKey);
  if (declared && !pins.includes(declared)) {
    return { ok: false, detail: "Untrusted signing key — not a pinned APEX ledger key" };
  }
  const candidates = declared ? [declared] : pins;
  for (const key of candidates) {
    if (await verifyEd25519Signature(leaf, sig, key)) {
      return { ok: true, detail: `Ed25519 signature verified under pinned key ${key.slice(0, 12)}…` };
    }
  }
  return { ok: false, detail: "Signature does not verify over the recomputed leaf under any pinned key" };
}

/** Verify a pasted / dropped proof bundle. Accepts raw JSON text or a parsed object. */
export async function verifyProofBundle(input: unknown, options: VerifyOptions = {}): Promise<BundleVerdict> {
  const trustedKeys = options.trustedKeys ?? PINNED_LEDGER_KEYS;
  const steps: VerifyStep[] = [];
  const fail = (label: string, value: string) => steps.push({ label, status: "fail", value });
  const pass = (label: string, value: string) => steps.push({ label, status: "pass", value });

  let bundle: Record<string, any>;
  try {
    bundle = typeof input === "string" ? JSON.parse(input) : (input as Record<string, any>);
    if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) throw new Error("not an object");
    pass("Parse JSON Bundle", `Protocol: ${bundle.protocol ?? "?"} v${bundle.version ?? "?"}`);
  } catch {
    fail("Parse JSON Bundle", "Invalid JSON — not a proof bundle object");
    return { valid: false, steps, recomputedLeaf: null };
  }

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const action = str(bundle.action);
  const predicateId = str(bundle.predicateId);
  const timestamp = str(bundle.timestamp);
  const commitId = str(bundle.commitId);
  const commitHash = norm(bundle.commitHash);

  // Step 2 — required fields present
  const missing = ["action", "predicateId", "timestamp", "commitId", "commitHash", "merkleRoot"].filter((k) => !str(bundle[k]));
  if (missing.length) fail("Required Fields", `Missing: ${missing.join(", ")}`);
  else pass("Required Fields", "All evidence fields present");

  // Step 3 — recompute commit hash from the event itself
  const recomputedCommit = await hashSHA256(`${action}|${predicateId}|${timestamp}`);
  if (HEX64.test(commitHash) && recomputedCommit === commitHash) {
    pass("Recompute SHA-256 Commit Hash", `${recomputedCommit.slice(0, 24)}… ✓ MATCH`);
  } else {
    fail("Recompute SHA-256 Commit Hash", `Event does not hash to the declared commitHash (got ${recomputedCommit.slice(0, 16)}…)`);
  }

  // Step 4 — recompute the Merkle leaf; never trust the declared one
  const recomputedLeaf = commitId && HEX64.test(commitHash) ? await hashSHA256(`${commitId}|${commitHash}`) : null;
  const declaredLeaf = norm(bundle.merkleLeafHash);
  if (recomputedLeaf && (!declaredLeaf || declaredLeaf === recomputedLeaf)) {
    pass("Recompute Merkle Leaf Hash", `${recomputedLeaf.slice(0, 24)}… ✓ MATCH`);
  } else {
    fail("Recompute Merkle Leaf Hash", recomputedLeaf ? "Declared leaf does not match the recomputed leaf" : "Leaf cannot be recomputed");
  }

  // Step 5 — inclusion proof from the RECOMPUTED leaf to the declared root
  const root = norm(bundle.merkleRoot);
  if (recomputedLeaf && root && Array.isArray(bundle.merkleProof)) {
    const proofOk = bundle.merkleProof.every((s: any) => s && HEX64.test(norm(s.hash)) && (s.position === "left" || s.position === "right"));
    const ok = proofOk && (await verifyMerkleProof(recomputedLeaf, bundle.merkleProof.map((s: any) => ({ hash: norm(s.hash), position: s.position })), root));
    if (ok) pass("Verify Merkle Inclusion", `Root: ${root.slice(0, 24)}… ✓ VERIFIED`);
    else fail("Verify Merkle Inclusion", "Recomputed leaf does not reach the declared Merkle root");
  } else {
    fail("Verify Merkle Inclusion", "No usable Merkle proof and root in bundle");
  }

  // Step 6 — Ed25519 signature: required, pinned key only, over the recomputed leaf
  if (!recomputedLeaf) {
    fail("Verify Ed25519 Signature", "No recomputed leaf to check the signature against");
  } else {
    const sig = await checkLedgerSignature(recomputedLeaf, bundle.ed25519Signature, bundle.ed25519PublicKey, trustedKeys);
    steps.push({ label: "Verify Ed25519 Signature", status: sig.ok ? "pass" : "fail", value: sig.detail });
  }

  return { valid: steps.every((s) => s.status === "pass"), steps, recomputedLeaf };
}

export interface LedgerRowLike {
  commit_id?: string | null;
  commit_hash?: string | null;
  merkle_leaf_hash?: string | null;
  ed25519_signature?: string | null;
}

export interface ReceiptVerdict {
  verified: boolean;
  leafMatches: boolean;
  signatureValid: boolean;
  detail: string;
}

/**
 * Verify a ledger row fetched from the public ledger, in the browser.
 * Finding a row proves nothing by itself — the leaf is recomputed and the
 * signature checked against the pinned key before anything is called verified.
 */
export async function verifyLedgerReceipt(row: LedgerRowLike, options: VerifyOptions = {}): Promise<ReceiptVerdict> {
  const commitHash = norm(row.commit_hash);
  if (!row.commit_id || !HEX64.test(commitHash)) {
    return { verified: false, leafMatches: false, signatureValid: false, detail: "Ledger entry is missing its commit hash" };
  }
  const leaf = await hashSHA256(`${row.commit_id}|${commitHash}`);
  const leafMatches = norm(row.merkle_leaf_hash) === leaf;
  const sig = await checkLedgerSignature(leaf, row.ed25519_signature, null, options.trustedKeys ?? PINNED_LEDGER_KEYS);
  const verified = leafMatches && sig.ok;
  const detail = !leafMatches
    ? "Stored leaf does not match the leaf recomputed from the receipt"
    : sig.detail;
  return { verified, leafMatches, signatureValid: sig.ok, detail };
}
