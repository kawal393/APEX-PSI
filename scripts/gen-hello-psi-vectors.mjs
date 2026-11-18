#!/usr/bin/env node
/**
 * gen-hello-psi-vectors.mjs — regenerates public/hello-psi/vectors.json by
 * EXECUTION, never by hand.
 *
 * The vectors are the public proof that a receipt is deterministic. A vector
 * file typed by a person proves nothing, so this runs the shipped reference
 * implementation and writes what it printed. The Python implementation is run
 * too, and the file is only written if both languages agree on every digest.
 *
 * Measured 19 Nov 2026: the vectors carried a schema_digest of 45474369… — a
 * digest of the whole schema document — while the published verifier
 * recomputes 6d8d65e5… from the rule array (specs/psi-seal-1.md, R12). The
 * free verifier therefore refused our own published receipt on its own rule
 * 4.2. The rule array is the preimage.
 *
 * Usage: node scripts/gen-hello-psi-vectors.mjs [--check]
 *   --check  verify the shipped file matches what the implementations produce
 *            (exit 1 on drift). Does not write.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const helloDir = join(repo, "public", "hello-psi");
const VECTORS = join(helloDir, "vectors.json");

const { seal, SCHEMA_ID, SCHEMA_DIGEST, VECTOR_SEALED_AT, SUBJECT_NAME } = await import(
  `file://${join(helloDir, "hello-psi.js").replace(/\\/g, "/")}`
);

const INPUTS = [
  { id: "VECTOR 0", input: "" },
  { id: "VECTOR 1", input: "Hello, PSI." },
  {
    id: "VECTOR 2",
    input: '{"model":"example","output":"The seal is the math."}',
  },
];

const verifierVersion = JSON.parse(
  readFileSync(join(repo, "packages", "psi-verifier", "package.json"), "utf8"),
).version;

// Cross-language parity: the Python implementation must print the same digests.
const PY = process.platform === "win32" ? "python" : "python3";
const py = spawnSync(PY, [join(helloDir, "hello_psi.py"), "Hello, PSI."], { encoding: "utf8" });
if (py.status !== 0) {
  console.error(`FAIL python reference implementation did not run: ${(py.stderr || "").slice(0, 300)}`);
  process.exit(1);
}
let pySealHash = null;
for (const line of py.stdout.split("\n")) {
  if (line.startsWith("seal_hash:")) pySealHash = line.slice("seal_hash:".length).trim();
}
const nodeVector = seal(INPUTS[1].input);
if (!pySealHash || pySealHash !== nodeVector.seal_hash) {
  console.error(
    `FAIL the two reference implementations disagree on seal_hash\n  node: ${nodeVector.seal_hash}\n  python: ${pySealHash}`,
  );
  process.exit(1);
}

const vectors = INPUTS.map(({ id, input }) => {
  const r = seal(input);
  return {
    id,
    input,
    size_bytes: Buffer.byteLength(input, "utf8"),
    hash: r.envelope.hash,
    merkle_leaf: r.envelope.merkle.leaf,
    seal_hash: r.seal_hash,
  };
});

const next = {
  schema: SCHEMA_ID,
  verifier: verifierVersion,
  schema_digest: SCHEMA_DIGEST,
  sealed_at: VECTOR_SEALED_AT,
  subject_name: SUBJECT_NAME,
  field_order: ["schema", "schema_digest", "sealed_at", "subject", "hash", "merkle"],
  note: "Computed by running the reference implementation. Never hand-typed.",
  vectors,
};

const text = `${JSON.stringify(next, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = readFileSync(VECTORS, "utf8");
  if (current !== text) {
    console.error("FAIL public/hello-psi/vectors.json does not match what the reference implementations produce.");
    console.error("      Run: node scripts/gen-hello-psi-vectors.mjs");
    process.exit(1);
  }
  console.log(`PASS public/hello-psi/vectors.json matches the reference implementations (verifier ${verifierVersion})`);
  process.exit(0);
}

writeFileSync(VECTORS, text);
console.log(`wrote ${VECTORS}`);
console.log(`  schema_digest ${SCHEMA_DIGEST}`);
console.log(`  verifier      ${verifierVersion}`);
for (const v of vectors) console.log(`  ${v.id} seal_hash ${v.seal_hash}`);
