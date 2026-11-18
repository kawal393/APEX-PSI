#!/usr/bin/env node
/**
 * conformance-truth-check.mjs — the public conformance receipt must be accepted
 * by the free verifier that we tell readers to install.
 *
 * Measured 19 Nov 2026: the site, public/hello-psi/hello_psi.py and
 * public/hello-psi/hello-psi.js all hashed the WHOLE schema document to make
 * schema_digest (45474369…), while the published verifier — npm and PyPI,
 * both 1.6.0 — recomputes the digest from the RULE ARRAY only
 * (specs/psi-seal-1.md, R12), which is 6d8d65e5…. The two never met.
 *
 * The consequence was not a warning. A reader who took the receipt published
 * at /hello-psi/vectors.json and ran the free verifier got:
 *
 *   PSI-SEAL v1.6.0 REJECT: schema_digest mismatch — rule 4.2
 *   PSI-SEAL v1.6.0 REJECT: seal carries no signature member — rule 11.1
 *
 * Our own conformance path, refused by our own verifier, on the rule the
 * verifier was written to enforce. The CI suite was green the whole time,
 * because the parity test compared the page against the vectors — both of
 * which carried the wrong digest — and never compared either of them against
 * the verifier. A guard that only compares our copy to our copy cannot see a
 * disagreement with the thing a stranger installs.
 *
 * This guard closes that gap. It asks four questions, in order:
 *
 *   1. Do the published schema document's rules and the verifier's own rules
 *      hash to the same digest? (The document must not drift from the code.)
 *   2. Does the schema_digest in the public vectors equal that digest?
 *   3. Do both shipped reference implementations carry that same digest?
 *   4. Does the verifier ACCEPT every vector envelope?
 *
 * Usage:
 *   node --experimental-strip-types scripts/conformance-truth-check.mjs
 *       local: the in-repo verifier source and the repo's public artefacts.
 *   node scripts/conformance-truth-check.mjs --published
 *       the same questions answered by the package the registry serves.
 *   add --live to read the SERVED artefacts instead of the repo's copy.
 *
 * Exit 0 - the public receipt and the free verifier agree.
 * Exit 1 - they do not, and the reason is named.
 */
import { readFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");

const argv = process.argv.slice(2);
const usePublished = argv.includes("--published");
const useLive = argv.includes("--live");
const LIVE_BASE = process.env.APEX_LIVE_BASE || "https://www.ai-governance-standard.com";

let failures = 0;
function fail(what, detail) {
  failures++;
  console.error(`FAIL ${what}${detail ? ": " + detail : ""}`);
}
function pass(what, detail) {
  console.log(`PASS ${what}${detail ? ": " + detail : ""}`);
}
function note(what, detail) {
  console.log(`     ${what}${detail ? ": " + detail : ""}`);
}

// ------------------------------------------------------------------ artefacts

async function readArtefact(path, livePath) {
  if (useLive) {
    const res = await fetch(LIVE_BASE + livePath, {
      headers: { "User-Agent": "apex-psi-conformance-check" },
      signal: AbortSignal.timeout(20_000),
    }).catch((e) => ({ ok: false, status: String(e.message) }));
    if (!res.ok) {
      fail(`fetch ${livePath}`, `HTTP ${res.status}`);
      return null;
    }
    return res.json();
  }
  if (!existsSync(path)) {
    fail(`read ${path}`, "missing");
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

const schemaDoc = await readArtefact(
  join(repo, "public", ".well-known", "psi-schema.json"),
  "/.well-known/psi-schema.json",
);
const vectors = await readArtefact(
  join(repo, "public", "hello-psi", "vectors.json"),
  "/hello-psi/vectors.json",
);
if (!schemaDoc || !vectors) {
  console.error("\nCONFORMANCE-TRUTH FAILED: the artefacts could not be read.");
  process.exit(1);
}
const origin = useLive ? "the served artefacts" : "this repository";

// ------------------------------------------------------------------ verifier

let verifier = null;
let verifierLabel = "";

if (usePublished) {
  // The package a stranger installs, taken from the registry.
  const version = process.env.APEX_NPM_VERIFIER_VERSION || "";
  const dir = mkdtempSync(join(tmpdir(), "apex-conformance-"));
  const isWin = process.platform === "win32";
  const NPM = isWin ? "npm.cmd" : "npm";
  const spec = version ? `apex-psi-verifier@${version}` : "apex-psi-verifier";
  const install = spawnSync(
    NPM,
    ["install", "--no-audit", "--no-fund", "--prefix", dir, spec],
    { encoding: "utf8", shell: isWin, maxBuffer: 32 * 1024 * 1024 },
  );
  if (install.status !== 0) {
    fail("install the published verifier", (install.stdout || install.stderr || "").slice(-400));
    console.error("\nCONFORMANCE-TRUTH FAILED: the published package could not be installed.");
    process.exit(1);
  }
  const entry = join(dir, "node_modules", "apex-psi-verifier", "dist", "index.js");
  const pkg = JSON.parse(
    readFileSync(join(dir, "node_modules", "apex-psi-verifier", "package.json"), "utf8"),
  );
  verifier = await import(`file://${entry.replace(/\\/g, "/")}`);
  verifierLabel = `the published npm package ${pkg.name}@${pkg.version}`;
  rmSync(dir, { recursive: true, force: true });
} else {
  verifier = await import(
    `file://${join(repo, "packages", "psi-verifier", "src", "index.ts").replace(/\\/g, "/")}`,
  );
  const pkg = JSON.parse(
    readFileSync(join(repo, "packages", "psi-verifier", "package.json"), "utf8"),
  );
  verifierLabel = `this repository's verifier source (packages/psi-verifier ${pkg.version})`;
}
note("verifier under test:", verifierLabel);

// ---------------------------------------------------- 1. document vs verifier

const verifierDigest = await verifier.psiSchemaDigest();
const docDigest = await verifier.psiSchemaDigestFromDocument(schemaDoc);

if (docDigest === verifierDigest) {
  pass("the published schema document hashes to the digest the verifier expects", verifierDigest);
} else {
  fail(
    "the published schema document hashes to the digest the verifier expects",
    `document ${docDigest}, verifier ${verifierDigest}. One of them changed its rules; the receipts in the live ledger carry the verifier's value, so the document is the one that moved.`,
  );
}

const docRules = JSON.stringify(schemaDoc.rules);
const verifierRules = JSON.stringify([...verifier.PSI_SCHEMA_RULES]);
if (docRules === verifierRules) {
  pass("the document's rule array is byte-identical to the verifier's", `${schemaDoc.rules.length} rules`);
} else {
  fail("the document's rule array is byte-identical to the verifier's", "the two rule sets differ");
}

// ------------------------------------------- 2. the vectors carry that digest

if (vectors.schema_digest === verifierDigest) {
  pass("the public vectors carry that digest", vectors.schema_digest);
} else {
  fail(
    "the public vectors carry that digest",
    `vectors ${vectors.schema_digest}, verifier ${verifierDigest}. Every receipt a reader copies from /hello-psi would be refused on rule 4.2.`,
  );
}

// ---------------------------------------- 3. both reference implementations

for (const f of ["hello_psi.py", "hello-psi.js"]) {
  const text = readFileSync(join(repo, "public", "hello-psi", f), "utf8");
  if (text.includes(verifierDigest)) {
    pass(`${f} carries that digest`);
  } else {
    fail(`${f} carries that digest`, "the frozen digest is not in the file");
  }
}

// ------------------------------------- 4. the verifier accepts the receipts

const { seal } = await import(
  `file://${join(repo, "public", "hello-psi", "hello-psi.js").replace(/\\/g, "/")}`,
);

let accepted = 0;
for (const v of vectors.vectors) {
  // The envelope is rebuilt from the published vector, not from the file the
  // implementation ships, so the check is on the bytes a reader would copy.
  const r = seal(v.input);
  const envelope = {
    schema: vectors.schema,
    schema_digest: vectors.schema_digest,
    sealed_at: vectors.sealed_at,
    subject: { name: vectors.subject_name, size_bytes: v.size_bytes },
    hash: v.hash,
    merkle: { leaf: v.merkle_leaf },
  };
  const verdict = await verifier.verifySeal(envelope, { requireValidSignature: false });
  const ok =
    verdict.conformant === true &&
    verdict.signature_status === "absent" &&
    verdict.authentic === false &&
    (verdict.failures || []).length === 0;
  if (ok) {
    accepted++;
    pass(`${v.id} is accepted by the verifier`, `seal_hash ${r.seal_hash}`);
  } else {
    fail(
      `${v.id} is accepted by the verifier`,
      `conformant=${verdict.conformant} signature_status=${verdict.signature_status} failures=${JSON.stringify(verdict.failures || []).slice(0, 300)}`,
    );
  }
  if (r.seal_hash !== v.seal_hash) {
    fail(`${v.id} reproduces its published seal_hash`, `reference ${r.seal_hash}, published ${v.seal_hash}`);
  }
}

note(
  "an unsigned reference receipt is schema-conformant and not authentic:",
  "the reference implementations emit no signature by design, and the verifier says so rather than passing it.",
);

console.log(
  `\n${failures === 0 ? "CONFORMANCE-TRUTH OK" : "CONFORMANCE-TRUTH FAILED"}: ${failures} failure(s), ${accepted}/${vectors.vectors.length} vectors accepted, ${origin}`,
);
process.exit(failures === 0 ? 0 : 1);
