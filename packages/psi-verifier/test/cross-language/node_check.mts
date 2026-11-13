/**
 * Cross-language parity check — the TypeScript half.
 *
 * Replays packages/psi-verifier-py/test/cross-language/fixtures.json (built by
 * `python tools/cross_language_check.py`, including a seal whose Ed25519
 * signature was produced in Python) through this distribution and writes
 * node.txt beside it. `diff` of node.txt against python.txt is the proof that
 * both distributions reject the same forgeries with the same bytes.
 *
 * Run from packages/psi-verifier:
 *   node --experimental-strip-types test/cross-language/node_check.mts
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatAcceptance,
  formatRejection,
  psiSchemaDigest,
  psiSchemaDigestFromDocument,
  psiVerifyBinding,
  psiVerifyConsistency,
  psiVerifyInclusion,
  verifySeal,
  type ConformanceResult,
  type PsiConsistencyProof,
  type PsiInclusionProof,
  type VerifySealOptions,
} from "../../src/index.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SHARED = resolve(HERE, "../../../psi-verifier-py/test/cross-language");
const PUBLISHED_SCHEMA = resolve(HERE, "../../../../public/.well-known/psi-schema.json");

const fixtures = JSON.parse(readFileSync(join(SHARED, "fixtures.json"), "utf8")) as {
  canonical_schema_digest: string;
  published_schema_digest: string;
  public_key: string;
  cases: { name: string; seal: unknown; options: VerifySealOptions }[];
  binding_cases: { name: string; record: unknown; trust_roots: readonly (string | { public_key: string; key_id?: string })[] }[];
  inclusion_cases: { name: string; proof: PsiInclusionProof }[];
  consistency_cases: { name: string; proof: PsiConsistencyProof }[];
  post_quantum_cases: { name: string; seal: unknown; checker: "none" | "refuse" | "accept" }[];
};

const canonical = await psiSchemaDigest();
if (canonical !== fixtures.canonical_schema_digest) {
  console.error(`digest drift: node=${canonical} python=${fixtures.canonical_schema_digest}`);
  process.exit(1);
}

const render = (result: ConformanceResult): string =>
  result.conformant
    ? formatAcceptance(result.signature_status, result.trusted_key_id)
    : formatRejection(result, canonical);

const blocks: string[] = [];
for (const [index, testCase] of fixtures.cases.entries()) {
  const result = await verifySeal(testCase.seal, testCase.options);
  const header =
    `case ${index + 1}: conformant=${result.conformant} ` +
    `signature_status=${result.signature_status} authentic=${result.authentic}`;
  blocks.push(`${header}\n${render(result)}`);
}

// R11.6 named binding — the same records, the same verdicts, byte for byte.
for (const [index, testCase] of fixtures.binding_cases.entries()) {
  const check = await psiVerifyBinding(testCase.record, testCase.trust_roots);
  blocks.push(
    `binding case ${index + 1}: status=${check.status} binding=${check.binding} ` +
      `key=${check.key_id} rule=${check.rule}\n` +
      `detail: ${check.detail}`,
  );
}

// RFC 9162 inclusion proofs (R13.1) — the same proofs, the same verdicts.
for (const [index, testCase] of fixtures.inclusion_cases.entries()) {
  const check = await psiVerifyInclusion(testCase.proof);
  blocks.push(
    `inclusion case ${index + 1}: status=${check.status} included=${String(check.included)} ` +
      `recomputed_root=${check.recomputed_root === null ? "null" : check.recomputed_root} ` +
      `rule=${check.rule}\n` +
      `detail: ${check.detail}`,
  );
}

// RFC 9162 consistency proofs (R13.2) — the same proofs, the same verdicts.
for (const [index, testCase] of fixtures.consistency_cases.entries()) {
  const check = await psiVerifyConsistency(testCase.proof);
  blocks.push(
    `consistency case ${index + 1}: status=${check.status} consistent=${String(check.consistent)} ` +
      `recomputed_first_root=${check.recomputed_first_root === null ? "null" : check.recomputed_first_root} ` +
      `recomputed_second_root=${check.recomputed_second_root === null ? "null" : check.recomputed_second_root} ` +
      `rule=${check.rule}\n` +
      `detail: ${check.detail}`,
  );
}

// R11.7 — a seal that DECLARES a post-quantum signature. The same three
// seals the Python half runs, with the same three checker settings.
const pqCheckers = {
  none: [],
  refuse: [
    { alg: "ML-DSA-65", public_key: "00".repeat(1952), verify: () => false },
  ],
  accept: [
    { alg: "ML-DSA-65", public_key: "00".repeat(1952), verify: () => true },
  ],
} as const;

for (const [index, testCase] of fixtures.post_quantum_cases.entries()) {
  const result = await verifySeal(testCase.seal, {
    trustRoots: [{ public_key: fixtures.public_key, key_id: "cross-language-key" }],
    postQuantum: pqCheckers[testCase.checker],
  });
  blocks.push(
    `post-quantum case ${index + 1}: conformant=${result.conformant} ` +
      `signature_status=${result.signature_status} authentic=${result.authentic} ` +
      `post_quantum_status=${result.post_quantum_status}\n` +
      `${render(result)}`,
  );
}

// The published schema document must hash to the verifier's frozen digest.
// The seal schema is frozen: every seal ever issued carries this digest.
const publishedDoc = JSON.parse(readFileSync(PUBLISHED_SCHEMA, "utf8")) as unknown;
const publishedDigest = await psiSchemaDigestFromDocument(publishedDoc);
const schemaMatch = publishedDigest === canonical;
const schemaLine =
  `published schema document digest: ${publishedDigest} | ` +
  `matches the verifier's frozen digest: ${String(schemaMatch).toLowerCase()}`;

writeFileSync(join(SHARED, "node.txt"), `${blocks.join("\n\n=====\n\n")}\n\n=====\n\n${schemaLine}\n`, "utf8");
const signed = await verifySeal(fixtures.cases[0].seal, fixtures.cases[0].options);
console.log(`node: python-signed seal verified here = ${signed.conformant} | key = ${signed.trusted_key_id}`);
console.log(`node: cases = ${fixtures.cases.length} | binding cases = ${fixtures.binding_cases.length}`);
console.log(`node: canonical schema digest = ${canonical}`);
console.log(`node: ${schemaLine}`);

// The parity assertion itself: the bytes this distribution printed must equal
// the bytes the Python distribution printed for the same fixtures.
const nodeBytes = readFileSync(join(SHARED, "node.txt"));
const pythonPath = join(SHARED, "python.txt");
const pythonBytes = readFileSync(pythonPath);
const sha = (b: unknown) => createHash("sha256").update(b as Uint8Array).digest("hex");
console.log(`node: node.txt   ${nodeBytes.length} B  sha256 ${sha(nodeBytes)}`);
console.log(`node: python.txt ${pythonBytes.length} B  sha256 ${sha(pythonBytes)}`);

if (!nodeBytes.equals(pythonBytes)) {
  console.error("CROSS-LANGUAGE DRIFT: the two distributions did not print the same bytes.");
  process.exitCode = 1;
} else {
  console.log("CROSS-LANGUAGE PARITY: TS and Python printed byte-identical verdicts, same sha256.");
}
