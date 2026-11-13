/**
 * apex-psi-verifier — MIT licensed. Free forever.
 *
 * Verifies that a PSI seal conforms, byte for byte, to the copyrighted
 * PSI-SEAL/1 canonical schema. Verification is open to everyone; producing
 * conformant seals requires the licensed APEX PSI Sealing Engine.
 *
 * Zero dependencies. Runs in browsers, Node 18+, Deno, Bun and workers.
 */

export const PSI_SCHEMA_ID = "PSI-SEAL/1.0.0";

export const PSI_SCHEMA_RULES = [
  "R1  Envelope serialisation: RFC 8785 JSON Canonicalization Scheme (JCS), UTF-8, no BOM.",
  "R2  Field set is closed. Unknown top-level fields render a seal non-conformant.",
  "R3  Field order in the emitted receipt: schema, schema_digest, sealed_at, subject, hash, merkle, signature, licence.",
  "R4  Digests: lowercase hexadecimal, exactly 64 characters, no 'sha256:' prefix inside the envelope.",
  "R5  Hash algorithm: SHA-256 over the raw octet stream of the subject; no transport encoding, no trailing padding.",
  "R6  sealed_at: RFC 3339 UTC with exactly three fractional digits and a literal 'Z' (e.g. 2026-08-17T09:00:00.000Z).",
  "R7  subject.size_bytes: non-negative integer, exact octet length. subject.name: NFC-normalised UTF-8 string.",
  "R8  Merkle assembly: binary tree over leaf digests in submission order; each parent = SHA-256(left_bytes || right_bytes) over 32-byte raw digests; an odd node is promoted, never duplicated.",
  "R9  merkle.leaf = SHA-256 of the ASCII string 'PSI1:' || hash. Domain separation is mandatory.",
  "R10 seal_hash = SHA-256(JCS(envelope minus the signature and licence members)).",
  "R11 Signature suite: Ed25519 over the ASCII seal_hash; optional hybrid post-quantum LMS-W4-SHA256 (NIST SP 800-208).",
  "R12 Every seal MUST carry schema and schema_digest. Only schema-conformant seals are considered PSI-compliant.",
] as const;

/**
 * The seal schema is FROZEN. Its digest is carried by every seal ever issued
 * and published at /.well-known/psi-schema.json; changing PSI_SCHEMA_RULES
 * would make every existing seal non-conformant. Verifier-side interpretation
 * rules live here instead.
 */
export const PSI_VERIFIER_RULES = [
  "R11.6 A signature NAMES the digest it authenticates (binds: seal_hash | merkle_leaf) and the verifier RECOMPUTES that digest from the record. A declared digest is compared, never trusted. A record that does not say which digest it means and offers more than one is refused, not guessed.",
  "R11.7 A seal may DECLARE a post-quantum signature (signature.pq_alg / signature.pq_value). A declared post-quantum signature must itself be verified: the verifier checks it when the caller supplies a checker for that algorithm, and reports the seal `unverifiable` — never `verified` — when no checker is available for it. A post-quantum signature nobody checked is not a verified one.",
  "R13.1 An inclusion proof is recomputed from the leaf, the leaf index, the tree size and the audit path, walking the RFC 9162 sec 2.1.3.2 split (the largest power of two smaller than the tree size). The leaf-index parity shortcut is valid only when the tree size is a power of two.",
  "R13.2 A consistency proof is recomputed from the two tree heads it claims to relate, walking the RFC 9162 sec 2.1.4.2 procedure. It is reported `consistent` only when the head of the older tree AND the head of the newer tree are both recomputed from the supplied path. Inclusion proves a leaf is in a tree; only consistency proves the tree never forgets.",
] as const;

export interface PsiSealEnvelope {
  schema: string;
  schema_digest: string;
  sealed_at: string;
  subject: { name: string; size_bytes: number; media_type?: string };
  hash: string;
  merkle: { leaf: string; root?: string; proof?: string[] };
  signature?: {
    alg: string;
    value: string;
    seal_hash: string;
    /** Which digest this signature authenticates. Added v1.4.0 (R11.6). */
    binds?: string;
    /** Which leaf derivation the bound digest uses. Added v1.4.0 (R11.6). */
    leaf_format?: string;
    pq_alg?: string;
    pq_value?: string;
  };
  licence?: { engine: string; tier: string; terms: string; accepted_at: string };
}

/**
 * Authenticity verdict for R11. `verified` is the ONLY status that may be
 * printed as a pass. `unverifiable` means the check could not be performed at
 * all (no trust root supplied, or this platform has no Ed25519 primitive) —
 * the verifier refuses instead of assuming. v1.2.0 and earlier had no field
 * here at all, which is how a forged seal came back as a pass.
 */
export type PsiSignatureStatus = "verified" | "invalid" | "absent" | "unverifiable";

/** A key the caller chooses to trust. The verifier never invents trust. */
export interface PsiTrustRoot {
  /** 32-byte Ed25519 public key: 64 lowercase/uppercase hex, or 44-char base64. */
  public_key: string;
  /** Optional label, echoed back in the verdict so a human can read which key passed. */
  key_id?: string;
}

/**
 * A post-quantum signature checker, supplied by the caller.
 *
 * The verifier package stays dependency-free, so it ships no post-quantum
 * algorithm. The caller that has one — a browser with ML-DSA-65 compiled in, a
 * service with LMS — hands it over here and the verifier uses it against the
 * seal's declared algorithm.
 */
export interface PsiPostQuantumChecker {
  /** The algorithm this checker implements, e.g. "ML-DSA-65". Matched case-insensitively. */
  alg: string;
  /** The public key the checker uses. Passed back to `verify`; empty when the checker holds its own. */
  public_key?: string;
  /**
   * Verify the post-quantum signature. Return true ONLY on a genuine
   * verification. A checker that throws is treated as a check that could not
   * run, not as a check that said no.
   */
  verify(message: Uint8Array, signature: string, publicKey: string): boolean | Promise<boolean>;
}

export interface ConformanceResult {
  conformant: boolean;
  schema_id: string | null;
  schema_digest_match: boolean;
  seal_hash_match: boolean;
  /** true = Ed25519 signature checked and valid; false = invalid or missing. */
  signature_valid: boolean;
  failures: string[];
  signature_status: PsiSignatureStatus;
  /** True only when `signature_status === "verified"`. Schema conformance is NOT authenticity. */
  authentic: boolean;
  trusted_key_id: string | null;
  /** R11.7 verdict for a declared post-quantum signature. "absent" when the seal declares none. */
  post_quantum_status: PsiSignatureStatus;
  /** Why the post-quantum half came out the way it did. */
  post_quantum_detail: string | null;
}

/**
 * Published APEX PSI Ed25519 verification key (raw 32 bytes, hex).
 * EXPORTED for callers that want to trust it explicitly. It is NOT a default:
 * since v1.3.0 a seal is authenticated only against keys the caller hands in,
 * so the verifier never silently grades its own maker's homework.
 */
export const PSI_PUBLIC_KEY_HEX = "59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724";

const hexBytes = (h: string): Uint8Array | null => {
  if (!/^([0-9a-f]{2})*$/i.test(h)) return null;
  const o = new Uint8Array(new ArrayBuffer(h.length / 2));
  for (let i = 0; i < o.length; i++) o[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return o;
};

/** Ed25519 verification (WebCrypto) of `message` (ASCII) under a raw hex public key. */
export async function verifyEd25519(message: string, signatureHex: string, publicKeyHex: string): Promise<boolean> {
  const sig = hexBytes(signatureHex ?? "");
  const pub = hexBytes(publicKeyHex ?? "");
  if (!sig || sig.length !== 64 || !pub || pub.length !== 32) return false;
  try {
    const key = await crypto.subtle.importKey("raw", pub as unknown as ArrayBuffer, { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify("Ed25519", key, sig as unknown as ArrayBuffer, new TextEncoder().encode(message));
  } catch {
    return false;
  }
}

export interface VerifySealOptions {
  /**
   * Public keys the caller trusts. Without at least one, a signature cannot be
   * authenticated and — under the default `requireValidSignature` — the seal is
   * reported `unverifiable`, never as a pass.
   */
  trustRoots?: readonly (PsiTrustRoot | string)[];
  /**
   * DEFAULT true (changed in v1.3.0). When false, the signature is still
   * computed and reported, but a missing or unverifiable signature does not
   * fail the schema verdict — the legacy report-only behaviour of v1.2.0.
   * An *invalid* signature fails either way: a check that ran and said "no"
   * is never demoted to a warning.
   */
  requireValidSignature?: boolean;
  /**
   * Post-quantum checkers, keyed by the algorithm a seal declares in
   * `signature.pq_alg`. A declared post-quantum signature with no checker for
   * it is reported `unverifiable` — the seal is never reported as verified on
   * the strength of a post-quantum claim nobody checked (R11.7).
   */
  postQuantum?: readonly PsiPostQuantumChecker[];
}

/**
 * Back-compat shim. v1.2.x callers (including the site's own tests) pass a bare
 * hex public key as the second argument: `verifySeal(seal, "5930…")`. From
 * v1.3.0 that string is read as a single trusted key, exactly the same shape as
 * `{ trustRoots: ["5930…"] }`. Nothing is trusted by default — omit the
 * argument and the verdict is `unverifiable`, never a pass.
 */
export type VerifySealArgument = VerifySealOptions | string | null;

function normalizeVerifyArgument(arg: VerifySealArgument): VerifySealOptions {
  if (typeof arg === "string") return { trustRoots: [arg] };
  return arg ?? {};
}

// ── RFC 8785 (JCS) minimal implementation ──
export function jcs(value: unknown): string {
  if (value === null || typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(jcs).join(",")}]`;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return `{${keys.map((k) => `${JSON.stringify(k)}:${jcs(obj[k])}`).join(",")}}`;
  }
  throw new Error("JCS: unsupported value");
}

async function sha256Hex(input: Uint8Array | string): Promise<string> {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const buf = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

let cachedDigest: string | null = null;
export async function psiSchemaDigest(): Promise<string> {
  if (cachedDigest) return cachedDigest;
  cachedDigest = await sha256Hex(jcs({ id: PSI_SCHEMA_ID, rules: PSI_SCHEMA_RULES }));
  return cachedDigest;
}

/**
 * Compute the schema digest from a published schema document (for example the
 * one served at /.well-known/psi-schema.json) using this verifier's own
 * canonicalisation. Anyone can run this against the npm or PyPI package output
 * and compare the 64-hex result: verified, not asserted.
 */
export async function psiSchemaDigestFromDocument(doc: unknown): Promise<string> {
  const d = doc as { schema?: unknown; rules?: unknown };
  if (typeof d?.schema !== "string" || !Array.isArray(d?.rules)) {
    throw new Error("PSI schema document must carry a string `schema` and an array of `rules`");
  }
  return sha256Hex(jcs({ id: d.schema, rules: d.rules }));
}

export function psiLeaf(hash: string): Promise<string> {
  return sha256Hex(`PSI1:${hash.replace(/^sha256:/i, "").toLowerCase()}`);
}

export async function psiSealHash(envelope: PsiSealEnvelope): Promise<string> {
  const { signature: _s, licence: _l, ...core } = envelope;
  return sha256Hex(jcs(core));
}

// ── R11 AUTHENTICITY (added v1.3.0) ─────────────────────────────────────
// A conformant envelope is not an authenticated one. The only statement that
// binds a seal to a key is an Ed25519 signature over the ASCII `seal_hash`,
// and the only thing that makes that check meaningful is a public key the
// CALLER chose to trust. This module never invents trust and never reports a
// pass it did not compute.

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.replace(/^sha256:/i, "").trim();
  const out = new Uint8Array(new ArrayBuffer(clean.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromBase64(input: string): Uint8Array<ArrayBuffer> | null {
  const t = input.replace(/-/g, "+").replace(/_/g, "/").trim();
  if (t.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(t)) return null;
  try {
    const bin = atob(t);
    const out = new Uint8Array(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** Accepts hex or standard / URL-safe base64, and requires the exact byte length. */
function decodeMaterial(input: string, byteLength: number): Uint8Array<ArrayBuffer> | null {
  const t = input.trim();
  if (t.length === byteLength * 2 && /^[0-9a-fA-F]+$/.test(t)) return hexToBytes(t);
  const b = fromBase64(t);
  return b && b.length === byteLength ? b : null;
}

/** Short readable label for a key: first 10 hex of SHA-256 over the raw key bytes. */
export async function psiKeyFingerprint(publicKey: string): Promise<string> {
  const raw = decodeMaterial(publicKey, 32);
  if (!raw) throw new Error("PSI R11: public key must be 32 bytes, as 64 hex characters or base64");
  return (await sha256Hex(raw)).slice(0, 10);
}

export interface PsiSignatureCheck {
  status: PsiSignatureStatus;
  /** The label or fingerprint of the key that verified, when status is `verified`. */
  key_id: string | null;
  detail: string;
  rule: string;
  /** R11.7 verdict for the post-quantum half, when the seal declared one. */
  post_quantum_status?: PsiSignatureStatus;
  /** Why the post-quantum half came out the way it did. */
  post_quantum_detail?: string | null;
}

export interface PsiPostQuantumCheck {
  status: PsiSignatureStatus;
  /** The label of the key that verified, when status is `verified`. */
  key_id: string | null;
  detail: string;
  rule: string;
}

/**
 * R11.7 — check the post-quantum half a seal DECLARES.
 *
 * A seal may carry `signature.pq_alg` and `signature.pq_value`: a claim that
 * it is also protected by a post-quantum signature. Measured 7 Nov 2026: the
 * published verifier (npm apex-psi-verifier 1.3.0, PyPI psi-verifier 1.3.0) and
 * the 1.4.0 source in this repository all read `pq_alg` and `pq_value` without
 * checking them, and reported a seal carrying 512 bytes of noise as
 * `conformant: true`, `signature_status: "verified"`, `authentic: true` with no
 * failures at all. A claim is not a signature.
 *
 * So the declared half is checked here, and the answer is never better than
 * the check that ran:
 *   - no declaration          → `absent`
 *   - declaration, no checker → `unverifiable` (nobody checked it)
 *   - declaration, check ran  → `verified` or `invalid`
 *
 * The verifier package ships no post-quantum algorithm, so the checker comes
 * from the caller. That keeps this package dependency-free and keeps the
 * refusal honest: a declared post-quantum signature that cannot be checked is
 * reported as unchecked, never as verified.
 */
export async function psiVerifyPostQuantum(
  sealHash: string,
  signature: PsiSealEnvelope["signature"],
  checkers: readonly PsiPostQuantumChecker[] = [],
): Promise<PsiPostQuantumCheck> {
  const alg = String(signature?.pq_alg ?? "").trim();
  const value = String(signature?.pq_value ?? "").trim();
  if (!alg && !value) {
    return {
      status: "absent",
      key_id: null,
      detail: "seal declares no post-quantum signature",
      rule: PSI_RULE_CITATIONS.post_quantum_absent,
    };
  }
  if (!alg) {
    return {
      status: "invalid",
      key_id: null,
      detail: "signature.pq_value is present but signature.pq_alg does not say which algorithm produced it",
      rule: PSI_RULE_CITATIONS.post_quantum_invalid,
    };
  }
  if (!value) {
    return {
      status: "invalid",
      key_id: null,
      detail: `signature.pq_value is empty — the seal declares a ${alg} signature but carries none`,
      rule: PSI_RULE_CITATIONS.post_quantum_empty,
    };
  }
  const checker = checkers.find((c) => String(c.alg ?? "").trim().toLowerCase() === alg.toLowerCase());
  if (!checker) {
    return {
      status: "unverifiable",
      key_id: null,
      detail: `seal declares a post-quantum signature (${alg}) that this verifier cannot check: a claimed post-quantum signature nobody verified is not a verified one`,
      rule: PSI_RULE_CITATIONS.post_quantum_unverifiable,
    };
  }
  let ok = false;
  try {
    ok = Boolean(await checker.verify(new TextEncoder().encode(sealHash), value, checker.public_key ?? ""));
  } catch (e) {
    return {
      status: "unverifiable",
      key_id: null,
      detail: `the ${alg} checker could not run: ${(e as Error)?.message ?? "unknown error"}`,
      rule: PSI_RULE_CITATIONS.post_quantum_unverifiable,
    };
  }
  if (!ok) {
    return {
      status: "invalid",
      key_id: null,
      detail: `the declared post-quantum signature (${alg}) does not verify`,
      rule: PSI_RULE_CITATIONS.post_quantum_invalid,
    };
  }
  return {
    status: "verified",
    key_id: checker.public_key ? `pq:${alg}` : `pq:${alg}`,
    detail: `${alg} signature verified over the ASCII seal_hash`,
    rule: "11.7",
  };
}

/**
 * Verify the R11 Ed25519 signature over the ASCII `seal_hash`, and — when the
 * seal declares a post-quantum signature — that half too.
 *
 * Returns `unverifiable` — never `verified` — when there is no trust root, the
 * platform has no Ed25519 primitive, or the seal declares a post-quantum
 * signature no checker was supplied for. `invalid` is reserved for a check that
 * actually ran and said no.
 */
export async function psiVerifySignature(
  sealHash: string,
  signature: PsiSealEnvelope["signature"],
  trustRoots: readonly (PsiTrustRoot | string)[] = [],
  postQuantum: readonly PsiPostQuantumChecker[] = [],
): Promise<PsiSignatureCheck> {
  // R11.7. The declared post-quantum half is examined on its own, apart from
  // the classical half. Measured 7 Nov 2026: a seal that DECLARES a
  // post-quantum signature but whose Ed25519 half does not verify came back
  // with `post_quantum_status: "absent"` — a verdict stating, wrongly, that
  // the seal declares no post-quantum signature at all. The declared half is
  // now reported whatever the classical half did.
  const pq = await psiVerifyPostQuantum(sealHash, signature, postQuantum);
  if (!signature) {
    return { status: "absent", key_id: null, detail: "seal carries no signature member", rule: PSI_RULE_CITATIONS.signature_absent, post_quantum_status: pq.status, post_quantum_detail: pq.detail };
  }
  const alg = String(signature.alg ?? "").toLowerCase();
  if (alg !== "ed25519") {
    return {
      status: "invalid",
      key_id: null,
      detail: `signature.alg is "${String(signature.alg ?? "")}"; R11 requires Ed25519, so nothing here can be checked`,
      rule: PSI_RULE_CITATIONS.signature_alg,
      post_quantum_status: pq.status,
      post_quantum_detail: pq.detail,
    };
  }
  const value = String(signature.value ?? "").trim();
  if (!value) {
    return { status: "invalid", key_id: null, detail: "signature.value is empty — no key signed this seal", rule: PSI_RULE_CITATIONS.signature_empty, post_quantum_status: pq.status, post_quantum_detail: pq.detail };
  }
  const sig = decodeMaterial(value, 64);
  if (!sig) {
    return {
      status: "invalid",
      key_id: null,
      detail: "signature.value is neither 128 hex characters nor 64 base64 bytes, so it is not an Ed25519 signature",
      rule: PSI_RULE_CITATIONS.signature_invalid,
      post_quantum_status: pq.status,
      post_quantum_detail: pq.detail,
    };
  }

  const roots = trustRoots.map((r) => (typeof r === "string" ? { public_key: r } : r));
  if (roots.length === 0) {
    return {
      status: "unverifiable",
      key_id: null,
      detail: "no trust root supplied: a signature nobody's public key was checked against proves nothing",
      rule: PSI_RULE_CITATIONS.signature_unverifiable,
      post_quantum_status: pq.status,
      post_quantum_detail: pq.detail,
    };
  }

  const message = new TextEncoder().encode(sealHash);
  let anyKeyUsable = false;
  for (const root of roots) {
    const raw = decodeMaterial(root.public_key ?? "", 32);
    if (!raw) continue;
    anyKeyUsable = true;
    let key: CryptoKey;
    try {
      key = await crypto.subtle.importKey("raw", raw as unknown as ArrayBuffer, { name: "ED25519" } as AlgorithmIdentifier, false, ["verify"]);
    } catch {
      anyKeyUsable = false;
      continue;
    }
    let ok = false;
    try {
      ok = await crypto.subtle.verify("ED25519", key, sig as unknown as ArrayBuffer, message as unknown as ArrayBuffer);
    } catch {
      anyKeyUsable = false;
      continue;
    }
    if (ok) {
      const keyId = root.key_id ?? `ed25519:${bytesToHex(raw).slice(0, 10)}`;
      // R11.7. The Ed25519 half passed. The seal may still declare a
      // post-quantum signature, and that claim has to have been checked too
      // before the seal can be called verified.
      if (pq.status === "invalid") {
        return {
          status: "invalid",
          key_id: keyId,
          detail: pq.detail,
          rule: pq.rule,
          post_quantum_status: pq.status,
          post_quantum_detail: pq.detail,
        };
      }
      if (pq.status === "unverifiable") {
        return {
          status: "unverifiable",
          key_id: keyId,
          detail: `Ed25519 signature verified over the ASCII seal_hash against ${keyId}; ${pq.detail}`,
          rule: pq.rule,
          post_quantum_status: pq.status,
          post_quantum_detail: pq.detail,
        };
      }
      return {
        status: "verified",
        key_id: keyId,
        detail: pq.status === "verified"
          ? `Ed25519 signature verified over the ASCII seal_hash against ${keyId}; ${pq.detail}`
          : "Ed25519 signature verified over the ASCII seal_hash",
        rule: "11",
        post_quantum_status: pq.status,
        post_quantum_detail: pq.detail,
      };
    }
  }
  if (!anyKeyUsable) {
    return {
      status: "unverifiable",
      key_id: null,
      detail: "this platform exposes no Ed25519 verifier, so the signature was refused rather than assumed",
      rule: PSI_RULE_CITATIONS.signature_unverifiable,
      post_quantum_status: pq.status,
      post_quantum_detail: pq.detail,
    };
  }
  return {
    status: "invalid",
    key_id: null,
    detail: `Ed25519 signature does not verify against any of the ${roots.length} supplied trust root(s)`,
    rule: PSI_RULE_CITATIONS.signature_invalid,
    post_quantum_status: pq.status,
    post_quantum_detail: pq.detail,
  };
}


// ── R11.6 NAMED BINDING (added v1.4.0) ────────────────────────────────────
//
// WHY THIS EXISTS. A signature says nothing until it says WHAT it signed.
// Measured 2026-11-04 against three real receipts pulled from the public
// audit-mirror stream:
//
//   signature opens over merkle_leaf_hash            : 3/3
//   signature opens over the R10 seal_hash            : 0/3
//   stored leaf == sha256(commit_id | commit_hash)    : 3/3
//
// The live ledger signs the Merkle LEAF. A verifier that only knows "the
// ASCII seal_hash" rejects our own published receipts (0/3) — and a verifier
// that trusts a DECLARED seal_hash accepts a signature transplanted straight
// out of the public ledger, because the declared value is never recomputed.
//
// THE RULE. A signature names the digest it authenticates (`binds`), and the
// verifier RECOMPUTES that digest from the record. A declared digest is
// compared, never trusted. When a record does not say which digest it means
// and more than one is possible, the verifier refuses rather than guesses.

export const PSI_BINDINGS = ["seal_hash", "merkle_leaf"] as const;
export type PsiBinding = (typeof PSI_BINDINGS)[number];

/** Leaf derivations the verifier can recompute. `leaf-v1` is the ledger's. */
export const PSI_LEAF_FORMATS = ["leaf-v1"] as const;
export type PsiLeafFormat = (typeof PSI_LEAF_FORMATS)[number];

export interface PsiBindingResolution {
  /** The binding the signature authenticates, once resolved. */
  binding: PsiBinding | null;
  /** The RECOMPUTED digest. Never a value copied out of the record. */
  digest: string | null;
  /** Every binding this record could have meant. */
  candidates: PsiBinding[];
  error: { detail: string; rule: string } | null;
}

/** The envelope core R10 hashes: the envelope minus its signature and licence. */
function stripSignatureAndLicence(record: Record<string, unknown>): Record<string, unknown> {
  const { signature: _s, licence: _l, ...core } = record;
  return core;
}

/**
 * The signature of a record, whether it is an envelope member or the ledger's
 * flat `ed25519_signature` column. A ledger row carries no `signature`
 * object, so this is what lets one verifier read both.
 */
export function psiReadSignature(record: unknown): PsiSealEnvelope["signature"] | null {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const rec = record as Record<string, unknown>;
  const sig = rec.signature;
  if (sig && typeof sig === "object" && !Array.isArray(sig)) {
    const s = sig as Record<string, unknown>;
    return {
      alg: String(s.alg ?? ""),
      value: String(s.value ?? ""),
      seal_hash: String(s.seal_hash ?? ""),
      binds: s.binds === undefined ? undefined : String(s.binds),
      leaf_format: s.leaf_format === undefined ? undefined : String(s.leaf_format),
      pq_alg: s.pq_alg === undefined ? undefined : String(s.pq_alg),
      pq_value: s.pq_value === undefined ? undefined : String(s.pq_value),
    };
  }
  const flat = rec.ed25519_signature;
  if (typeof flat === "string" && flat.trim()) {
    return { alg: "ed25519", value: flat, seal_hash: "" };
  }
  return null;
}

/** The declared binding: `signature.binds`, or the ledger row's `signature_binds`. */
export function psiDeclaredBinding(record: unknown, signature?: PsiSealEnvelope["signature"] | null): string | null {
  const sig = signature ?? psiReadSignature(record);
  const fromSig = sig?.binds;
  if (typeof fromSig === "string" && fromSig.trim()) return fromSig.trim();
  if (record && typeof record === "object" && !Array.isArray(record)) {
    const fromRow = (record as Record<string, unknown>).signature_binds;
    if (typeof fromRow === "string" && fromRow.trim()) return fromRow.trim();
  }
  return null;
}

/**
 * Resolve what a record's signature authenticates, and recompute it.
 *
 * Resolution order:
 *   1. A declared binding wins. An unknown name is invalid (11.6).
 *   2. A declared binding the record cannot recompute is invalid (11.9).
 *   3. No declaration: exactly one recomputable candidate is used. Zero is
 *      unverifiable (11.8). Two or more is invalid (11.7) — the record must
 *      say which digest it means.
 * The digest returned is ALWAYS the recomputed one. A digest copied out of the
 * record is compared against it, never signed over in its place.
 */
export async function psiResolveBinding(
  record: unknown,
  declared?: string | null,
): Promise<PsiBindingResolution> {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return {
      binding: null,
      digest: null,
      candidates: [],
      error: { detail: "record is not a JSON object", rule: PSI_RULE_CITATIONS.not_object },
    };
  }
  const rec = record as Record<string, unknown>;
  const signature = psiReadSignature(rec);
  const declaration = declared ?? psiDeclaredBinding(rec, signature);

  const candidates: PsiBinding[] = [];
  const digests: Partial<Record<PsiBinding, string>> = {};

  // seal_hash — R10 over the envelope core. Only a PSI-SEAL/1 envelope has one.
  const merkle = rec.merkle as { leaf?: unknown } | undefined;
  if (rec.schema === PSI_SCHEMA_ID && merkle && typeof merkle === "object") {
    candidates.push("seal_hash");
    digests.seal_hash = await sha256Hex(jcs(stripSignatureAndLicence(rec)));
  }

  // merkle_leaf — leaf-v1 = SHA-256(commit_id | commit_hash). Only a ledger row has one.
  const commitId = typeof rec.commit_id === "string" ? rec.commit_id : null;
  const commitHash = typeof rec.commit_hash === "string" ? rec.commit_hash : null;
  if (commitId !== null && commitHash !== null) {
    candidates.push("merkle_leaf");
    digests.merkle_leaf = await sha256Hex(`${commitId}|${commitHash}`);
  }

  const leafMismatch = (): PsiBindingResolution => ({
    binding: null,
    digest: null,
    candidates,
    error: {
      detail: "merkle_leaf_hash does not equal the leaf recomputed from commit_id and commit_hash",
      rule: PSI_RULE_CITATIONS.leaf_mismatch_ledger,
    },
  });

  if (declaration !== null) {
    if (!(PSI_BINDINGS as readonly string[]).includes(declaration)) {
      return {
        binding: null,
        digest: null,
        candidates,
        error: {
          detail: `signature.binds is "${declaration}"; the only bindings are ${PSI_BINDINGS.join(", ")}`,
          rule: PSI_RULE_CITATIONS.binding_declared_unknown,
        },
      };
    }
    const binding = declaration as PsiBinding;
    const digest = digests[binding];
    if (!digest) {
      return {
        binding: null,
        digest: null,
        candidates,
        error: {
          detail: `signature.binds declares "${binding}" but this record cannot recompute it`,
          rule: PSI_RULE_CITATIONS.binding_not_recomputable,
        },
      };
    }
    if (binding === "merkle_leaf") {
      const stored = typeof rec.merkle_leaf_hash === "string" ? rec.merkle_leaf_hash.toLowerCase() : null;
      if (stored && stored !== digest) return leafMismatch();
    }
    return { binding, digest, candidates, error: null };
  }

  if (candidates.length === 0) {
    return {
      binding: null,
      digest: null,
      candidates,
      error: {
        detail: "this record carries no digest a signature could bind: neither a PSI-SEAL/1 envelope nor a ledger row",
        rule: PSI_RULE_CITATIONS.binding_unresolvable,
      },
    };
  }
  if (candidates.length > 1) {
    return {
      binding: null,
      digest: null,
      candidates,
      error: {
        detail: `ambiguous binding: this record can mean ${candidates.join(" or ")}; declare which one the signature covers`,
        rule: PSI_RULE_CITATIONS.binding_ambiguous,
      },
    };
  }
  const binding = candidates[0];
  const digest = digests[binding] as string;
  if (binding === "merkle_leaf") {
    const stored = typeof rec.merkle_leaf_hash === "string" ? rec.merkle_leaf_hash.toLowerCase() : null;
    if (stored && stored !== digest) return leafMismatch();
  }
  return { binding, digest, candidates, error: null };
}

export interface PsiBindingCheck extends PsiSignatureCheck {
  /** The binding that was resolved, or null when it could not be resolved. */
  binding: PsiBinding | null;
  /** The recomputed digest the signature was checked against. */
  digest: string | null;
}

/**
 * Verify the signature of ANY record — a PSI-SEAL/1 envelope or a ledger row
 * — against the digest the record actually names, recomputed from its own
 * content. Never returns `verified` without a trust root the caller supplied.
 */
export async function psiVerifyBinding(
  record: unknown,
  trustRoots: readonly (PsiTrustRoot | string)[] = [],
  postQuantum: readonly PsiPostQuantumChecker[] = [],
): Promise<PsiBindingCheck> {
  const signature = psiReadSignature(record);
  const resolution = await psiResolveBinding(record);
  if (resolution.error) {
    const status =
      resolution.error.rule === PSI_RULE_CITATIONS.binding_unresolvable ? "unverifiable" : "invalid";
    return {
      status,
      key_id: null,
      detail: resolution.error.detail,
      rule: resolution.error.rule,
      binding: null,
      digest: null,
    };
  }
  if (!signature) {
    return {
      status: "absent",
      key_id: null,
      detail: "record carries no signature member",
      rule: PSI_RULE_CITATIONS.signature_absent,
      binding: resolution.binding,
      digest: resolution.digest,
    };
  }
  const check = await psiVerifySignature(resolution.digest as string, signature, trustRoots, postQuantum);
  return {
    ...check,
    binding: resolution.binding,
    digest: resolution.digest,
    detail:
      check.status === "verified"
        ? `Ed25519 signature verified over the ASCII ${resolution.binding}${check.post_quantum_status === "verified" ? `; ${check.post_quantum_detail}` : ""}`
        : check.detail,
  };
}

// ── RFC 9162 INCLUSION PROOF (added v1.4.0) ───────────────────────────────
//
// WHAT THIS IS. The public merkle-proof endpoint serves a receipt's leaf,
// its index in the window tree, the tree size, the audit path and the tree
// head. A third party must be able to recompute the head from the path.
//
// WHY THE OBVIOUS SHORTCUT IS WRONG. Measured 2026-11-04 against our own
// published proofs: the common shortcut — take the parity of the leaf index
// to decide which side the running node sits on — reproduces the head for
// every tree whose size is a power of two (256, our live window) and FAILS
// for every other size. RFC 9162 sec 2.1.3.2 splits the tree at the largest
// power of two smaller than the tree size, so the sibling's side is decided
// by that split, not by the leaf index. The verifier walks the split.
//
// This is a verification, not an assertion: the head is recomputed here and
// compared with the one the caller supplied.

export interface PsiInclusionProof {
  /** The row's Merkle leaf, 64 hex characters. */
  leaf: string;
  /** 0-based position of the leaf in the tree. */
  leaf_index: number;
  /** Number of leaves in the tree the path was taken from. */
  tree_size: number;
  /** Siblings, bottom-up from the leaf. */
  audit_path: string[];
  /** The tree head the path must reproduce. */
  root: string;
}

export type PsiInclusionStatus = "included" | "mismatch" | "malformed";

export interface PsiInclusionResult {
  status: PsiInclusionStatus;
  /** True only when the head was recomputed and matched. */
  included: boolean;
  /** The head this verifier computed, or null when the proof was malformed. */
  recomputed_root: string | null;
  detail: string;
  rule: string;
}

async function prefixedHash(prefix: number, ...parts: Uint8Array[]): Promise<Uint8Array> {
  const len = 1 + parts.reduce((n, p) => n + p.length, 0);
  const buf = new Uint8Array(new ArrayBuffer(len));
  buf[0] = prefix;
  let o = 1;
  for (const p of parts) {
    buf.set(p, o);
    o += p.length;
  }
  return new Uint8Array(await crypto.subtle.digest("SHA-256", buf as unknown as ArrayBuffer));
}

function strictHexBytes(value: string): Uint8Array | null {
  return hexBytes(String(value ?? "").replace(/^sha256:/i, "").trim());
}

/**
 * Recompute the tree head from a leaf and its audit path, walking the
 * RFC 9162 sec 2.1.3.2 split: at each level k is the largest power of two
 * smaller than the remaining tree size, and the sibling sits on the right
 * when the leaf is in the left half, on the left when it is in the right.
 */
export async function psiInclusionRoot(
  leaf: string,
  leafIndex: number,
  treeSize: number,
  auditPath: readonly string[],
): Promise<string | null> {
  const leafBytes = strictHexBytes(leaf);
  if (!leafBytes) return null;
  if (!Number.isInteger(leafIndex) || !Number.isInteger(treeSize)) return null;
  if (treeSize < 1 || leafIndex < 0 || leafIndex >= treeSize) return null;

  let node = await prefixedHash(0x00, leafBytes);
  let m = leafIndex;
  let n = treeSize;
  for (const sibling of auditPath) {
    if (n <= 1) return null;
    const sib = strictHexBytes(sibling);
    if (!sib) return null;
    let k = 1;
    while (k * 2 < n) k *= 2;
    if (m < k) {
      node = await prefixedHash(0x01, node, sib);
      n = k;
    } else {
      node = await prefixedHash(0x01, sib, node);
      n -= k;
      m -= k;
    }
  }
  if (n !== 1) return null;
  return bytesToHex(node);
}

/**
 * Verify an inclusion proof against the head it claims to reproduce.
 *
 * `malformed` means the proof could not be checked at all — a bad hex leaf, a
 * leaf index outside the tree, or an audit path that does not reach the root.
 * `mismatch` means the check ran and said no. Only `included` is a pass.
 */
export async function psiVerifyInclusion(proof: PsiInclusionProof): Promise<PsiInclusionResult> {
  const leaf = String(proof?.leaf ?? "");
  const root = String(proof?.root ?? "").replace(/^sha256:/i, "").trim();
  const path = Array.isArray(proof?.audit_path) ? proof.audit_path : [];
  if (!strictHexBytes(leaf) || !strictHexBytes(root)) {
    return {
      status: "malformed",
      included: false,
      recomputed_root: null,
      detail: "leaf and root must both be 64 hex characters",
      rule: PSI_RULE_CITATIONS.inclusion_malformed,
    };
  }
  const leafIndex = proof?.leaf_index;
  const treeSize = proof?.tree_size;
  if (
    typeof leafIndex !== "number" ||
    !Number.isInteger(leafIndex) ||
    typeof treeSize !== "number" ||
    !Number.isInteger(treeSize)
  ) {
    return {
      status: "malformed",
      included: false,
      recomputed_root: null,
      detail: "leaf_index and tree_size must both be integers",
      rule: PSI_RULE_CITATIONS.inclusion_malformed,
    };
  }
  const recomputed = await psiInclusionRoot(leaf, leafIndex, treeSize, path);
  if (recomputed === null) {
    return {
      status: "malformed",
      included: false,
      recomputed_root: null,
      detail:
        "the audit path does not describe a tree of this size: the leaf index must be inside the tree and the path must reach the root",
      rule: PSI_RULE_CITATIONS.inclusion_malformed,
    };
  }
  if (recomputed !== root.toLowerCase()) {
    return {
      status: "mismatch",
      included: false,
      recomputed_root: recomputed,
      detail: `the head recomputed from the leaf and audit path is ${recomputed}, not the supplied ${root.toLowerCase()}`,
      rule: PSI_RULE_CITATIONS.inclusion_mismatch,
    };
  }
  return {
    status: "included",
    included: true,
    recomputed_root: recomputed,
    detail: `leaf ${leaf} is included: the head ${recomputed} was recomputed from the audit path over a tree of ${proof.tree_size} leaves`,
    rule: PSI_RULE_CITATIONS.inclusion_ok,
  };
}

// ── RFC 9162 CONSISTENCY PROOF (added v1.6.0) ──────────────────────────────
//
// Inclusion proves a leaf is in a tree. It does not prove the tree never
// forgets: an operator who holds the log can show one client a tree that
// includes a receipt, and another client a different tree at the same moment.
// Only a consistency proof between two heads rules that out — it proves the
// older tree is a prefix of the newer one.
//
// RFC 9162 sec 2.1.4.1 defines the proof; sec 2.1.4.2 defines how a verifier
// checks one. The verifier below follows sec 2.1.4.2 step for step and never
// reports `consistent` unless the head of BOTH trees is recomputed from the
// supplied path and matches the head that was supplied.

export interface PsiConsistencyProof {
  /** Number of leaves in the older tree. */
  first_size: number;
  /** Number of leaves in the newer tree. */
  second_size: number;
  /** The head of the older tree. */
  first_root: string;
  /** The head of the newer tree. */
  second_root: string;
  /** The RFC 9162 sec 2.1.4.1 consistency path between the two heads. */
  consistency_path: string[];
}

export type PsiConsistencyStatus = "consistent" | "mismatch" | "malformed";

export interface PsiConsistencyResult {
  status: PsiConsistencyStatus;
  /** True only when both heads were recomputed and matched. */
  consistent: boolean;
  recomputed_first_root: string | null;
  recomputed_second_root: string | null;
  detail: string;
  rule: string;
}

/** MTH of an ordered list of leaf hashes (RFC 9162 sec 2.1.3.1). */
async function rfc9162Head(leaves: readonly Uint8Array[]): Promise<Uint8Array> {
  if (leaves.length === 0) return new Uint8Array(0);
  if (leaves.length === 1) return prefixedHash(0x00, leaves[0]);
  let k = 1;
  while (k * 2 < leaves.length) k *= 2;
  const left = await rfc9162Head(leaves.slice(0, k));
  const right = await rfc9162Head(leaves.slice(k));
  return prefixedHash(0x01, left, right);
}

/** RFC 9162 Merkle Tree Hash of an ordered list of leaf digests. */
export async function psiTreeHead(leaves: readonly string[]): Promise<string> {
  const parsed: Uint8Array[] = [];
  for (const leaf of leaves) {
    const raw = strictHexBytes(leaf);
    if (!raw) throw new Error("every leaf must be 64 hex characters");
    parsed.push(raw);
  }
  return bytesToHex(await rfc9162Head(parsed));
}

/** RFC 9162 sec 2.1.4.1 SUBPROOF(m, D_n, b). */
async function consistencySubproof(
  m: number,
  leaves: readonly Uint8Array[],
  complete: boolean,
): Promise<Uint8Array[]> {
  const n = leaves.length;
  if (m === n) {
    if (complete) return [];
    return [await rfc9162Head(leaves)];
  }
  let k = 1;
  while (k * 2 < n) k *= 2;
  if (m <= k) {
    const sub = await consistencySubproof(m, leaves.slice(0, k), complete);
    const right = await rfc9162Head(leaves.slice(k));
    return [...sub, right];
  }
  const sub = await consistencySubproof(m - k, leaves.slice(k), false);
  const left = await rfc9162Head(leaves.slice(0, k));
  return [...sub, left];
}

/**
 * The RFC 9162 consistency proof between two ordered lists of leaf digests.
 * The older list must be a prefix of the newer one: the proof says the older
 * tree is contained in the newer, so there is nothing to prove otherwise.
 */
export async function psiConsistencyPath(
  oldLeaves: readonly string[],
  newLeaves: readonly string[],
): Promise<string[]> {
  const older: string[] = [];
  for (const leaf of oldLeaves) {
    if (!strictHexBytes(leaf)) throw new Error("every leaf must be 64 hex characters");
    older.push(String(leaf).replace(/^sha256:/i, "").trim().toLowerCase());
  }
  const newer: string[] = [];
  for (const leaf of newLeaves) {
    if (!strictHexBytes(leaf)) throw new Error("every leaf must be 64 hex characters");
    newer.push(String(leaf).replace(/^sha256:/i, "").trim().toLowerCase());
  }
  if (older.length === 0 || older.length >= newer.length) {
    throw new Error("the older tree must be smaller than the newer tree");
  }
  for (let i = 0; i < older.length; i += 1) {
    if (older[i] !== newer[i]) {
      throw new Error("the older tree must be a prefix of the newer tree");
    }
  }
  const parsed: Uint8Array[] = newer.map((leaf) => strictHexBytes(leaf) as Uint8Array);
  const nodes = await consistencySubproof(older.length, parsed, true);
  return nodes.map(bytesToHex);
}

/**
 * Verify a consistency proof between two tree heads.
 *
 * `malformed` means the proof could not be checked at all. `mismatch` means
 * the check ran and said no. Only `consistent` is a pass.
 */
export async function psiVerifyConsistency(proof: PsiConsistencyProof): Promise<PsiConsistencyResult> {
  const firstSize = proof?.first_size;
  const secondSize = proof?.second_size;
  const firstRoot = String(proof?.first_root ?? "").trim();
  const secondRoot = String(proof?.second_root ?? "").trim();
  const rawPath = Array.isArray(proof?.consistency_path) ? proof.consistency_path : [];

  const sizesAreIntegers =
    typeof firstSize === "number" &&
    Number.isInteger(firstSize) &&
    typeof secondSize === "number" &&
    Number.isInteger(secondSize);
  if (!sizesAreIntegers || (firstSize as number) < 1 || (secondSize as number) < (firstSize as number)) {
    return {
      status: "malformed",
      consistent: false,
      recomputed_first_root: null,
      recomputed_second_root: null,
      detail:
        "first_size and second_size must both be integers, with 1 <= first_size <= second_size",
      rule: PSI_RULE_CITATIONS.consistency_malformed,
    };
  }

  const firstBytes = strictHexBytes(firstRoot);
  const secondBytes = strictHexBytes(secondRoot);
  if (!firstBytes || !secondBytes) {
    return {
      status: "malformed",
      consistent: false,
      recomputed_first_root: null,
      recomputed_second_root: null,
      detail: "first_root and second_root must both be 64 hex characters",
      rule: PSI_RULE_CITATIONS.consistency_malformed,
    };
  }

  const nodes: Uint8Array[] = [];
  for (const node of rawPath) {
    const raw = strictHexBytes(node);
    if (!raw) {
      return {
        status: "malformed",
        consistent: false,
        recomputed_first_root: null,
        recomputed_second_root: null,
        detail: "consistency_path must hold 64 hex characters",
        rule: PSI_RULE_CITATIONS.consistency_malformed,
      };
    }
    nodes.push(raw);
  }

  if (firstSize === secondSize) {
    if (nodes.length > 0) {
      return {
        status: "malformed",
        consistent: false,
        recomputed_first_root: null,
        recomputed_second_root: null,
        detail: "two heads of the same tree size must carry an empty consistency path",
        rule: PSI_RULE_CITATIONS.consistency_malformed,
      };
    }
    if (bytesToHex(firstBytes) !== bytesToHex(secondBytes)) {
      return {
        status: "mismatch",
        consistent: false,
        recomputed_first_root: null,
        recomputed_second_root: null,
        detail:
          "the two heads claim the same tree size but carry different roots, so one of them is not this tree",
        rule: PSI_RULE_CITATIONS.consistency_mismatch,
      };
    }
    return {
      status: "consistent",
      consistent: true,
      recomputed_first_root: bytesToHex(firstBytes),
      recomputed_second_root: bytesToHex(secondBytes),
      detail: `both heads describe the same tree of ${firstSize} leaves`,
      rule: PSI_RULE_CITATIONS.consistency_ok,
    };
  }

  if (nodes.length === 0) {
    return {
      status: "malformed",
      consistent: false,
      recomputed_first_root: null,
      recomputed_second_root: null,
      detail: "a consistency proof between two different trees must carry at least one node",
      rule: PSI_RULE_CITATIONS.consistency_malformed,
    };
  }

  // RFC 9162 sec 2.1.4.2, step for step.
  // Step 2: when the older tree is an exact power of two its head is a
  // complete subtree, so the proof does not carry it and the verifier
  // prepends the supplied head. A caller who already included that head in
  // the path is not prepended twice — the check below is unchanged either way.
  const path =
    (firstSize & (firstSize - 1)) === 0 && !(nodes.length > 0 && bytesToHex(nodes[0]) === bytesToHex(firstBytes))
      ? [firstBytes, ...nodes]
      : nodes;
  let fn = firstSize - 1;
  let sn = secondSize - 1;
  while (fn & 1) {
    fn >>= 1;
    sn >>= 1;
  }
  let fr = path[0];
  let sr = path[0];
  for (const node of path.slice(1)) {
    if (sn === 0) {
      return {
        status: "mismatch",
        consistent: false,
        recomputed_first_root: bytesToHex(fr),
        recomputed_second_root: bytesToHex(sr),
        detail: "the consistency path is longer than the two heads allow",
        rule: PSI_RULE_CITATIONS.consistency_mismatch,
      };
    }
    if ((fn & 1) !== 0 || fn === sn) {
      fr = await prefixedHash(0x01, node, fr);
      sr = await prefixedHash(0x01, node, sr);
      if ((fn & 1) === 0) {
        while ((fn & 1) === 0 && fn !== 0) {
          fn >>= 1;
          sn >>= 1;
        }
      }
    } else {
      sr = await prefixedHash(0x01, sr, node);
    }
    fn >>= 1;
    sn >>= 1;
  }

  const firstHex = bytesToHex(firstBytes);
  const secondHex = bytesToHex(secondBytes);
  if (bytesToHex(fr) !== firstHex || bytesToHex(sr) !== secondHex || sn !== 0) {
    return {
      status: "mismatch",
      consistent: false,
      recomputed_first_root: bytesToHex(fr),
      recomputed_second_root: bytesToHex(sr),
      detail: `the consistency proof does not reproduce the supplied heads: recomputed ${bytesToHex(fr)} and ${bytesToHex(sr)}`,
      rule: PSI_RULE_CITATIONS.consistency_mismatch,
    };
  }
  return {
    status: "consistent",
    consistent: true,
    recomputed_first_root: bytesToHex(fr),
    recomputed_second_root: bytesToHex(sr),
    detail: `the tree of ${firstSize} leaves is a prefix of the tree of ${secondSize} leaves: both heads were recomputed from the consistency proof`,
    rule: PSI_RULE_CITATIONS.consistency_ok,
  };
}

const HEX64 = /^[0-9a-f]{64}$/;
const RFC3339_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ALLOWED = ["schema", "schema_digest", "sealed_at", "subject", "hash", "merkle", "signature", "licence"];

/** Verifier distribution version. Identical in the Python distribution. */
export const PSI_VERIFIER_VERSION = "1.6.0";

/**
 * Human-readable rule citations. Every rejection line carries one:
 * verified, not asserted — trust the math, not the maker.
 * 11.x are the authenticity rules added in v1.3.0; before that R11 existed in
 * the text of the schema and nowhere in the code.
 */
export const PSI_RULE_CITATIONS = {
  not_object: "1.1",
  closed_field_set: "2.1",
  schema_identifier: "4.1",
  schema_digest: "4.2",
  hash_encoding: "5.1",
  sealed_at: "6.1",
  size_bytes: "7.1",
  leaf_missing: "8.1",
  leaf_mismatch: "9.1",
  seal_hash: "10.1",
  signature_absent: "11.1",
  signature_empty: "11.2",
  signature_invalid: "11.3",
  signature_unverifiable: "11.4",
  signature_alg: "11.5",
  binding_declared_unknown: "11.6",
  binding_ambiguous: "11.7",
  binding_unresolvable: "11.8",
  binding_not_recomputable: "11.9",
  post_quantum_absent: "11.10",
  post_quantum_unverifiable: "11.11",
  post_quantum_invalid: "11.12",
  post_quantum_empty: "11.13",
  leaf_mismatch_ledger: "9.2",
  inclusion_malformed: "13.1",
  inclusion_mismatch: "13.2",
  inclusion_ok: "13.3",
  consistency_malformed: "13.4",
  consistency_mismatch: "13.5",
  consistency_ok: "13.6",
} as const;


/** Canonical single-line rejection. Byte-identical in TypeScript and Python. */
export function rejectLine(detail: string, rule: string): string {
  return `PSI-SEAL v${PSI_VERIFIER_VERSION} REJECT: ${detail} — rule ${rule}`;
}

export async function verifySeal(input: unknown, argument: VerifySealArgument = null): Promise<ConformanceResult> {
  const options = normalizeVerifyArgument(argument);
  const trustRoots = options.trustRoots ?? [];
  const requireValidSignature = options.requireValidSignature !== false;
  const failures: string[] = [];
  const env = input as PsiSealEnvelope;
  if (!env || typeof env !== "object" || Array.isArray(env)) {
    return {
      conformant: false,
      schema_id: null,
      schema_digest_match: false,
      seal_hash_match: false,
      signature_valid: false,
      failures: [rejectLine("input is not a JSON object", PSI_RULE_CITATIONS.not_object)],
      signature_status: "absent",
      authentic: false,
      trusted_key_id: null,
      post_quantum_status: "absent",
      post_quantum_detail: null,
    };
  }
  const expected = await psiSchemaDigest();
  if (env.schema !== PSI_SCHEMA_ID)
    failures.push(rejectLine(`schema identifier mismatch, expected ${PSI_SCHEMA_ID}`, PSI_RULE_CITATIONS.schema_identifier));
  const digestMatch = env.schema_digest === expected;
  if (!digestMatch) failures.push(rejectLine("schema_digest mismatch", PSI_RULE_CITATIONS.schema_digest));

  const extra = Object.keys(env).filter((k) => !ALLOWED.includes(k));
  if (extra.length)
    failures.push(rejectLine(`unknown top-level fields: ${extra.join(", ")}`, PSI_RULE_CITATIONS.closed_field_set));
  if (!RFC3339_MS.test(env.sealed_at ?? ""))
    failures.push(rejectLine("sealed_at is not RFC 3339 UTC with three fractional digits", PSI_RULE_CITATIONS.sealed_at));
  if (!HEX64.test(env.hash ?? ""))
    failures.push(rejectLine("hash is not 64 lowercase hexadecimal characters", PSI_RULE_CITATIONS.hash_encoding));
  if (!env.subject || !Number.isInteger(env.subject.size_bytes) || env.subject.size_bytes < 0)
    failures.push(rejectLine("subject.size_bytes is not a non-negative integer", PSI_RULE_CITATIONS.size_bytes));

  let sealHashMatch = false;
  let computedSealHash: string | null = null;
  if (HEX64.test(env.hash ?? "") && env.merkle?.leaf) {
    if ((await psiLeaf(env.hash)) !== env.merkle.leaf)
      failures.push(rejectLine("merkle.leaf mismatch", PSI_RULE_CITATIONS.leaf_mismatch));
    if (env.signature?.seal_hash) {
      computedSealHash = await psiSealHash(env);
      sealHashMatch = computedSealHash === env.signature.seal_hash;
      if (!sealHashMatch) failures.push(rejectLine("seal_hash mismatch", PSI_RULE_CITATIONS.seal_hash));
    }
    // v1.2.x put a second, coarser signature check here (reject "missing" /
    // "invalid" against one caller-supplied key). Removed in the 1.3.0 merge:
    // running both produced two rejection lines for one defect, and the two
    // distributions then stopped printing byte-identical verdicts. The single
    // authority for R11 is `psiVerifySignature` below, whose verdict is the
    // three-state `signature_status` shared with the Python package.
  } else {
    failures.push(rejectLine("merkle.leaf missing", PSI_RULE_CITATIONS.leaf_missing));
  }

  // R11. The signature is checked over the seal_hash this verifier recomputed,
  // never over the one the seal declares — declaring your own hash is not evidence.
  const check = await psiVerifySignature(
    computedSealHash ?? String(env.signature?.seal_hash ?? ""),
    env.signature,
    trustRoots,
    options.postQuantum ?? [],
  );

  if (check.status === "invalid" || (requireValidSignature && check.status !== "verified")) {
    failures.push(rejectLine(check.detail, check.rule));
  }

  return {
    conformant: failures.length === 0,
    schema_id: typeof env.schema === "string" ? env.schema : null,
    schema_digest_match: digestMatch,
    seal_hash_match: sealHashMatch,
    // Back-compat for the v1.2.x boolean: true only when the signature was
    // actually checked and passed. Identical to `authentic`.
    signature_valid: check.status === "verified",
    failures,
    signature_status: check.status,
    authentic: check.status === "verified",
    trusted_key_id: check.key_id,
    post_quantum_status: check.post_quantum_status ?? "absent",
    post_quantum_detail: check.post_quantum_detail ?? null,
  };
}


// ── v1.2.0 ENFORCEMENT LAYER ────────────────────────────────────────────
// Verification stays MIT and free forever. Since 1.1.0 the DEFAULT is that a
// non-conformant seal is REJECTED, not merely reported. v1.2.0 makes the
// rejection text byte-identical across the TypeScript and Python
// distributions and gives every line a readable rule citation.

/** Where a valid seal is produced. Printed in every rejection. */
export const PSI_SEAL_URL = "https://ai-governance-standard.com/seal";

/** Machine-readable schema + licence discovery document. */
export const PSI_SCHEMA_URL = "https://ai-governance-standard.com/.well-known/psi-schema.json";

/** Thrown by `verify()` when `enforce` is true (the default) and the seal fails. */
export class PsiSealInvalidError extends Error {
  override readonly name = "PsiSealInvalidError";
  readonly code = "PSI_SEAL_INVALID";
  readonly result: ConformanceResult;
  readonly canonicalDigest: string;
  constructor(result: ConformanceResult, canonicalDigest: string) {
    super(formatRejection(result, canonicalDigest));
    this.result = result;
    this.canonicalDigest = canonicalDigest;
  }
}

/**
 * Canonical rejection text. Stable, greppable, actionable, and byte-identical
 * to the Python distribution for the same input.
 */
export function formatRejection(result: ConformanceResult, canonicalDigest: string): string {
  return [
    rejectLine(`seal is not conformant to ${PSI_SCHEMA_ID}`, PSI_RULE_CITATIONS.not_object),
    `canonical schema digest: ${canonicalDigest}`,
    `received schema: ${result.schema_id ?? "(none)"} (digest match: ${result.schema_digest_match ? "true" : "false"})`,
    "findings:",
    ...result.failures.map((f) => `  ${f}`),
    `generate a conformant seal: ${PSI_SEAL_URL}`,
    `canonical schema: ${PSI_SCHEMA_URL}`,
    "legacy escape hatch (report-only): enforce=false",
    "verified, not asserted; trust the math, not the maker.",
  ].join("\n");
}


/**
 * Canonical acceptance line. Since v1.3.0 it cannot print a pass for a seal
 * whose signature was never checked: only `signature_status === "verified"`
 * produces ACCEPT. Byte-identical in the Python distribution.
 */
export function formatAcceptance(signatureStatus: PsiSignatureStatus = "verified", keyId: string | null = null): string {
  if (signatureStatus === "verified") {
    return `PSI-SEAL v${PSI_VERIFIER_VERSION} ACCEPT: conformant seal; Ed25519 signature verified${keyId ? ` against ${keyId}` : ""}`;
  }
  return `PSI-SEAL v${PSI_VERIFIER_VERSION} PARTIAL: conformant to the schema, authenticity ${signatureStatus} — a seal no key has signed is a formatting check, not a verification`;
}

export interface VerifyOptions extends VerifySealOptions {
  /**
   * Reject non-conformant seals by throwing `PsiSealInvalidError`.
   * DEFAULT: true (changed in v1.1.0 — previously report-only).
   * Set false only to inspect legacy data without failing the pipeline.
   */
  enforce?: boolean;
  /** Raw hex Ed25519 public key. Defaults to the published APEX PSI key. */
  publicKeyHex?: string;
}

/**
 * Primary entry point. Enforced by default.
 *
 * @throws PsiSealInvalidError when the seal is not PSI-SEAL/1 conformant
 *         and `enforce` is left at its default (true). From v1.3.0 an
 *         unauthenticated seal is not conformant unless
 *         `requireValidSignature: false` is passed explicitly.
 */
export async function verify(input: unknown, options: VerifyOptions = {}): Promise<ConformanceResult> {
  const enforce = options.enforce !== false;
  // `publicKeyHex` is the v1.2.x spelling of "a key I trust". It is folded into
  // the trust roots rather than dropped, so published callers keep working.
  const { publicKeyHex, ...rest } = options;
  const trustRoots = [...(rest.trustRoots ?? []), ...(publicKeyHex ? [publicKeyHex] : [])];
  const result = await verifySeal(input, { ...rest, trustRoots });
  if (!result.conformant && enforce) {
    throw new PsiSealInvalidError(result, await psiSchemaDigest());
  }
  return result;
}

/** Boolean convenience form. Never throws. Authenticity is required. */
export async function isConformant(input: unknown, argument: VerifySealArgument = null): Promise<boolean> {
  return (await verifySeal(input, argument)).conformant;
}

/** Throwing assertion, identical to `verify(input)`. */
export async function assertSeal(input: unknown, options: VerifySealOptions = {}): Promise<ConformanceResult> {
  return verify(input, { ...options, enforce: true });
}



/** Canonical Merkle root (R8) — promoted odd node, raw 32-byte concatenation. */
export async function merkleRoot(leaves: string[]): Promise<string> {
  if (!leaves.length) throw new Error("R8: at least one leaf required");
  const toBytes = (h: string) => {
    const c = h.toLowerCase();
    const out = new Uint8Array(new ArrayBuffer(32));
    for (let i = 0; i < 32; i++) out[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16);
    return out;
  };
  let level = leaves.map(toBytes);
  while (level.length > 1) {
    const next: Uint8Array<ArrayBuffer>[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) { next.push(level[i]); continue; }
      const merged = new Uint8Array(new ArrayBuffer(64));
      merged.set(level[i], 0);
      merged.set(level[i + 1], 32);
      next.push(toBytes(await sha256Hex(merged)));
    }
    level = next;
  }
  return Array.from(level[0]).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export { verifyIncidentBundle, incidentEntryHash, INCIDENT_FORMAT, type IncidentResult } from "./incident.ts";
