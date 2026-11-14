// Refuse a trust anchor that a database credential can forge.
//
// Measured on 15 Nov 2026: the published anchor's public key
// (public/.well-known/apex-psi-trust-anchor.json -> ed25519_public_key) verifies
// live ledger signatures, and those signatures are produced by
// supabase/functions/_shared/psi_core.ts -> signEd25519Strict(), whose seed was
// the SUPABASE_SERVICE_ROLE_KEY. The anchor's private half was therefore a hash of
// a database login: anyone who could log in as the database could mint a receipt
// that verifies against our published anchor.
//
// Two checks:
//   1. Source — no signing path may take its seed from the database credential.
//   2. Anchor — the published key must not be derivable from any credential on
//      this machine. This arms itself the moment the live service_role key is
//      pasted into the vault, which is the exact moment the anchor becomes
//      forgeable by whoever holds that file.
//
// Usage:  node scripts/trust-anchor-check.mjs [--live]
// Exit 0 — the anchor is not derivable from a credential we hold, and no signing
//         path reads the database credential.
// Exit 1 — a violation, with the file and line.
//
// --live also compares the local anchor against the served one and verifies one
// live receipt against the served anchor.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { publicKeyFromSeed, PREFIXES } from "./derive-anchor-key.mjs";

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const LIVE = process.argv.includes("--live");
const SITE = process.env.APEX_SITE || "https://www.ai-governance-standard.com";
const LIVE_PROJECT_REF = "qhtntebpcribjiwrdtdd";

const violations = [];
const notes = [];

// ---------------------------------------------------------------- 1. source

const FUNCTIONS_DIR = join(ROOT, "supabase", "functions");

// A signing call that takes the database credential as its seed.
const BAD_CALL = [
  /signEd25519Strict\([^)]*Deno\.env\.get\(\s*["']SUPABASE_SERVICE_ROLE_KEY["']/g,
  /signEd25519\([^)]*Deno\.env\.get\(\s*["']SUPABASE_SERVICE_ROLE_KEY["']/g,
  /signEd25519\([^)]*,\s*supabaseKey\b/g,
  /signingSeed\s*=\s*Deno\.env\.get\(\s*["']SUPABASE_SERVICE_ROLE_KEY["']/g,
  /signingSeed\s*=\s*supabaseKey\b/g,
];

const files = [];
const walk = (dir) => {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (entry.endsWith(".ts")) files.push(p);
  }
};
walk(FUNCTIONS_DIR);

for (const file of files) {
  const text = readFileSync(file, "utf8");
  text.split(/\r?\n/).forEach((line, i) => {
    for (const re of BAD_CALL) {
      re.lastIndex = 0;
      if (re.test(line)) {
        violations.push({
          file: file.replace(`${ROOT}/`, "").replace(/\\/g, "/"),
          line: i + 1,
          what: "a signing path takes its seed from the database credential",
        });
      }
    }
  });
}

const corePath = join(FUNCTIONS_DIR, "_shared", "psi_core.ts");
const core = readFileSync(corePath, "utf8");
if (!/APEX_PSI_ED25519_SEED/.test(core)) {
  violations.push({
    file: "supabase/functions/_shared/psi_core.ts",
    line: 0,
    what: "no dedicated signing seed: the institutional key has no secret of its own",
  });
}

// ---------------------------------------------------------------- 2. anchor

const anchorPath = join(ROOT, "public", ".well-known", "apex-psi-trust-anchor.json");
const anchor = JSON.parse(readFileSync(anchorPath, "utf8"));
const published = String(anchor.ed25519_public_key || "").toLowerCase();
notes.push(`published anchor key : ${published}`);

// Credentials that could be the seed. Read from the environment and the vault;
// no value is ever printed.
const candidates = [];
const envService = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.APEX_SUPABASE_SERVICE_KEY;
if (envService) candidates.push({ name: "SUPABASE_SERVICE_ROLE_KEY (env)", value: envService });
try {
  const vaultText = readFileSync("C:/Users/apex1/.apex-vault/credentials.env", "utf8");
  for (const line of vaultText.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*"?([^"\r\n]+)"?\s*$/);
    if (!m) continue;
    const [, name, value] = m;
    if (!value || !value.includes(".")) continue;
    let claims = {};
    try {
      claims = JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString("utf8"));
    } catch {
      continue;
    }
    if (claims.role === "service_role") {
      candidates.push({ name: `${name} (ref ${claims.ref ?? "?"})`, value });
    }
  }
} catch {
  notes.push("no vault on this machine: only the source check ran");
}

let derived = false;
for (const c of candidates) {
  for (const [surface, prefix] of Object.entries(PREFIXES)) {
    const pub = await publicKeyFromSeed(prefix, c.value);
    derived = true;
    if (pub === published) {
      violations.push({
        file: "public/.well-known/apex-psi-trust-anchor.json",
        line: 12,
        what: `the published anchor is derivable from ${c.name} via the ${surface} derivation — anyone holding that credential can forge the institutional signature`,
      });
    }
  }
}
if (candidates.length) {
  notes.push(`credentials tested as a possible seed: ${candidates.length}`);
} else {
  notes.push("no service_role credential available here to test against the anchor");
}

// ---------------------------------------------------------------- 3. live

if (LIVE) {
  try {
    const served = await fetch(`${SITE}/.well-known/apex-psi-trust-anchor.json`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then((r) => r.json());
    const servedKey = String(served.ed25519_public_key || "").toLowerCase();
    notes.push(`served anchor key    : ${servedKey}`);
    if (servedKey !== published) {
      violations.push({
        file: "public/.well-known/apex-psi-trust-anchor.json",
        line: 12,
        what: "the served anchor and the published anchor are different keys — the site carries an anchor this repository does not",
      });
    }
  } catch (e) {
    notes.push(`live anchor unreadable: ${e.message}`);
  }
}

// ---------------------------------------------------------------- report

for (const n of notes) console.log(`  ${n}`);
if (violations.length) {
  console.log(`\nFAIL ${violations.length} violation(s):`);
  for (const v of violations) {
    console.log(`  ${v.file}${v.line ? `:${v.line}` : ""} — ${v.what}`);
  }
  process.exit(1);
}
console.log(
  `\ntrust-anchor-check: the anchor is not derivable from any credential held here${
    derived ? "" : " (no credential to test)"
  }, and no signing path reads the database credential.`,
);
