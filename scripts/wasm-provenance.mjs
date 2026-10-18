// Provenance guard for the one binary this repository ships but did not author.
//
// public/wasm/c2pa-toolkit_bg.wasm is a byte copy of an artifact published on npm under MIT.
// A vendored binary is only honest while it stays identical to upstream, and a 6.3 MB blob is
// exactly the kind of file a build step can silently replace. So CI hashes it, compares it to
// PROVENANCE.json, and compares it to whatever the installed `c2pa` package actually contains.
// Nothing here is printed except names, sizes and digests.
//
// Run: node scripts/wasm-provenance.mjs

import { createHash } from "node:crypto";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(root + rel);

const fail = (msg) => {
  console.error(`WASM PROVENANCE FAIL: ${msg}`);
  process.exit(1);
};

const meta = JSON.parse(read("public/wasm/PROVENANCE.json"));
const assetPath = `public/wasm/${meta.file}`;
if (!existsSync(root + assetPath)) fail(`${assetPath} is missing but PROVENANCE.json still advertises it`);

const bytes = read(assetPath);
const digest = createHash("sha256").update(bytes).digest("hex");
const size = statSync(root + assetPath).size;

console.log(`vendored  : ${assetPath}`);
console.log(`  size    : ${size} bytes (recorded ${meta.bytes})`);
console.log(`  sha256  : ${digest}`);
console.log(`  recorded: ${meta.sha256}`);

if (size !== meta.bytes) fail(`size drifted: ${size} on disk, ${meta.bytes} recorded in PROVENANCE.json`);
if (digest !== meta.sha256) {
  fail(`digest drifted from the recorded value. Either upstream shipped a different build or this file was replaced. Re-verify against the npm registry before trusting anything the reader page prints.`);
}

// The stronger check: does the installed package contain the same bytes we vendored?
let upstreamVersion = "not installed";
let upstreamCompared = false;
try {
  const pkgPath = fileURLToPath(new URL("../node_modules/c2pa/package.json", import.meta.url));
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  upstreamVersion = pkg.version;
  // meta.upstream_path is already repo-root-relative and starts with "node_modules/".
  // Prefixing it again made this check silently skip itself while still printing "OK" -- a fail-open guard.
  const upstreamFile = root + meta.upstream_path;
  if (existsSync(upstreamFile)) {
    const upstream = createHash("sha256").update(readFileSync(upstreamFile)).digest("hex");
    console.log(`upstream  : c2pa@${upstreamVersion} ${meta.upstream_path}`);
    console.log(`  sha256  : ${upstream}`);
    if (upstream !== digest) {
      fail(`the committed binary does not match c2pa@${upstreamVersion} as installed. ` +
        `Update the vendored copy and PROVENANCE.json together, or keep both at c2pa@${meta.package_version}.`);
    }
    upstreamCompared = true;
    if (upstreamVersion !== meta.package_version) {
      console.log(`note      : declared copy is c2pa@${meta.package_version}, installed is ${upstreamVersion}; ` +
        `the bytes are identical, so the vendored file was not rebuilt for this version. Re-record the version on the next dependency bump.`);
    }
  } else {
    fail(`c2pa@${upstreamVersion} is installed but does not contain ${meta.upstream_path}. ` +
      `Upstream moved or dropped the asset, so the vendored copy can no longer be proved against it. ` +
      `Locate the shipped wasm inside the package, re-record PROVENANCE.json, and update the path.`);
  }
} catch (err) {
  console.log(`upstream  : SKIPPED -- c2pa package not installed (${err.code || err.message}); ` +
    `only the recorded digest was checked`);
}

const basis = upstreamCompared
  ? `byte-identical to c2pa@${upstreamVersion} as installed and to the recorded digest`
  : "identical to the recorded digest only; the installed-package comparison did not run";
console.log(`\nWASM PROVENANCE OK -- ${meta.file} is ${basis} ` +
  `(${meta.package_license}-licensed artifact, sha256 ${digest.slice(0, 16)}…, ${size} bytes).`);
