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

export interface PsiSealEnvelope {
  schema: string;
  schema_digest: string;
  sealed_at: string;
  subject: { name: string; size_bytes: number; media_type?: string };
  hash: string;
  merkle: { leaf: string; root?: string; proof?: string[] };
  signature?: { alg: string; value: string; seal_hash: string; pq_alg?: string; pq_value?: string };
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
}

/**
 * Verify the R11 Ed25519 signature over the ASCII `seal_hash`.
 *
 * Returns `unverifiable` — never `verified` — when there is no trust root or
 * the platform has no Ed25519 primitive. `invalid` is reserved for a check that
 * actually ran and said no.
 */
export async function psiVerifySignature(
  sealHash: string,
  signature: PsiSealEnvelope["signature"],
  trustRoots: readonly (PsiTrustRoot | string)[] = [],
): Promise<PsiSignatureCheck> {
  if (!signature) {
    return { status: "absent", key_id: null, detail: "seal carries no signature member", rule: PSI_RULE_CITATIONS.signature_absent };
  }
  const alg = String(signature.alg ?? "").toLowerCase();
  if (alg !== "ed25519") {
    return {
      status: "invalid",
      key_id: null,
      detail: `signature.alg is "${String(signature.alg ?? "")}"; R11 requires Ed25519, so nothing here can be checked`,
      rule: PSI_RULE_CITATIONS.signature_alg,
    };
  }
  const value = String(signature.value ?? "").trim();
  if (!value) {
    return { status: "invalid", key_id: null, detail: "signature.value is empty — no key signed this seal", rule: PSI_RULE_CITATIONS.signature_empty };
  }
  const sig = decodeMaterial(value, 64);
  if (!sig) {
    return {
      status: "invalid",
      key_id: null,
      detail: "signature.value is neither 128 hex characters nor 64 base64 bytes, so it is not an Ed25519 signature",
      rule: PSI_RULE_CITATIONS.signature_invalid,
    };
  }

  const roots = trustRoots.map((r) => (typeof r === "string" ? { public_key: r } : r));
  if (roots.length === 0) {
    return {
      status: "unverifiable",
      key_id: null,
      detail: "no trust root supplied: a signature nobody's public key was checked against proves nothing",
      rule: PSI_RULE_CITATIONS.signature_unverifiable,
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
      return { status: "verified", key_id: root.key_id ?? `ed25519:${bytesToHex(raw).slice(0, 10)}`, detail: "Ed25519 signature verified over the ASCII seal_hash", rule: "11" };
    }
  }
  if (!anyKeyUsable) {
    return {
      status: "unverifiable",
      key_id: null,
      detail: "this platform exposes no Ed25519 verifier, so the signature was refused rather than assumed",
      rule: PSI_RULE_CITATIONS.signature_unverifiable,
    };
  }
  return {
    status: "invalid",
    key_id: null,
    detail: `Ed25519 signature does not verify against any of the ${roots.length} supplied trust root(s)`,
    rule: PSI_RULE_CITATIONS.signature_invalid,
  };
}


const HEX64 = /^[0-9a-f]{64}$/;
const RFC3339_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ALLOWED = ["schema", "schema_digest", "sealed_at", "subject", "hash", "merkle", "signature", "licence"];

/** Verifier distribution version. Identical in the Python distribution. */
export const PSI_VERIFIER_VERSION = "1.3.0";

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
