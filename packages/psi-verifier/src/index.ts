/**
 * @apex/psi-verifier — MIT licensed. Free forever.
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

export interface ConformanceResult {
  conformant: boolean;
  schema_id: string | null;
  schema_digest_match: boolean;
  seal_hash_match: boolean;
  failures: string[];
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

const HEX64 = /^[0-9a-f]{64}$/;
const RFC3339_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ALLOWED = ["schema", "schema_digest", "sealed_at", "subject", "hash", "merkle", "signature", "licence"];

/** Verifier distribution version. Identical in the Python distribution. */
export const PSI_VERIFIER_VERSION = "1.2.0";

/**
 * Human-readable rule citations (v1.2.0). Every rejection line carries one:
 * verified, not asserted — trust the math, not the maker.
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
} as const;

/** Canonical single-line rejection. Byte-identical in TypeScript and Python. */
export function rejectLine(detail: string, rule: string): string {
  return `PSI-SEAL v${PSI_VERIFIER_VERSION} REJECT: ${detail} — rule ${rule}`;
}

export async function verifySeal(input: unknown): Promise<ConformanceResult> {
  const failures: string[] = [];
  const env = input as PsiSealEnvelope;
  if (!env || typeof env !== "object" || Array.isArray(env)) {
    return {
      conformant: false,
      schema_id: null,
      schema_digest_match: false,
      seal_hash_match: false,
      failures: [rejectLine("input is not a JSON object", PSI_RULE_CITATIONS.not_object)],
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
  if (HEX64.test(env.hash ?? "") && env.merkle?.leaf) {
    if ((await psiLeaf(env.hash)) !== env.merkle.leaf)
      failures.push(rejectLine("merkle.leaf mismatch", PSI_RULE_CITATIONS.leaf_mismatch));
    if (env.signature?.seal_hash) {
      sealHashMatch = (await psiSealHash(env)) === env.signature.seal_hash;
      if (!sealHashMatch) failures.push(rejectLine("seal_hash mismatch", PSI_RULE_CITATIONS.seal_hash));
    }
  } else {
    failures.push(rejectLine("merkle.leaf missing", PSI_RULE_CITATIONS.leaf_missing));
  }

  return {
    conformant: failures.length === 0,
    schema_id: typeof env.schema === "string" ? env.schema : null,
    schema_digest_match: digestMatch,
    seal_hash_match: sealHashMatch,
    failures,
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
  readonly name = "PsiSealInvalidError";
  readonly code = "PSI_SEAL_INVALID";
  constructor(readonly result: ConformanceResult, readonly canonicalDigest: string) {
    super(formatRejection(result, canonicalDigest));
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


/** Canonical acceptance line. Byte-identical in the Python distribution. */
export function formatAcceptance(): string {
  return `PSI-SEAL v${PSI_VERIFIER_VERSION} ACCEPT: conformant seal`;
}

export interface VerifyOptions {
  /**
   * Reject non-conformant seals by throwing `PsiSealInvalidError`.
   * DEFAULT: true (changed in v1.1.0 — previously report-only).
   * Set false only to inspect legacy data without failing the pipeline.
   */
  enforce?: boolean;
}

/**
 * Primary entry point. Enforced by default.
 *
 * @throws PsiSealInvalidError when the seal is not PSI-SEAL/1 conformant
 *         and `enforce` is left at its default (true).
 */
export async function verify(input: unknown, options: VerifyOptions = {}): Promise<ConformanceResult> {
  const enforce = options.enforce !== false;
  const result = await verifySeal(input);
  if (!result.conformant && enforce) {
    throw new PsiSealInvalidError(result, await psiSchemaDigest());
  }
  return result;
}

/** Boolean convenience form. Never throws. */
export async function isConformant(input: unknown): Promise<boolean> {
  return (await verifySeal(input)).conformant;
}

/** Throwing assertion, identical to `verify(input)`. */
export async function assertSeal(input: unknown): Promise<ConformanceResult> {
  return verify(input, { enforce: true });
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
