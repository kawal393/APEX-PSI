// Prove every public page points at the real backend.
//
// Why this exists: on 25 Nov 2026 the published bundle carried 19 strings of
// "https://undefined.supabase.co/functions/v1/...". The build had no
// VITE_SUPABASE_PROJECT_ID, so every page that derived its door from it called
// a host that does not exist. Measured live: the site's own /verify portal
// answered "Verification request failed" and /breach-pack answered "The test
// door could not be reached". Ten public doors were dead — notarize,
// verify-hash, public-attestation, pqc-sign, sovereign-lattice,
// generate-receipt-pdf, registry-check, mcp, machine-checkout and the ledger
// query on /verify.
//
// Two halves:
//   1. the source half (default, no network): every read of
//      VITE_SUPABASE_PROJECT_ID must fall back to the real project ref, and no
//      placeholder host may survive in src/.
//   2. the served half (--live): the published bundles must carry no dead host
//      and no placeholder.
//
// Usage:  node scripts/host-check.mjs [--live] [--self-test]
// Exit 0 only when the half in question passes. The failure case is proved,
// not assumed: --self-test feeds the detector a bad fixture and expects exit 1.

import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

const SITE = process.env.APEX_SITE_URL || "https://www.ai-governance-standard.com";
const PROJECT_REF = "qhtntebpcribjiwrdtdd";

// A page that names a host nobody serves. "undefined" is what a template
// literal prints when the build variable is missing; the other two are the
// placeholders that were in the source before this guard existed.
const DEAD_HOSTS = ["undefined.supabase.co", "your-project", "project-ref-unset"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

// A read of the project id that does not fall back to the real ref. The
// lookahead is what makes this a guard and not a grep: the env var may exist
// in some builds, but a page that only works when it exists is a page that
// breaks the day the build machine forgets it.
const BARE_USE = /import\.meta\.env\.VITE_SUPABASE_PROJECT_ID(?!\s*\|\|\s*["']qhtntebpcribjiwrdtdd["'])/g;

export function findBareUses(files) {
  const found = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const hits = text.match(BARE_USE);
    if (hits && hits.length) found.push({ file, count: hits.length });
    for (const dead of DEAD_HOSTS.slice(1)) {
      if (text.includes(dead)) found.push({ file, count: 1, dead });
    }
  }
  return found;
}

function checkSource(root) {
  const files = walk(join(root, "src"));
  const found = findBareUses(files);
  if (!found.length) {
    console.log(`SOURCE HOST OK — ${files.length} files, every project id falls back to ${PROJECT_REF}`);
    return 0;
  }
  console.error("SOURCE HOST BROKEN — a public page can point at a host that does not exist:");
  for (const f of found) {
    console.error(`  ${relative(root, f.file)}${f.dead ? ` (${f.dead})` : ` — ${f.count} bare project-id read(s)`}`);
  }
  console.error("\nFix: fall back to the real ref, e.g. import.meta.env.VITE_SUPABASE_PROJECT_ID || \"" + PROJECT_REF + "\"");
  return 1;
}

async function checkLive() {
  const index = await (await fetch(`${SITE}/`)).text();
  const srcs = [...index.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) => m[1]);
  if (!srcs.length) {
    console.error(`LIVE HOST BROKEN — ${SITE} served no script to read`);
    return 1;
  }
  let bytes = 0;
  const hits = [];
  let correct = 0;
  for (const src of srcs) {
    const url = src.startsWith("http") ? src : `${SITE}${src}`;
    const text = await (await fetch(url)).text();
    bytes += text.length;
    for (const dead of DEAD_HOSTS) {
      const n = (text.match(new RegExp(dead.replace(/\./g, "\\."), "g")) || []).length;
      if (n) hits.push({ src, dead, n });
    }
    correct += (text.match(new RegExp(PROJECT_REF, "g")) || []).length;
  }
  console.log(`live bundles: ${srcs.length} files, ${bytes} bytes, ${correct} references to ${PROJECT_REF}`);
  if (!hits.length) {
    console.log("LIVE HOST OK — no dead host and no placeholder in the served bundles");
    return 0;
  }
  console.error("LIVE HOST BROKEN — the served bundle still points at a host that does not exist:");
  for (const h of hits) console.error(`  ${h.src} — ${h.n} × ${h.dead}`);
  return 1;
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "apex-host-check-"));
  try {
    const good = join(dir, "good.tsx");
    const bad = join(dir, "bad.tsx");
    const placeholder = join(dir, "placeholder.tsx");
    writeFileSync(good, 'const u = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || "qhtntebpcribjiwrdtdd"}.supabase.co`;\n');
    writeFileSync(bad, 'const u = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;\n');
    writeFileSync(placeholder, 'const u = "https://your-project.supabase.co";\n');
    if (findBareUses([good]).length !== 0) {
      console.error("SELFTEST FAILED — the detector flagged a correct fallback");
      return 1;
    }
    if (findBareUses([bad]).length === 0) {
      console.error("SELFTEST FAILED — the detector missed a bare project-id read");
      return 1;
    }
    if (findBareUses([placeholder]).length === 0) {
      console.error("SELFTEST FAILED — the detector missed a placeholder host");
      return 1;
    }
    console.log("SELFTEST OK — bad fixture caught, good fixture passes");
    return 0;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const args = process.argv.slice(2);
const root = process.cwd();
let code = 0;
if (args.includes("--self-test")) code = selfTest();
else if (args.includes("--live")) code = await checkLive();
else code = checkSource(root);
process.exit(code);
