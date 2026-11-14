#!/usr/bin/env node
/**
 * registry-labels-check.mjs — the guard that keeps the deprecation labels true.
 *
 * A deprecation is a machine-readable label on a release. Without it, a known
 * defective version stays installable and the only warning a stranger gets is
 * in the words of whoever happens to remember the defect. With it, npm prints
 * the label at install time and the package page shows it.
 *
 * The labels are written once, by scripts/npm-label-old-releases.mjs, because
 * npm's token-free trusted-publishing session cannot write a label onto an
 * existing release (measured 14 Nov 2026 across six body shapes; every
 * metadata-only write is refused with 404). They can still be REMOVED by
 * anyone who can write to the package, so this guard reads the registry and
 * fails when a label that is supposed to be there is not.
 *
 * It also fails when the newest release carries a deprecation label: that
 * would be the opposite of what we want.
 *
 * Read-only. No credentials. Exits 0 when every label is present.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const NAME = "apex-psi-verifier";
const REGISTRY = "https://registry.npmjs.org";
const here = path.dirname(fileURLToPath(import.meta.url));
const noticesPath = path.join(here, "..", "packages", "psi-verifier", "deprecation-notices.json");

const notices = JSON.parse(await readFile(noticesPath, "utf8"));
const want = Object.keys(notices);

let packument = null;
for (let attempt = 1; attempt <= 6; attempt++) {
  const res = await fetch(`${REGISTRY}/${NAME}?cb=${Date.now()}`, { headers: { accept: "application/json" } });
  if (!res.ok) {
    console.error(`::error title=could not read the packument::HTTP ${res.status}`);
    process.exit(1);
  }
  packument = await res.json();
  const missing = want.filter((v) => !(packument.versions[v] || {}).deprecated);
  if (!missing.length) break;
  console.log(`attempt ${attempt}: still unlabelled -> ${missing.join(", ")}`);
  await new Promise((r) => setTimeout(r, 5000));
}

const versions = packument.versions || {};
const missing = want.filter((v) => !(versions[v] || {}).deprecated);
const absent = want.filter((v) => !versions[v]);
const latest = (packument["dist-tags"] || {}).latest;

for (const v of want) {
  const label = (versions[v] || {}).deprecated;
  console.log(`- ${v} -> ${label || (versions[v] ? "NOT LABELLED" : "NOT ON THE REGISTRY")}`);
}
console.log(`latest = ${latest}`);

const problems = [];
for (const v of absent) problems.push(`${v} is not on the registry at all`);
for (const v of missing) problems.push(`${v} carries no deprecation label`);
if (latest && (versions[latest] || {}).deprecated) {
  problems.push(`the newest release ${latest} carries a deprecation label`);
}

if (problems.length) {
  console.error(`::error title=npm did not carry the deprecation labels::${problems.join("; ")}`);
  process.exit(1);
}
console.log(`::notice title=deprecation labels confirmed::${want.join(", ")}`);
