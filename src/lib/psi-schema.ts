// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — CANONICAL SEAL SCHEMA (PSI-SEAL/1)
//
// SPECIFICATION: © 2026 APEX Infrastructure / K. Singh. All rights reserved.
//   The byte-level specification below (field ordering, normalisation rules,
//   padding, hash construction, Merkle assembly, timestamp precision and
//   receipt schema) is a copyrighted technical specification.
//
// DUAL LICENCE:
//   VERIFICATION code (verifySealConformance, canonical re-computation)
//     → MIT. Free forever, everywhere. See packages/psi-verifier/LICENSE.
//   GENERATION code (buildSealEnvelope and any sealing engine)
//     → Proprietary. Free for all use, including commercial and institutional.
//       Commercial, government and institutional sealing is free too.
//       Reserved: the APEX marks, and building a competing seal generator.
//       See LICENSE-ENGINE.txt and /license.
// ═══════════════════════════════════════════════════════════════════════

import { jcsCanonicalize } from "./psi-canonicalize";

/** Immutable schema identifier. Embedded in every conformant seal. */
export const PSI_SCHEMA_ID = "PSI-SEAL/1.0.0";

/** Registered copyright reference for the schema as an original work. */
export const PSI_SCHEMA_COPYRIGHT =
  "© 2026 APEX Infrastructure — PSI-SEAL/1 canonical seal schema. All rights reserved.";

/**
 * NORMATIVE BYTE-LEVEL RULES.
 * This array is the canonical rule set. Its JCS form is hashed into
 * PSI_SCHEMA_DIGEST so any deviation is mathematically detectable.
 */
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

/** Deterministic digest of the rule set + schema id. Computed once, cached. */
let cachedDigest: string | null = null;

async function sha256Hex(input: Uint8Array | string): Promise<string> {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const buf = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function psiSchemaDigest(): Promise<string> {
  if (cachedDigest) return cachedDigest;
  cachedDigest = await sha256Hex(jcsCanonicalize({ id: PSI_SCHEMA_ID, rules: PSI_SCHEMA_RULES }));
  return cachedDigest;
}

// ───────────────────────────── Types ─────────────────────────────

export interface PsiSealEnvelope {
  schema: string;
  schema_digest: string;
  sealed_at: string;
  subject: { name: string; size_bytes: number; media_type?: string };
  hash: string;
  merkle: { leaf: string; root?: string; proof?: string[] };
  signature?: { alg: string; value: string; seal_hash: string; pq_alg?: string; pq_value?: string };
  licence?: { engine: string; tier: "personal" | "commercial"; terms: string; accepted_at: string };
}

export interface ConformanceResult {
  conformant: boolean;
  schema_id: string | null;
  schema_digest_match: boolean;
  seal_hash_match: boolean;
  failures: string[];
}

// ─────────────── NORMALISATION HELPERS (shared, MIT) ───────────────

const HEX64 = /^[0-9a-f]{64}$/;
const RFC3339_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** R6 — timestamp normalisation. */
export function psiTimestamp(d: Date = new Date()): string {
  return new Date(d.getTime()).toISOString().replace(/\.\d+Z$/, `.${String(d.getMilliseconds()).padStart(3, "0")}Z`);
}

/** R9 — domain-separated leaf digest. */
export function psiLeaf(hash: string): Promise<string> {
  return sha256Hex(`PSI1:${hash.replace(/^sha256:/i, "").toLowerCase()}`);
}

/** R8 — canonical Merkle root over leaf digests (raw 32-byte concatenation). */
export async function psiMerkleRoot(leaves: string[]): Promise<string> {
  if (leaves.length === 0) throw new Error("PSI R8: at least one leaf required");
  let level = leaves.map((l) => hexToBytes(l));
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) {
        next.push(level[i]); // odd node promoted, never duplicated (R8)
        continue;
      }
      const merged = new Uint8Array(64);
      merged.set(level[i], 0);
      merged.set(level[i + 1], 32);
      next.push(hexToBytes(await sha256Hex(merged)));
    }
    level = next;
  }
  return bytesToHex(level[0]);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^sha256:/i, "").toLowerCase();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** R10 — the pre-signature envelope hash. Used by generator AND verifier. */
export async function psiSealHash(envelope: PsiSealEnvelope): Promise<string> {
  const { signature: _s, licence: _l, ...core } = envelope;
  return sha256Hex(jcsCanonicalize(core));
}

// ═══════════════ VERIFIER (MIT — free forever) ═══════════════

export async function verifySealConformance(input: unknown): Promise<ConformanceResult> {
  const failures: string[] = [];
  const env = input as PsiSealEnvelope;
  const expectedDigest = await psiSchemaDigest();

  if (!env || typeof env !== "object") {
    return { conformant: false, schema_id: null, schema_digest_match: false, seal_hash_match: false, failures: ["Not a JSON object"] };
  }
  if (env.schema !== PSI_SCHEMA_ID) failures.push(`R12: schema must be "${PSI_SCHEMA_ID}" (got ${String(env.schema)})`);
  const digestMatch = env.schema_digest === expectedDigest;
  if (!digestMatch) failures.push("R12: schema_digest does not match the copyrighted PSI-SEAL/1 rule set");

  const allowed = ["schema", "schema_digest", "sealed_at", "subject", "hash", "merkle", "signature", "licence"];
  const extra = Object.keys(env).filter((k) => !allowed.includes(k));
  if (extra.length) failures.push(`R2: unknown top-level fields: ${extra.join(", ")}`);
  if (JSON.stringify(Object.keys(env).filter((k) => allowed.includes(k))) !==
      JSON.stringify(allowed.filter((k) => k in env))) failures.push("R3: field order deviates from the canonical order");

  if (!RFC3339_MS.test(env.sealed_at ?? "")) failures.push("R6: sealed_at must be RFC 3339 UTC with exactly 3 fractional digits");
  if (!HEX64.test(env.hash ?? "")) failures.push("R4/R5: hash must be 64 lowercase hex characters, unprefixed");
  if (!env.subject || typeof env.subject.size_bytes !== "number" || env.subject.size_bytes < 0 || !Number.isInteger(env.subject.size_bytes))
    failures.push("R7: subject.size_bytes must be a non-negative integer");
  if (!env.merkle || !HEX64.test(env.merkle.leaf ?? "")) failures.push("R9: merkle.leaf missing or malformed");

  let sealHashMatch = false;
  if (HEX64.test(env.hash ?? "") && env.merkle?.leaf) {
    const expectedLeaf = await psiLeaf(env.hash);
    if (expectedLeaf !== env.merkle.leaf) failures.push("R9: merkle.leaf is not SHA-256('PSI1:' || hash)");
    if (env.signature?.seal_hash) {
      sealHashMatch = (await psiSealHash(env)) === env.signature.seal_hash;
      if (!sealHashMatch) failures.push("R10: seal_hash does not equal SHA-256(JCS(core envelope))");
    }
  }

  return {
    conformant: failures.length === 0,
    schema_id: typeof env.schema === "string" ? env.schema : null,
    schema_digest_match: digestMatch,
    seal_hash_match: sealHashMatch,
    failures,
  };
}

// ═══════════ GENERATOR (proprietary — licensed at point of use) ═══════════

export const ENGINE_LICENCE_TERMS =
  "APEX PSI Sealing Engine Licence v2 - free for all use, including commercial, " +
  "government and institutional use, at any scale, in perpetuity. The PSI-SEAL/1 " +
  "schema may be read, implemented, verified and interoperated with freely; it may " +
  "not be used to build a competing seal generator, and the APEX marks may not be " +
  "applied to a product without a written licence. Outputs are provided AS-IS, with " +
  "no warranty, as mathematical statements per the PSI-SEAL/1 specification - never " +
  "as a personal certification or statement of fact.";

export const ENGINE_LICENCE_KEY = "apex.psi.engine.licence.v1";

/**
 * Builds a schema-conformant seal envelope.
 * Calling this constitutes use of the licensed sealing engine.
 */
export async function buildSealEnvelope(params: {
  name: string;
  size_bytes: number;
  media_type?: string;
  hash: string;
  tier?: "personal" | "commercial";
  accepted_at?: string;
}): Promise<PsiSealEnvelope> {
  const hash = params.hash.replace(/^sha256:/i, "").toLowerCase();
  if (!HEX64.test(hash)) throw new Error("PSI R4: hash must be 64 lowercase hex characters");

  const envelope: PsiSealEnvelope = {
    schema: PSI_SCHEMA_ID,
    schema_digest: await psiSchemaDigest(),
    sealed_at: psiTimestamp(),
    subject: {
      name: params.name.normalize("NFC"),
      size_bytes: params.size_bytes,
      ...(params.media_type ? { media_type: params.media_type } : {}),
    },
    hash,
    merkle: { leaf: await psiLeaf(hash) },
  };

  const sealHash = await psiSealHash(envelope);
  envelope.signature = { alg: "Ed25519", value: "", seal_hash: sealHash };
  envelope.licence = {
    engine: "APEX PSI Sealing Engine v1",
    tier: params.tier ?? "personal",
    terms: ENGINE_LICENCE_TERMS,
    accepted_at: params.accepted_at ?? envelope.sealed_at,
  };
  return envelope;
}
