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

export async function verifySeal(input: unknown): Promise<ConformanceResult> {
  const failures: string[] = [];
  const env = input as PsiSealEnvelope;
  if (!env || typeof env !== "object") {
    return { conformant: false, schema_id: null, schema_digest_match: false, seal_hash_match: false, failures: ["Not a JSON object"] };
  }
  const expected = await psiSchemaDigest();
  if (env.schema !== PSI_SCHEMA_ID) failures.push(`R12: schema must be "${PSI_SCHEMA_ID}"`);
  const digestMatch = env.schema_digest === expected;
  if (!digestMatch) failures.push("R12: schema_digest does not match the PSI-SEAL/1 rule set");

  const extra = Object.keys(env).filter((k) => !ALLOWED.includes(k));
  if (extra.length) failures.push(`R2: unknown top-level fields: ${extra.join(", ")}`);
  if (!RFC3339_MS.test(env.sealed_at ?? "")) failures.push("R6: sealed_at precision/format invalid");
  if (!HEX64.test(env.hash ?? "")) failures.push("R4/R5: hash must be 64 lowercase hex characters");
  if (!env.subject || !Number.isInteger(env.subject.size_bytes) || env.subject.size_bytes < 0)
    failures.push("R7: subject.size_bytes invalid");

  let sealHashMatch = false;
  if (HEX64.test(env.hash ?? "") && env.merkle?.leaf) {
    if ((await psiLeaf(env.hash)) !== env.merkle.leaf) failures.push("R9: merkle.leaf mismatch");
    if (env.signature?.seal_hash) {
      sealHashMatch = (await psiSealHash(env)) === env.signature.seal_hash;
      if (!sealHashMatch) failures.push("R10: seal_hash mismatch");
    }
  } else {
    failures.push("R9: merkle.leaf missing");
  }

  return {
    conformant: failures.length === 0,
    schema_id: typeof env.schema === "string" ? env.schema : null,
    schema_digest_match: digestMatch,
    seal_hash_match: sealHashMatch,
    failures,
  };
}

/** Canonical Merkle root (R8) — promoted odd node, raw 32-byte concatenation. */
export async function merkleRoot(leaves: string[]): Promise<string> {
  if (!leaves.length) throw new Error("R8: at least one leaf required");
  const toBytes = (h: string) => {
    const c = h.toLowerCase();
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) out[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16);
    return out;
  };
  let level = leaves.map(toBytes);
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) { next.push(level[i]); continue; }
      const merged = new Uint8Array(64);
      merged.set(level[i], 0);
      merged.set(level[i + 1], 32);
      next.push(toBytes(await sha256Hex(merged)));
    }
    level = next;
  }
  return Array.from(level[0]).map((b) => b.toString(16).padStart(2, "0")).join("");
}
