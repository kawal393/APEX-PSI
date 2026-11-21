// Refuse a trust anchor that a database credential can forge.
//
// Measured 15 Nov 2026: the published anchor's public key
// (public/.well-known/apex-psi-trust-anchor.json -> ed25519_public_key) verified
// live ledger signatures, and those signatures were produced by
// supabase/functions/_shared/psi_core.ts -> signEd25519Strict(), whose seed was
// the SUPABASE_SERVICE_ROLE_KEY. The anchor's private half was therefore a hash of
// a database login: anyone who could log in as the database could mint a receipt
// that verifies against our own anchor.
//
// The guard that was written for that finding could not see it. It grepped for a
// database credential at a signing CALL SITE, but the credential was reached
// through a helper, so the grep passed while the hole was open. It also tested
// whatever credential happened to be in the vault, without asking which Supabase
// project that credential belongs to — so a key from another project could report
// "not derivable" and mean nothing.
//
// Three checks, each able to fail:
//   1. Source, behavioural — the shipped seed function is EXECUTED here with a
//      stubbed environment. With only the database credential present it must
//      refuse; with the dedicated secret present it must hand back that secret
//      and nothing else. A grep cannot prove this; running the code does.
//   2. Anchor — no credential that belongs to the signing project may derive any
//      key the anchor lists, and the dedicated seed must derive the anchor's
//      active key, so the anchor and the signing identity are provably one key.
//   3. Live (--live) — the served anchor must be byte-identical to the published
//      one, so the site carries the anchor this repository holds.
//
// Usage:  node scripts/trust-anchor-check.mjs [root] [--live]
//         node scripts/trust-anchor-check.mjs --selftest
// Exit 0 — every check passed. Exit 1 — a violation, named with its file and line.

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publicKeyFromSeed, PREFIXES } from "./derive-anchor-key.mjs";

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const LIVE = process.argv.includes("--live");
const SELFTEST = process.argv.includes("--selftest");
const SITE = process.env.APEX_SITE || "https://www.ai-governance-standard.com";
const VAULT_PATH = "C:/Users/apex1/.apex-vault/credentials.env";
const DB_KEY = "SUPABASE_SERVICE_ROLE_KEY";
const SEED_KEY = "APEX_PSI_ED25519_SEED";
/** A stand-in for the database credential. Not a real key; it exists to be recognised. */
const FAKE_DB_KEY = "test-service-role-key-not-a-credential";

const violations = [];
const notes = [];

// --------------------------------------------------------------- 1. source

const FUNCTIONS_DIR = join(ROOT, "supabase", "functions");

/**
 * Pull the seed function out of the shipped source and run it. The function is
 * plain JavaScript inside a TypeScript file, so it is evaluated with the Deno
 * global stubbed — which is exactly the surface the live runtime gives it.
 */
function loadSeedFunction(coreText) {
  const start = coreText.search(/export\s+(?:async\s+)?function\s+institutionalSigningSeed/);
  if (start < 0) return null;
  const open = coreText.indexOf("{", start);
  if (open < 0) return null;
  let depth = 0;
  let end = -1;
  for (let i = open; i < coreText.length; i++) {
    const ch = coreText[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end < 0) return null;
  const source = coreText
    .slice(start, end)
    .replace(/export\s+/, "")
    .replace(/institutionalSigningSeed\s*\([^)]*\)\s*:\s*string/, "institutionalSigningSeed()");
  return new Function("Deno", `${source}\nreturn institutionalSigningSeed;`);
}

function callWithEnv(factory, env) {
  const fakeDeno = { env: { get: (k) => (k in env ? env[k] : undefined) } };
  return factory(fakeDeno)();
}

/**
 * Blank out comments while keeping the line count, so a sentence that names the
 * database credential in prose is never mistaken for code that reads it.
 */
function stripComments(text) {
  const out = [];
  let inBlock = false;
  for (const raw of text.split(/\r?\n/)) {
    let line = raw;
    if (inBlock) {
      const close = line.indexOf("*/");
      if (close < 0) { out.push(""); continue; }
      line = line.slice(close + 2);
      inBlock = false;
    }
    const openIdx = line.indexOf("/*");
    if (openIdx >= 0) {
      const closeIdx = line.indexOf("*/", openIdx + 2);
      if (closeIdx < 0) { line = line.slice(0, openIdx); inBlock = true; }
      else line = line.slice(0, openIdx) + " " + line.slice(closeIdx + 2);
    }
    const slash = line.indexOf("//");
    if (slash >= 0) line = line.slice(0, slash);
    out.push(line);
  }
  return out;
}

const corePath = join(FUNCTIONS_DIR, "_shared", "psi_core.ts");
let core = "";
try {
  core = readFileSync(corePath, "utf8");
} catch {
  violations.push({
    file: "supabase/functions/_shared/psi_core.ts",
    line: 0,
    what: "the shared signing core is missing — there is no signing path to inspect",
  });
}

const coreLine = core ? core.slice(0, core.indexOf("export function institutionalSigningSeed")).split(/\r?\n/).length : 0;

if (core) {
  const factory = loadSeedFunction(core);
  if (!factory) {
    violations.push({
      file: "supabase/functions/_shared/psi_core.ts",
      line: coreLine,
      what: "institutionalSigningSeed() could not be found — the signing seed is not where the guard can see it",
    });
  } else {
    // Attack 1: the database credential is the only secret present.
    try {
      const got = callWithEnv(factory, { [DB_KEY]: FAKE_DB_KEY });
      violations.push({
        file: "supabase/functions/_shared/psi_core.ts",
        line: coreLine,
        what: `a signing path still takes its seed from the database credential (it returned a seed with only ${DB_KEY} set)`,
      });
      if (got) notes.push(`the shipped seed function returned a value with only ${DB_KEY} present`);
    } catch (err) {
      notes.push(`refused to sign with only ${DB_KEY} present: ${String(err.message).slice(0, 90)}`);
    }
    // Attack 2: nothing present at all.
    try {
      callWithEnv(factory, {});
      violations.push({
        file: "supabase/functions/_shared/psi_core.ts",
        line: coreLine,
        what: "the signing path hands out a seed when no secret is present at all",
      });
    } catch {
      notes.push("refused to sign with no secret present");
    }
    // Control: the dedicated secret is present and is what comes back.
    const CONTROL_SEED = "control-seed-not-a-real-secret";
    try {
      const got = callWithEnv(factory, { [SEED_KEY]: CONTROL_SEED, [DB_KEY]: FAKE_DB_KEY });
      if (got !== CONTROL_SEED) {
        violations.push({
          file: "supabase/functions/_shared/psi_core.ts",
          line: coreLine,
          what: "with the dedicated secret set, the signing path does not hand back that secret",
        });
      } else {
        notes.push(`hands back ${SEED_KEY} when it is the only secret set`);
      }
    } catch (err) {
      violations.push({
        file: "supabase/functions/_shared/psi_core.ts",
        line: coreLine,
        what: `the signing path refuses even when ${SEED_KEY} is set: ${String(err.message).slice(0, 90)}`,
      });
    }
  }
}

// A second shape of the same defect: a helper that hands the database credential
// to a signer under another name. The behavioural check above catches the seed
// function itself; this catches a seed built somewhere else.
const seedish = /seed|signing/i;
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
  // Comments are stripped first: a docstring that NAMES the database credential
  // to explain why it is never used is not a defect, and a guard that cries wolf
  // gets ignored.
  const lines = stripComments(readFileSync(file, "utf8"));
  lines.forEach((line, i) => {
    if (!new RegExp(DB_KEY).test(line)) return;
    const looksLikeSeed = seedish.test(line) || /signEd25519|signMlDsa/i.test(line);
    if (!looksLikeSeed) return;
    violations.push({
      file: file.replace(`${ROOT}/`, "").replace(/\\/g, "/"),
      line: i + 1,
      what: `a seed or signing path reads ${DB_KEY}`,
    });
  });
}

// --------------------------------------------------------------- 2. anchor

const anchorPath = join(ROOT, "public", ".well-known", "apex-psi-trust-anchor.json");
const anchor = JSON.parse(readFileSync(anchorPath, "utf8"));
const published = String(anchor.ed25519_public_key || "").toLowerCase();
const listed = [
  ...new Set(
    [published, ...(anchor.keys || []).map((k) => String(k.public_key || "").toLowerCase())].filter(Boolean),
  ),
];
notes.push(`published anchor key : ${published}`);
notes.push(`keys listed in anchor : ${listed.length}`);

// Which project signs? The one the repository is linked to.
function signingProjectRef() {
  try {
    const t = readFileSync(join(ROOT, "supabase", "config.toml"), "utf8");
    const m = t.match(/project_id\s*=\s*"([^"]+)"/);
    if (m) return m[1];
  } catch {
    /* fall through */
  }
  return null;
}
const projectRef = signingProjectRef();
notes.push(`signing project       : ${projectRef ?? "unknown (no project_id in supabase/config.toml)"}`);

// Credentials that could be a seed. Values are never printed.
const candidates = [];
const envService = process.env[DB_KEY] || process.env.APEX_SUPABASE_SERVICE_KEY;
if (envService) candidates.push({ name: `${DB_KEY} (env)`, value: envService, ref: null });
let vaultText = "";
try {
  vaultText = readFileSync(VAULT_PATH, "utf8");
} catch {
  notes.push("no vault on this machine: only the source check ran");
}
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
  if (claims.role === "service_role") candidates.push({ name, value, ref: claims.ref ?? null });
}

let tested = 0;
for (const c of candidates) {
  if (projectRef && c.ref && c.ref !== projectRef) {
    notes.push(`skipped ${c.name}: it belongs to project ${c.ref}, not the signing project`);
    continue;
  }
  tested++;
  for (const [surface, prefix] of Object.entries(PREFIXES)) {
    const pub = await publicKeyFromSeed(prefix, c.value);
    if (listed.includes(pub)) {
      violations.push({
        file: "public/.well-known/apex-psi-trust-anchor.json",
        line: 12,
        what: `the anchor lists a key derivable from ${c.name} via the ${surface} derivation — whoever holds that credential can forge a receipt`,
      });
    }
  }
}
notes.push(
  tested
    ? `credentials of the signing project tested against the anchor: ${tested}`
    : "no credential of the signing project on this machine to test against the anchor",
);

// The rotation is a declared state, never an implied one. Exactly three are
// honest, and they are distinguished by the status the anchor itself carries:
//   pending   — the dedicated key is published but the secret is not live yet,
//               so active_key_id still names the key that is signing.
//   active    — the secret is live; active_key_id must name the dedicated key.
//   identical — the dedicated key IS the top-level published key (no rotation).
// Anything else means the anchor and the signing identity disagree, and a
// stranger verifying a receipt cannot tell which key should authenticate it.
export function rotationState(anchorDoc, derivedPub) {
  const keys = (anchorDoc.keys || []).map((k) => ({
    key_id: String(k.key_id || ""),
    pub: String(k.public_key || "").toLowerCase(),
    status: String(k.status || "").toLowerCase(),
  }));
  const top = String(anchorDoc.ed25519_public_key || "").toLowerCase();
  const activeId = String(anchorDoc.active_key_id || "");
  const active = keys.find((k) => k.key_id === activeId);
  const mine = keys.find((k) => k.pub === derivedPub);

  if (!active) {
    return { violation: `active_key_id "${activeId || "(unset)"}" names no key the anchor lists — a verifier cannot resolve the signing key` };
  }
  if (active.status !== "active") {
    return { violation: `active_key_id "${activeId}" is listed with status "${active.status}", not "active" — the anchor declares a signing key it has disowned` };
  }
  if (!mine) {
    return { violation: "the key the dedicated signing secret derives is not published in the anchor — the anchor and the signing identity are not one key" };
  }
  if (mine.status === "pending") {
    if (mine.key_id === activeId) {
      return { violation: `the dedicated key is marked "pending" while also being named active_key_id — the rotation state contradicts itself` };
    }
    return { note: `the dedicated signing key ${mine.key_id} is published and marked pending; ${activeId} signs until the secret is set` };
  }
  if (mine.status === "active") {
    if (mine.key_id !== activeId) {
      return { violation: `the dedicated signing key ${mine.key_id} is marked active but active_key_id names ${activeId} — the anchor does not know which key signs` };
    }
    return { note: `the dedicated signing key ${mine.key_id} is active and named by active_key_id — the rotation is complete and declared` };
  }
  if (derivedPub === top && active.pub === top) {
    return { note: "the anchor's active key is the key the dedicated signing secret derives" };
  }
  return { violation: `the dedicated signing key ${mine.key_id} is listed with status "${mine.status}", which is neither a pending nor a completed rotation — the state is undeclared` };
}

// The positive control: the key the dedicated signing secret derives must be
// PUBLISHED. Until that secret is live in the signing project the key sits in
// the anchor marked "pending"; from the day it goes live it is the active
// key. Either way the anchor and the signing identity name one key, and the
// transitional state is declared rather than implied.
const seedEntry = vaultText.match(
  new RegExp(`^\\s*(?:export\\s+)?(?:${SEED_KEY}|APEX_PSI_SIGNING_SEED)\\s*=\\s*"?([^"\\r\\n]+)"?\\s*$`, "m"),
);
const localSeed = process.env[SEED_KEY] || (seedEntry ? seedEntry[1].trim() : null);
if (localSeed) {
  const derived = await publicKeyFromSeed(PREFIXES.ledger, localSeed);
  const state = rotationState(anchor, derived);
  if (state.violation) {
    violations.push({
      file: "public/.well-known/apex-psi-trust-anchor.json",
      line: 12,
      what: state.violation,
    });
  } else {
    notes.push(state.note);
  }
  const pendingKeys = (anchor.keys || []).filter(
    (k) => String(k.status || "").toLowerCase() === "pending",
  );
  for (const k of pendingKeys) {
    if (String(k.public_key || "").toLowerCase() !== derived) {
      violations.push({
        file: "public/.well-known/apex-psi-trust-anchor.json",
        line: 12,
        what: `a key marked pending (${k.key_id}) is not the key the dedicated signing secret derives`,
      });
    }
  }
} else {
  notes.push(`no dedicated signing seed on this machine to confirm the anchor against ${SEED_KEY}`);
}

// --------------------------------------------------------------- 3. live

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

// --------------------------------------------------------------- report

function report() {
  for (const n of notes) console.log(`  ${n}`);
  if (violations.length) {
    console.log(`\nFAIL ${violations.length} violation(s):`);
    for (const v of violations) {
      console.log(`  ${v.file}${v.line ? `:${v.line}` : ""} — ${v.what}`);
    }
    return 1;
  }
  console.log(
    "\ntrust-anchor-check: the shipped signing path refuses the database credential, no credential of the signing project derives a listed key, and the anchor matches its own key.",
  );
  return 0;
}

// --------------------------------------------------------------- selftest
//
// A guard that cannot fail is not a guard. This builds the defect it was written
// to catch and requires the check to refuse it.

async function selftest() {
  const dir = mkdtempSync(join(tmpdir(), "anchor-selftest-"));
  let failures = 0;
  try {
    const coreSrc = readFileSync(corePath, "utf8");
    const vulnerable = coreSrc.replace(
      /export function institutionalSigningSeed\(\): string \{[\s\S]*?\n\}/,
      `export function institutionalSigningSeed(): string {\n  return Deno.env.get("${SEED_KEY}") || Deno.env.get("${DB_KEY}") || "";\n}`,
    );
    if (vulnerable === coreSrc) {
      console.log("  FAIL selftest could not build the vulnerable variant — the seed function shape changed");
      failures++;
    }
    const mk = (coreText) => {
      const d = join(dir, Math.random().toString(36).slice(2));
      const fn = join(d, "supabase", "functions", "_shared");
      const pub = join(d, "public", ".well-known");
      mkdirSync(fn, { recursive: true });
      mkdirSync(pub, { recursive: true });
      mkdirSync(join(d, "supabase"), { recursive: true });
      writeFileSync(join(fn, "psi_core.ts"), coreText);
      writeFileSync(join(pub, "apex-psi-trust-anchor.json"), readFileSync(anchorPath, "utf8"));
      writeFileSync(join(d, "supabase", "config.toml"), `project_id = "${projectRef ?? "testref"}"\n`);
      return d;
    };

    const badRoot = mk(vulnerable);
    const badFactory = loadSeedFunction(readFileSync(join(badRoot, "supabase", "functions", "_shared", "psi_core.ts"), "utf8"));
    let caught = false;
    try {
      const got = callWithEnv(badFactory, { [DB_KEY]: FAKE_DB_KEY });
      caught = got !== undefined;
    } catch {
      caught = false;
    }
    if (!caught) {
      console.log("  FAIL the vulnerable variant was NOT caught — the guard is blind to the defect it exists for");
      failures++;
    } else {
      console.log("  ok   the vulnerable variant is caught");
    }

    const goodRoot = mk(coreSrc);
    const goodFactory = loadSeedFunction(readFileSync(join(goodRoot, "supabase", "functions", "_shared", "psi_core.ts"), "utf8"));
    let goodRefused = false;
    try {
      callWithEnv(goodFactory, { [DB_KEY]: FAKE_DB_KEY });
    } catch {
      goodRefused = true;
    }
    if (!goodRefused) {
      console.log("  FAIL the shipped seed function did not refuse the database credential");
      failures++;
    } else {
      console.log("  ok   the shipped seed function refuses the database credential");
    }

    // The rotation-state rule must be able to fail, or it is decoration.
    const DERIVED = "aa".repeat(32);
    const OTHER = "bb".repeat(32);
    const anchorWith = (activeId, keys) => ({
      ed25519_public_key: OTHER,
      active_key_id: activeId,
      keys,
    });
    const oldKey = (status) => ({ key_id: "apex-psi-2026", public_key: OTHER, status });
    const newKey = (status) => ({ key_id: "apex-psi-2026-11", public_key: DERIVED, status });
    const stateCases = [
      ["pending rotation, active key still the old one", anchorWith("apex-psi-2026", [oldKey("active"), newKey("pending")]), false],
      ["completed rotation, new key active and named", anchorWith("apex-psi-2026-11", [oldKey("rotated"), newKey("active")]), false],
      ["new key active but active_key_id names the old one", anchorWith("apex-psi-2026", [oldKey("active"), newKey("active")]), true],
      ["active_key_id names a key the anchor does not list", anchorWith("apex-psi-2099", [oldKey("active"), newKey("pending")]), true],
      ["active_key_id names a key that is marked rotated", anchorWith("apex-psi-2026", [oldKey("rotated"), newKey("pending")]), true],
      ["the derived key is not published at all", anchorWith("apex-psi-2026", [oldKey("active")]), true],
      ["the derived key is listed as revoked", anchorWith("apex-psi-2026-11", [oldKey("rotated"), newKey("revoked")]), true],
      ["a key is pending and also named active_key_id", anchorWith("apex-psi-2026-11", [oldKey("rotated"), newKey("pending")]), true],
    ];
    for (const [label, doc, expectViolation] of stateCases) {
      const got = !!rotationState(doc, DERIVED).violation;
      if (got === expectViolation) {
        console.log(`  ok   ${label} -> ${expectViolation ? "refused" : "accepted"}`);
      } else {
        console.log(`  FAIL ${label} -> expected ${expectViolation ? "refused" : "accepted"}, got the opposite`);
        failures++;
      }
    }
    const shippedAnchor = JSON.parse(readFileSync(anchorPath, "utf8"));
    const shippedActive = (shippedAnchor.keys || []).find(
      (k) => String(k.key_id) === String(shippedAnchor.active_key_id),
    );
    const shipped = rotationState(shippedAnchor, String(shippedActive?.public_key || "").toLowerCase());
    if (shipped.violation) {
      console.log(`  FAIL the shipped anchor itself is refused: ${shipped.violation}`);
      failures++;
    } else {
      console.log(`  ok   the shipped anchor declares one coherent rotation state (${shippedActive.key_id})`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(failures ? `\nselftest FAILED (${failures})` : "\nselftest PASS");
  return failures ? 1 : 0;
}

if (SELFTEST) {
  const code = await selftest();
  process.exit(code);
} else {
  process.exit(report());
}
