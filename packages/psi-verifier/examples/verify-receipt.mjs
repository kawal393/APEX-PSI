#!/usr/bin/env node
/**
 * verify-receipt.mjs — the 15-second drop-in.
 *
 *   npm i apex-psi-verifier
 *   node verify-receipt.mjs receipt.json "the content you sealed"
 *
 * Prints one line: VERIFIED, or the reason it is not.
 *
 * WHAT IT CHECKS. The receipt carries an Ed25519 signature over its Merkle
 * leaf. The leaf is SHA-256(receipt_id | commit_hash), and commit_hash is
 * SHA-256(content | predicate | timestamp). All three are recomputed here
 * from YOUR content and the receipt's own fields, so a receipt cannot be
 * verified by anything the receipt says about itself. The signature is then
 * checked against the published trust-anchor key.
 *
 * The verifier never asks the issuer anything: this runs offline, with no
 * account, and costs nothing. A seal is an audit trail, not a claim that the
 * content is true.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { psiVerifyBinding, PSI_VERIFIER_VERSION } from "apex-psi-verifier";

// The published APEX PSI trust anchor. Fetch it once and pin it:
// https://ai-governance-standard.com/.well-known/apex-psi-trust-anchor.json
// Both institutional keys are listed: the one that signed every receipt issued
// before the signing seed became a secret of its own, and the one that signs
// from that day.
const ANCHOR_KEYS = [
  { public_key: "59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724", key_id: "apex-psi-2026" },
  { public_key: "111284cd6462a1eeeae71f58d68745e75a7c3de7a69b7328d5953af1fe840e46", key_id: "apex-psi-2026-11" },
];

const sha = (s) => createHash("sha256").update(s).digest("hex");

const [, , receiptPath, content, predicateArg] = process.argv;
if (!receiptPath || content === undefined) {
  console.error('usage: node verify-receipt.mjs <receipt.json> "<sealed content>" [predicate]');
  process.exit(2);
}

const raw = JSON.parse(readFileSync(receiptPath, "utf8"));
const receipt = raw.receipt ?? raw;
const predicate = predicateArg ?? receipt.predicate ?? "sealed-via-mcp";

// 1. Recompute the chain from your own content.
const commitHash = sha(`${content.trim()}|${predicate}|${receipt.timestamp}`);

// 2. Hand the verifier the record and let IT recompute the leaf.
const record = {
  commit_id: receipt.receipt_id,
  commit_hash: commitHash,
  merkle_leaf_hash: String(receipt.merkle_leaf ?? "").replace(/^sha256:/, ""),
  signature: {
    alg: "Ed25519",
    value: receipt.ed25519_signature,
    binds: "merkle_leaf",
  },
};

const verdict = await psiVerifyBinding(record, ANCHOR_KEYS);

if (verdict.status === "verified") {
  console.log(`VERIFIED  receipt ${receipt.receipt_id}  (verifier ${PSI_VERIFIER_VERSION})`);
  console.log(`          binding ${verdict.binding}  digest ${verdict.digest}`);
  process.exit(0);
}
console.error(`NOT VERIFIED  [${verdict.rule}] ${verdict.detail}`);
process.exit(1);
