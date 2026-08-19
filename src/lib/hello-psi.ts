// ═══════════════════════════════════════════════════════════════════════
// HELLO PSI — the smallest complete expression of the protocol.
//
// MIT. Free forever. No permission required.
// Rules R1–R10 of PSI-SEAL/1.0.0 (see /.well-known/psi-schema.json).
//
// This module is deterministic: identical input bytes and an identical
// sealed_at produce identical digests in TypeScript, JavaScript and Python.
// ═══════════════════════════════════════════════════════════════════════

import { jcsCanonicalize } from "./psi-canonicalize";

export const HELLO_PSI_SCHEMA_ID = "PSI-SEAL/1.0.0";
export const HELLO_PSI_VERIFIER_VERSION = "1.2.0";

/** Fixed vector timestamp — pinned so cross-language output is comparable. */
export const HELLO_PSI_VECTOR_SEALED_AT = "2026-01-01T00:00:00.000Z";

/** Subject name used by the interactive widget and the shipped vectors. */
export const HELLO_PSI_SUBJECT_NAME = "hello-psi-input";

/** Envelope field order — rule R3, minus signature and licence. */
export const HELLO_PSI_FIELD_ORDER = [
  "schema",
  "schema_digest",
  "sealed_at",
  "subject",
  "hash",
  "merkle",
] as const;

export interface HelloPsiEnvelope {
  schema: string;
  schema_digest: string;
  sealed_at: string;
  subject: { name: string; size_bytes: number };
  hash: string;
  merkle: { leaf: string };
}

export interface HelloPsiSeal {
  envelope: HelloPsiEnvelope;
  seal_hash: string;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256 over raw bytes, lowercase hex — rule R4/R5. */
export async function sha256Hex(input: Uint8Array | string): Promise<string> {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  return toHex(await crypto.subtle.digest("SHA-256", bytes.slice().buffer));
}

/** RFC 3339 UTC with exactly three fractional digits and a literal Z — rule R6. */
export function rfc3339Millis(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d+Z$/, `.${String(date.getUTCMilliseconds()).padStart(3, "0")}Z`);
}

/** schema_digest = SHA-256 over the JCS form of the parsed live schema JSON. */
export async function schemaDigestFrom(schemaJson: unknown): Promise<string> {
  return sha256Hex(jcsCanonicalize(schemaJson));
}

/** Build a Hello PSI seal for an arbitrary text input. Rules R1–R10. */
export async function buildHelloPsiSeal(opts: {
  text: string;
  schemaDigest: string;
  sealedAt?: string;
  subjectName?: string;
}): Promise<HelloPsiSeal> {
  const bytes = new TextEncoder().encode(opts.text);
  const hash = await sha256Hex(bytes); // R5
  const leaf = await sha256Hex(`PSI1:${hash}`); // R9

  const envelope: HelloPsiEnvelope = {
    schema: HELLO_PSI_SCHEMA_ID,
    schema_digest: opts.schemaDigest,
    sealed_at: opts.sealedAt ?? rfc3339Millis(),
    subject: {
      name: (opts.subjectName ?? HELLO_PSI_SUBJECT_NAME).normalize("NFC"), // R7
      size_bytes: bytes.length,
    },
    hash,
    merkle: { leaf },
  };

  const seal_hash = await sha256Hex(jcsCanonicalize(envelope)); // R10
  return { envelope, seal_hash };
}

/** Envelope rendered in the normative display order — rule R3. */
export function renderEnvelope(envelope: HelloPsiEnvelope): string {
  const ordered: Record<string, unknown> = {};
  const src = envelope as unknown as Record<string, unknown>;
  for (const key of HELLO_PSI_FIELD_ORDER) ordered[key] = src[key];
  return JSON.stringify(ordered, null, 2);
}
