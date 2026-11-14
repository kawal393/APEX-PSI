#!/usr/bin/env node
/**
 * emit-conformance.mjs — measures one emitted receipt against the canonical
 * PSI-SEAL/1 schema and prints the exact field-level work to make it conformant.
 *
 *   node scripts/emit-conformance.mjs <receipt.json>
 *   node scripts/emit-conformance.mjs --seal-only      # the hosted seal shape
 *
 * WHY THIS EXISTS. An emitter that writes its own receipt shape is fine until
 * a stranger tries to check it with the published verifier — and then it fails
 * with seven rule lines and no obvious next step. This script is that next
 * step: it names every gap, quotes the rule, and prints the envelope the
 * emitter should be writing instead.
 *
 * Exit code 0 when the receipt is already conformant, 1 when it is not.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");

// Prefer the built verifier in this repo, then the published package, then
// the TypeScript source (which needs node --experimental-strip-types).
let mod;
const tries = [
  new URL("../packages/psi-verifier/dist/index.js", import.meta.url).href,
  "apex-psi-verifier",
  new URL("../packages/psi-verifier/src/index.ts", import.meta.url).href,
];
for (const spec of tries) {
  try {
    mod = await import(spec);
    break;
  } catch {
    /* try the next one */
  }
}
if (!mod) {
  console.error("no verifier found: build packages/psi-verifier, install apex-psi-verifier, or run with --experimental-strip-types");
  process.exit(2);
}

const sha = (s) => createHash("sha256").update(s).digest("hex");

const argv = process.argv.slice(2);
const path = argv.find((a) => !a.startsWith("--") && !argv[argv.indexOf(a) - 1]?.startsWith("--content"));
const contentIdx = argv.indexOf("--content");
const sealedContent = contentIdx >= 0 ? argv[contentIdx + 1] : undefined;
if (!path) {
  console.error("usage: node scripts/emit-conformance.mjs <receipt.json> [--content \"<sealed content>\"]");
  process.exit(2);
}

const raw = JSON.parse(readFileSync(path, "utf8"));
const receipt = raw.receipt ?? raw;

const verdict = await mod.verifySeal(receipt, { requireValidSignature: false });

console.log("=== canonical verdict ===");
console.log("conformant      :", verdict.conformant);
console.log("signature_status:", verdict.signature_status);
console.log("failures        :", (verdict.failures || []).length);
for (const f of verdict.failures || []) console.log("  *", f);

const hex64 = (v) => String(v ?? "").replace(/^sha256:/i, "").toLowerCase();
const timestamp = receipt.timestamp ?? receipt.sealed_at;

// Rebuild what the emitter holds, so the remedy can be filled in.
const decision = receipt.decision ?? receipt.decision_text ?? sealedContent;
const predicate = receipt.predicate ?? receipt.predicate_applied ?? "sealed-via-mcp";
const commitHash =
  receipt.commit_hash ??
  (decision !== undefined ? sha(`${String(decision).trim()}|${predicate}|${timestamp}`) : null);
const leaf = hex64(receipt.merkle_leaf);
const subjectHash = hex64(receipt.decision_hash);
const leafV1 = commitHash && receipt.receipt_id ? sha(`${receipt.receipt_id}|${commitHash}`) : null;
// Measured: the hosted issuer hashes a canonical payload object, not the raw
// subject octets. So decision_hash is NOT the canonical `hash` field.
const decisionHashIsSubjectHash = sha(String(decision ?? "")) === subjectHash;

console.log("\n=== what the emitter holds ===");
console.log("receipt_id      :", receipt.receipt_id);
console.log("timestamp       :", timestamp);
console.log("decision_hash   :", receipt.decision_hash, "->", subjectHash);
console.log("merkle_leaf     :", receipt.merkle_leaf);
console.log("commit_hash     :", commitHash ?? "(not derivable from the receipt alone — pass --content)");
console.log("leaf-v1 (R11.6) :", leafV1 ?? "(needs commit_hash)", leafV1 === leaf ? "MATCHES the stored leaf" : "");
console.log("decision_hash == SHA-256(raw subject octets)?", decisionHashIsSubjectHash);
console.log("ed25519 sig     :", receipt.ed25519_signature ? "present" : "ABSENT");
console.log("ed25519 pubkey  :", receipt.ed25519_public_key ?? "(not in the receipt)");

console.log("\n=== the gap, field by field ===");
const gap = (field, rule, remedy) => console.log(`  ${field.padEnd(14)} ${rule.padEnd(6)} ${remedy}`);
gap("schema", "4.1", `emit "schema": "${mod.PSI_SCHEMA_ID}"`);
gap("schema_digest", "4.2", `emit "schema_digest": "${await mod.psiSchemaDigest()}" (frozen; also at /.well-known/psi-schema.json)`);
gap("sealed_at", "6.1", `rename "${timestamp}" -> "sealed_at" (RFC 3339 UTC, three fractional digits, literal Z)`);
gap("subject", "7.1", `emit "subject": {"name": <file or label>, "size_bytes": <octet length of the sealed content>} — the emitter must store the length`);
gap("hash", "5.1", `emit "hash": "<64 lowercase hex>" — the SHA-256 of the subject's RAW octets. The hosted decision_hash is NOT that value (it hashes a canonical payload object), so the emitter must compute the subject hash separately`);
gap("merkle.leaf", "8.1", `emit "merkle": {"leaf": "<64 hex>"} — R9 leaf = SHA-256(ASCII "PSI1:" || hash); a ledger leaf is a different derivation and will not do`);
gap("signature", "11.6", `emit "signature": {"alg":"Ed25519","value":"<hex>","seal_hash":"<R10>"} — sign the canonical seal_hash; a signature over the ledger leaf cannot be replayed into a canonical envelope`);
gap("field set", "2.1", "the envelope field set is closed: schema, schema_digest, sealed_at, subject, hash, merkle, signature, licence. Everything else (links, allowance, proofs, predicates) belongs in a wrapper object beside the envelope, not inside it.");
if (receipt.pq_signature || receipt.mldsa65_signature) {
  console.log("  pq            11.7  a declared post-quantum signature must be verified to be reported verified; with no checker for the algorithm the verdict is `unverifiable`, never `verified`.");
}

console.log("\n=== the envelope this receipt should have carried ===");
const envelope = {
  schema: mod.PSI_SCHEMA_ID,
  schema_digest: await mod.psiSchemaDigest(),
  sealed_at: timestamp,
  subject: { name: "<the sealed subject's name>", size_bytes: "<the sealed subject's octet length>" },
  hash: "<SHA-256 of the subject's raw octets — NOT decision_hash>",
  merkle: { leaf: "<SHA-256('PSI1:' || hash)>" },
  signature: { alg: "Ed25519", value: receipt.ed25519_signature ?? "<hex>", seal_hash: "<R10 seal_hash>" },
};
console.log(JSON.stringify(envelope, null, 2));

console.log("\n=== what is already verifiable today ===");
if (commitHash && receipt.receipt_id && receipt.ed25519_signature) {
  const binding = await mod.psiVerifyBinding(
    {
      commit_id: receipt.receipt_id,
      commit_hash: commitHash,
      merkle_leaf_hash: leaf,
      signature: { alg: "Ed25519", value: receipt.ed25519_signature, binds: "merkle_leaf" },
    },
    [{ public_key: mod.PSI_PUBLIC_KEY_HEX, key_id: "apex-psi-2026" }],
  );
  console.log("R11.6 merkle_leaf binding :", binding.status, "-", binding.detail);
} else {
  console.log("R11.6 merkle_leaf binding : not computable from this receipt alone (commit_hash is absent)");
}
console.log("Note: the trust root above is the published APEX PSI anchor. A signature by any other key is `invalid`, not `verified`.");

process.exit(verdict.conformant ? 0 : 1);
