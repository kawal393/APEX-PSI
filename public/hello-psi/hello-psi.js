#!/usr/bin/env node
// hello-psi.js — Hello PSI reference implementation.
// Node 18+, zero dependencies. MIT. Free forever. No permission required.
//
// Implements PSI-SEAL/1.0.0 rules R1-R10:
//   R1  RFC 8785 JCS canonicalisation, UTF-8, no BOM
//   R3  field order: schema, schema_digest, sealed_at, subject, hash, merkle
//   R4  lowercase hex digests, 64 chars
//   R5  hash = SHA-256 over the raw octet stream of the subject
//   R6  sealed_at = RFC 3339 UTC, exactly three fractional digits, literal Z
//   R7  subject.name NFC-normalised, subject.size_bytes exact octet length
//   R9  merkle.leaf = SHA-256("PSI1:" + hash)
//   R10 seal_hash = SHA-256(JCS(envelope))
//
// Spec: https://ai-governance-standard.com/.well-known/psi-schema.json
// Verify it yourself:  node hello-psi.js "Hello, PSI."
// ES module, Node 18+.

import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const SCHEMA_ID = "PSI-SEAL/1.0.0";
const VECTOR_SEALED_AT = "2026-01-01T00:00:00.000Z";
const SUBJECT_NAME = "hello-psi-input";
// SHA-256 over the JCS form of the live /.well-known/psi-schema.json.
const SCHEMA_DIGEST = "__SCHEMA_DIGEST__";

export function sha256Hex(input) {
  return createHash("sha256").update(input, typeof input === "string" ? "utf8" : undefined).digest("hex");
}

// RFC 8785 JSON Canonicalization Scheme (subset sufficient for PSI envelopes:
// objects, strings, integers, arrays, booleans, null).
export function jcs(value) {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "boolean") return value ? "true" : "false";
  if (t === "number") {
    if (!Number.isFinite(value)) throw new Error("JCS: non-finite number");
    return Number.isInteger(value) ? String(value) : JSON.stringify(value);
  }
  if (t === "string") return jcsString(value);
  if (Array.isArray(value)) return "[" + value.map(jcs).join(",") + "]";
  if (t === "object") {
    const keys = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      // JCS sorts by UTF-16 code units.
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    return "{" + keys.map((k) => jcsString(k) + ":" + jcs(value[k])).join(",") + "}";
  }
  throw new Error("JCS: unsupported type " + t);
}

function jcsString(s) {
  let out = '"';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (c === 0x08) out += "\\b";
    else if (c === 0x09) out += "\\t";
    else if (c === 0x0a) out += "\\n";
    else if (c === 0x0c) out += "\\f";
    else if (c === 0x0d) out += "\\r";
    else if (c < 0x20) out += "\\u" + c.toString(16).padStart(4, "0");
    else out += ch;
  }
  return out + '"';
}

export function seal(text, sealedAt = VECTOR_SEALED_AT, subjectName = SUBJECT_NAME) {
  const bytes = Buffer.from(text, "utf8");
  const hash = sha256Hex(bytes);
  const leaf = sha256Hex("PSI1:" + hash);
  const envelope = {
    schema: SCHEMA_ID,
    schema_digest: SCHEMA_DIGEST,
    sealed_at: sealedAt,
    subject: { name: subjectName.normalize("NFC"), size_bytes: bytes.length },
    hash,
    merkle: { leaf },
  };
  return { envelope, seal_hash: sha256Hex(jcs(envelope)) };
}

export { SCHEMA_ID, SCHEMA_DIGEST, VECTOR_SEALED_AT };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const input = process.argv[2] ?? "";
  const result = seal(input);
  console.log(JSON.stringify(result.envelope, null, 2));
  console.log("seal_hash: " + result.seal_hash);
}
