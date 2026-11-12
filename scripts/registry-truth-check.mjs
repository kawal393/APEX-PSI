#!/usr/bin/env node
/**
 * registry-truth-check.mjs — asks the only question that matters about a release:
 * does the artifact the PUBLIC INDEX serves actually refuse a forged seal?
 *
 * Every earlier check in this repository runs against the source tree, which can
 * only prove what we intended to ship. This file installs what a stranger gets —
 * `npm install apex-psi-verifier` and `pip install psi-verifier` into a throwaway
 * directory — and drives the forgery through it. It also runs the same seals
 * through the pinned unsafe release (npm 1.2.0) and REQUIRES that one to pass the
 * forgery. A guard that cannot see the attack it guards against is decoration.
 *
 *   node scripts/registry-truth-check.mjs            # installs from the registries
 *   node scripts/registry-truth-check.mjs --offline  # use dirs already in .registry-check
 *
 * Exits 0 only when: latest npm rejects the hash forgery AND rejects a genuine seal that
 * declares a post-quantum signature nobody checked, the same is true of latest PyPI, and
 * 1.2.0 accepts the hash forgery. Needs node >= 22 and python 3 on PATH. No credentials,
 * no network writes — both installs are read-only pulls.
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const run = promisify(execFile);
const offline = process.argv.includes("--offline");
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".registry-check");
const NODE_PKG = "apex-psi-verifier";
const PY_PKG = "psi-verifier";
const UNSAFE_NODE_VERSION = "1.2.0";

const hex = (b) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256hex = async (s) =>
  hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))));

async function installTargets() {
  if (!offline) {
    // --prefix / --target keep everything inside a directory nothing imports from.
    for (const [dir, spec] of [["node-latest", `${NODE_PKG}@latest`], ["node-unsafe", `${NODE_PKG}@${UNSAFE_NODE_VERSION}`]]) {
      await mkdir(path.join(root, dir), { recursive: true });
      await run("npm", ["install", "--no-save", "--no-package-lock", "--ignore-scripts", spec, "--prefix", path.join(root, dir)],
        { shell: true, maxBuffer: 1 << 24 });
      console.log(`installed ${spec} -> ${dir}`);
    }
    await mkdir(path.join(root, "py-latest"), { recursive: true });
    await run("python", ["-m", "pip", "install", "--quiet", "--target", path.join(root, "py-latest"), PY_PKG],
      { shell: true, maxBuffer: 1 << 24 });
    console.log(`installed ${PY_PKG} -> py-latest`);
  }
}

const load = async (dir) =>
  import(pathToFileURL(path.join(root, dir, "node_modules", NODE_PKG, "dist", "index.js")).href);

/** Build a genuine seal with the module under test, then forge it with the same module. */
async function seals(mod, key) {
  const env = {
    schema: mod.PSI_SCHEMA_ID,
    schema_digest: await mod.psiSchemaDigest(),
    sealed_at: new Date().toISOString(),
    subject: { name: "quarterly-report.pdf", size_bytes: 20 },
    hash: await sha256hex("revenue was 12,000 AUD"),
    merkle: { leaf: await mod.psiLeaf(await sha256hex("revenue was 12,000 AUD")) },
  };
  const sealHash = await mod.psiSealHash(env);
  const sig = new Uint8Array(await crypto.subtle.sign("ED25519", key.privateKey, new TextEncoder().encode(sealHash)));
  env.signature = { alg: "Ed25519", value: hex(sig), seal_hash: sealHash };

  const forged = structuredClone(env);
  forged.subject = { name: "revenue-ledger.csv", size_bytes: 999 };
  const h = await sha256hex("revenue was 999,000,000 AUD");
  forged.hash = h;
  forged.merkle = { leaf: await mod.psiLeaf(h) };
  // The attacker recomputes every hash and keeps the shape of a real signature,
  // because he holds no key. This is precisely the move 1.2.0 accepted.
  forged.signature = { alg: "Ed25519", value: env.signature.value, seal_hash: await mod.psiSealHash(forged) };

  // The second attack is cheaper and was accepted by everything up to 1.4.0: keep the
  // seal entirely genuine and ADD a post-quantum claim. 512 bytes of noise wearing the
  // label ML-DSA-65. Measured 7 Nov 2026 against npm 1.3.0 and PyPI 1.3.0, both answered
  // conformant=true / authentic=true, because the declared half was read and never
  // checked. R11.7 is the rule that closes it, so a release that passes this line while
  // failing the next one is a release that lets a stranger claim protection he never bought.
  const pq_forged = structuredClone(env);
  const noise = new Uint8Array(512);
  crypto.getRandomValues(noise);
  pq_forged.signature = { ...env.signature, pq_alg: "ML-DSA-65", pq_value: hex(noise) };
  return { honest: env, forged, pq_forged };
}

async function main() {
  await installTargets();
  const key = await crypto.subtle.generateKey("ED25519", true, ["sign", "verify"]);
  const publicKey = hex(new Uint8Array(await crypto.subtle.exportKey("raw", key.publicKey)));
  const trust = [{ public_key: publicKey, key_id: "registry-truth-check" }];

  const latest = await load("node-latest");
  const unsafe = await load("node-unsafe");
  const { honest, forged, pq_forged } = await seals(latest, key);
  // 1.2.0 disagrees with 1.3.0 about the schema digest, so its own copy of the
  // story has to be told with its own helpers, or it fails for the wrong reason.
  const unsafePair = await seals(unsafe, key);

  const verdict = async (mod, env) => mod.verifySeal(env, { trustRoots: trust });
  const nLatestHonest = await verdict(latest, honest);
  const nLatestForged = await verdict(latest, forged);
  const nLatestPq = await verdict(latest, pq_forged);
  const nUnsafeForged = await verdict(unsafe, unsafePair.forged);
  console.log(`\nnpm ${latest.PSI_VERIFIER_VERSION}  honest -> ${nLatestHonest.conformant ? "PASS" : "REJECT"} (sig ${nLatestHonest.signature_status})`);
  console.log(`npm ${latest.PSI_VERIFIER_VERSION}  FORGED -> ${nLatestForged.conformant ? "PASS" : "REJECT"} (sig ${nLatestForged.signature_status})`);
  console.log(`npm ${latest.PSI_VERIFIER_VERSION}  PQ-CLAIM FORGED -> ${nLatestPq.conformant ? "PASS" : "REJECT"} (pq ${nLatestPq.post_quantum_status ?? "field absent: this release does not read a post-quantum claim"})`);
  console.log(`npm ${unsafe.PSI_VERIFIER_VERSION}  FORGED -> ${nUnsafeForged.conformant ? "PASS" : "REJECT"} (sig ${nUnsafeForged.signature_status ?? "not checked — no signature code in this release"})`);

  // Hand the exact same envelopes to the Python artifact the index serves.
  const dir = path.join(root, "py-latest");
  await writeFile(path.join(root, "seals.json"), JSON.stringify({ public_key: publicKey, honest, forged, pq_forged }));
  const py = `
import json, sys
sys.path.insert(0, r"${dir}")
import psi_verifier as pv
d = json.load(open(r"${path.join(root, "seals.json")}", encoding="utf-8"))
tr = [{"public_key": d["public_key"], "key_id": "registry-truth-check"}]
for name in ("honest", "forged", "pq_forged"):
    r = pv.verify_seal(d[name], trust_roots=tr)
    verdict = "PASS" if r.conformant else "REJECT"
    print(f"pypi {pv.PSI_VERIFIER_VERSION} {name} -> {verdict} (sig {r.signature_status} pq {getattr(r, 'post_quantum_status', None)})")
`;
  const pyFile = path.join(root, "py_check.py");
  await writeFile(pyFile, py);
  const { stdout: pyOut } = await run("python", [pyFile], { shell: true, maxBuffer: 1 << 24 });
  console.log(pyOut.trim());

  const pyLines = pyOut.trim().split("\n").filter(Boolean);
  const pyForged = pyLines.find((l) => l.includes(" forged")) ?? "";
  const pyPq = pyLines.find((l) => l.includes("pq_forged")) ?? "";
  const pyVersion = (pyLines[0]?.match(/pypi\s+(\S+)\s/) ?? [])[1] ?? "?";
  const checks = [
    [nLatestHonest.conformant === true, "npm latest accepts the genuine seal"],
    [nLatestForged.conformant === false, "npm latest REJECTS the forgery"],
    [nLatestPq.conformant === false, "npm latest REJECTS a genuine seal wearing a fabricated post-quantum claim"],
    [nUnsafeForged.conformant === true, "npm 1.2.0 accepts the forgery (the guard's failure case is real)"],
    [pyLines.some((l) => l.includes("honest") && l.includes("PASS")), "PyPI latest accepts the genuine seal"],
    [pyForged.includes("REJECT"), "PyPI latest REJECTS the same forged bytes"],
    [pyPq.includes("REJECT"), "PyPI latest REJECTS the fabricated post-quantum claim"],
    [pyVersion === latest.PSI_VERIFIER_VERSION, `both indexes serve the same version (${latest.PSI_VERIFIER_VERSION} / ${pyVersion})`],
  ];
  console.log("");
  let bad = 0;
  for (const [ok, label] of checks) {
    console.log(`${ok ? "  ok  " : " FAIL "} ${label}`);
    if (!ok) bad++;
  }
  process.exit(bad ? 1 : 0);
}

main().catch((e) => {
  console.error("registry-truth-check crashed:", e?.message ?? e);
  process.exit(1);
});
