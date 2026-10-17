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
  verifySeal,
  type ConformanceResult,
  type VerifySealOptions,
} from "../../src/index.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SHARED = resolve(HERE, "../../../psi-verifier-py/test/cross-language");

const fixtures = JSON.parse(readFileSync(join(SHARED, "fixtures.json"), "utf8")) as {
  canonical_schema_digest: string;
  public_key: string;
  cases: { name: string; seal: unknown; options: VerifySealOptions }[];
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

writeFileSync(join(SHARED, "node.txt"), `${blocks.join("\n\n=====\n\n")}\n`, "utf8");

const signed = await verifySeal(fixtures.cases[0].seal, fixtures.cases[0].options);
console.log(`node: python-signed seal verified here = ${signed.conformant} | key = ${signed.trusted_key_id}`);
console.log(`node: cases = ${blocks.length} | canonical schema digest = ${canonical}`);

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
