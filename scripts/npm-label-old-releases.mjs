#!/usr/bin/env node
/**
 * npm-label-old-releases.mjs — writes the deprecation labels onto the older
 * releases of apex-psi-verifier, and proves they landed.
 *
 * WHY THIS IS A LOCAL SCRIPT AND NOT A CI JOB
 *
 * npm's trusted-publishing session can publish a release and move a dist-tag.
 * It cannot write a label onto an existing release: every metadata-only write
 * is refused with 404. Measured on 14 Nov 2026 across six body shapes —
 * publish-shaped with and without attachments, the whole packument, the
 * version-scoped route, npm's own `npm deprecate` CLI, and a release body that
 * carried the old releases alongside the new one (runs 43630923504, 43631371818,
 * 43631721487, 43631835061). npm's own deprecate command proves the SHAPE is
 * right: it reads the packument with `?write=true`, sets `deprecated` on the
 * version and PUTs the packument back. The missing piece is a credential whose
 * scope is "write to this package", not "publish a new version".
 *
 * So this script takes a classic npm Automation token from the environment,
 * does exactly what npm's CLI does, and never prints the token. The token is
 * used for one write and can be deleted on npmjs.com afterwards.
 *
 *   APEX_NPM_TOKEN=<token> node scripts/npm-label-old-releases.mjs
 *
 * The messages themselves are not written here: they live in
 * packages/psi-verifier/deprecation-notices.json, which is the single source
 * of truth for them.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const NAME = "apex-psi-verifier";
const REGISTRY = "https://registry.npmjs.org";
const here = path.dirname(fileURLToPath(import.meta.url));
const noticesPath = path.join(here, "..", "packages", "psi-verifier", "deprecation-notices.json");

const token = process.env.APEX_NPM_TOKEN;
if (!token) {
  console.error(
    "STOP: no token. Set APEX_NPM_TOKEN to a classic npm Automation token with read/write " +
      "on " + NAME + ". The token is never printed and never written to disk.",
  );
  process.exit(2);
}

const notices = JSON.parse(await readFile(noticesPath, "utf8"));
const want = Object.keys(notices);

const readPackument = async () => {
  const res = await fetch(`${REGISTRY}/${NAME}?write=true&cb=${Date.now()}`, {
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`could not read the packument: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
};

const packument = await readPackument();
const versions = packument.versions || {};
const missing = want.filter((v) => !versions[v]);
if (missing.length) {
  console.error(`STOP: the registry does not carry ${missing.join(", ")}; refusing to write a label`);
  process.exit(1);
}

for (const [version, message] of Object.entries(notices)) {
  versions[version].deprecated = message;
}
packument.versions = versions;

const res = await fetch(`${REGISTRY}/${NAME}`, {
  method: "PUT",
  headers: {
    accept: "application/json",
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  },
  body: JSON.stringify(packument),
});
const body = await res.text();
console.log(`PUT ${REGISTRY}/${NAME} -> HTTP ${res.status} ${body.slice(0, 300).replace(/\s+/g, " ")}`);
if (!res.ok) {
  console.error("STOP: the registry refused the write.");
  process.exit(1);
}

// A write that answered 200 is not proof. Read the packument back.
let labelled = [];
for (let attempt = 1; attempt <= 10; attempt++) {
  const after = await readPackument();
  labelled = want.filter((v) => (after.versions[v] || {}).deprecated);
  if (labelled.length === want.length) break;
  console.log(`attempt ${attempt}: still unlabelled -> ${want.filter((v) => !labelled.includes(v)).join(", ")}`);
  await new Promise((r) => setTimeout(r, 3000));
}
for (const v of want) {
  const label = (packument.versions[v] || {}).deprecated;
  console.log(`- ${v} -> ${label ? "labelled" : "NOT LABELLED"}`);
}
if (labelled.length !== want.length) {
  console.error(`STOP: ${want.filter((v) => !labelled.includes(v)).join(", ")} still carries no label`);
  process.exit(1);
}
console.log(`PASS: ${labelled.join(", ")} now carry a machine-readable deprecation label`);
