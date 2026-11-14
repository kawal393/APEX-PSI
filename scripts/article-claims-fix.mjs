// Correct the published article copy, with a backup, a dry run and a change report.
//
// Why this exists: scripts/article-claims-check.mjs finds the claims. This writes the
// corrections. It edits the published rows in place, so it is built to be boring:
//
//   - dry run by default. `--apply` is required to write anything.
//   - every row it touches is written to a JSON backup BEFORE the first write, so the
//     copy before the fix is recoverable without asking a database.
//   - every change is printed as before -> after, and written to a report file, so the
//     substitutions are read by a human and not trusted because the script exited 0.
//   - the credential is read at runtime from the vault by identifier. Its value is never
//     written to a file, never printed, and never passed on a command line.
//
// Usage:  node scripts/article-claims-fix.mjs            # dry run: plan + report
//         node scripts/article-claims-fix.mjs --apply     # write
//
// Options: --vault <path>   vault directory (default $APEX_VAULT or C:\Users\apex1\.apex-vault)
//          --report <path>  where the change report goes (default alongside the backup)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

// The write credential, identified by its name only. The value lives in the vault,
// which sits outside every repository and is never printed.
//
// The live project is qhtntebpcribjiwrdtdd. A service_role key for any other project
// cannot write these rows, so the key is checked against the project reference BEFORE
// anything is read or written. The vault also holds a key for an older project, and
// that one fails with "Invalid API key" rather than anything readable.
//
// Reading needs no secret at all: the publishable anon key ships inside the served
// bundle, and the public rows are readable with it. Only writing needs the service key.
const VAULT_KEY_NAMES = [
  'SUPABASE_KEY_live_service',
  'SUPABASE_SERVICE_ROLE_live',
  'SUPABASE_KEY_c4f11c76',
];
const LIVE_PROJECT_REF = 'qhtntebpcribjiwrdtdd';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const argOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const VAULT_DIR = argOf('--vault', process.env.APEX_VAULT || 'C:\\Users\\apex1\\.apex-vault');
const REPORT_PATH = argOf('--report', null);
const SITE = 'https://www.ai-governance-standard.com';

// ---------------------------------------------------------------- rules

// Applied longest-first, so a specific phrase is rewritten before a shorter one that
// sits inside it. Each `from` is a claim we measured false; each `to` is what the
// product can actually deliver.
const RULES = [
  // The product proves an event happened and was signed. It cannot make a claim true.
  ['Cryptographic Truth', 'Cryptographic Evidence'],
  ['CRYPTOGRAPHIC TRUTH', 'CRYPTOGRAPHIC EVIDENCE'],
  ['cryptographic truth', 'cryptographic evidence'],

  // A record is tamper-evident. Any change breaks the hash and the signature; nothing
  // here is tamper-proof.
  ['Tamper-Proof', 'Tamper-Evident'],
  ['Tamper-proof', 'Tamper-evident'],
  ['TAMPER-PROOF', 'TAMPER-EVIDENT'],
  ['tamper-proof', 'tamper-evident'],
  ['Tamper Proof', 'Tamper Evident'],
  ['tamper proof', 'tamper evident'],

  // Nothing we issue is irrefutable or indisputable. What we publish is the key and the
  // root, so a third party can check it — that is a different claim, and a true one.
  ['Irrefutable', 'Independently verifiable'],
  ['IRREFUTABLE', 'INDEPENDENTLY VERIFIABLE'],
  ['irrefutable', 'independently verifiable'],
  ['Irrefutably', 'Independently'],
  ['irrefutably', 'independently'],
  ['Indisputably', 'Independently'],
  ['indisputably', 'independently'],
  ['Indisputable', 'Independently verifiable'],
  ['INDISPUTABLE', 'INDEPENDENTLY VERIFIABLE'],
  ['indisputable', 'independently verifiable'],

  // A signature is checkable, not unbreakable.
  ['Unbreakable', 'Tamper-Evident'],
  ['UNBREAKABLE', 'TAMPER-EVIDENT'],
  ['unbreakable', 'tamper-evident'],

  // The product does not deliver compliance, so it cannot be advertised as delivering it.
  ['not only compliant by design but also provably so', 'auditable by design and independently verifiable'],
  ['compliant by design but also provably so', 'auditable by design and independently verifiable'],
  ['compliant by design', 'auditable by design'],
  ['provably trustworthy and compliant', 'independently verifiable'],
  ['trustworthy, auditable, and compliant', 'trustworthy and auditable'],
  ['transparent, auditable, and policy-compliant AI systems', 'transparent and auditable AI systems with policy evidence'],
  ['auditable, transparent, and policy-compliant AI systems', 'auditable and transparent AI systems with policy evidence'],
  ['policy-compliant AI systems', 'policy-auditable AI systems'],
  ['trustworthy and compliant', 'trustworthy and auditable'],

  // An unprovable priority claim — about the legislation here, not about us, and still
  // not something a page should assert.
  ["the world's first comprehensive legal framework", 'a landmark comprehensive legal framework'],
  ["the world's first", 'a landmark'],

  // A receipt is evidence, not certainty.
  ['reconstruct historical contexts with absolute certainty', 'reconstruct historical contexts from the record itself'],
].sort((a, b) => b[0].length - a[0].length);

// Slug tokens. A slug is a URL a stranger reads and a crawler indexes, so it carries
// the same words as the title and is corrected the same way.
//
// The mapping itself lives in src/lib/article-slug.ts, because the site needs the same
// table to redirect an old address to the renamed one.
const SLUG_RULES = (() => {
  const src = readFileSync(
    new URL('../src/lib/article-slug.ts', import.meta.url),
    'utf8',
  );
  const rules = [];
  for (const m of src.matchAll(/\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\]/g)) rules.push([m[1], m[2]]);
  if (!rules.length) throw new Error('no slug rewrite rules found in src/lib/article-slug.ts');
  return rules;
})();

const FIELDS = ['title', 'description', 'keywords', 'content_md'];

const applyRules = (text) => {
  let out = text;
  let changed = false;
  for (const [from, to] of RULES) {
    if (out.includes(from)) {
      out = out.split(from).join(to);
      changed = true;
    }
  }
  return changed ? out : text;
};

const applySlugRules = (slug) => {
  let out = slug;
  for (const [from, to] of SLUG_RULES) out = out.split(from).join(to);
  return out;
};

// ---------------------------------------------------------------- credentials

function readVaultKey(name) {
  const file = join(VAULT_DIR, 'credentials.env');
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (e) {
    throw new Error(`cannot read the vault at ${file}: ${e.message}`);
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const k = trimmed.slice(0, trimmed.indexOf('=')).trim();
    if (k === name) return trimmed.slice(trimmed.indexOf('=') + 1).trim().replace(/^"|"$/g, '');
  }
  return null;
}

/** The claims a Supabase key carries, read without printing the key. */
function keyClaims(key) {
  const parts = String(key).split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return { ref: payload.ref, role: payload.role };
  } catch {
    return null;
  }
}

const UNBLOCK_HINT =
  `To unblock: Supabase dashboard -> project ${LIVE_PROJECT_REF} -> Project Settings -> API Keys ->\n` +
  `create or reveal the service_role key, then paste it into the vault as SUPABASE_KEY_live_service.`;

/** A service_role key for the live project, or null with the reason it is absent. */
function serviceRoleKey() {
  if (process.env.APEX_SUPABASE_SERVICE_KEY) {
    const key = process.env.APEX_SUPABASE_SERVICE_KEY;
    const claims = keyClaims(key);
    if (claims && claims.ref === LIVE_PROJECT_REF) return { key, name: 'APEX_SUPABASE_SERVICE_KEY' };
    return null;
  }
  for (const name of VAULT_KEY_NAMES) {
    const key = readVaultKey(name);
    if (!key) continue;
    const claims = keyClaims(key);
    if (claims && claims.ref === LIVE_PROJECT_REF && claims.role === 'service_role') return { key, name };
  }
  return null;
}

/**
 * The key used to READ the rows. The publishable anon key is public by design — it
 * ships inside the served bundle for every visitor — so the plan can be built and
 * printed without any credential at all.
 */
async function anonKey(url) {
  const fromEnv =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.APEX_SUPABASE_ANON_KEY;
  if (fromEnv) return { key: fromEnv, name: 'the environment' };

  const headers = { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' };
  const html = await fetch(`${SITE}/?t=${Date.now()}`, { headers }).then((r) => r.text());
  const name = [...new Set([...html.matchAll(/assets\/(index-[A-Za-z0-9_-]+\.js)/g)].map((m) => m[1]))][0];
  if (!name) return null;
  const js = await fetch(`${SITE}/assets/${name}?t=${Date.now()}`, { headers }).then((r) => r.text());
  for (const j of new Set(js.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) || [])) {
    let payload = '';
    try {
      payload = Buffer.from(j.split('.')[1], 'base64url').toString('utf8');
    } catch {
      continue;
    }
    if (/"iss"\s*:\s*"supabase"/.test(payload) && /"role"\s*:\s*"anon"/.test(payload)) {
      return { key: j, name: 'the served bundle' };
    }
  }
  return null;
}

// The public address, read from the same bundle a browser reads.
async function supabaseUrl() {
  const headers = { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' };
  const html = await fetch(`${SITE}/?t=${Date.now()}`, { headers }).then((r) => r.text());
  const name = [...new Set([...html.matchAll(/assets\/(index-[A-Za-z0-9_-]+\.js)/g)].map((m) => m[1]))][0];
  if (!name) throw new Error('cannot find the entry bundle on the live site');
  const js = await fetch(`${SITE}/assets/${name}?t=${Date.now()}`, { headers }).then((r) => r.text());
  const url = (js.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/) || [])[0];
  if (!url) throw new Error('cannot find the Supabase address in the served bundle');
  return url;
}

// ---------------------------------------------------------------- plan

const URL_BASE = await supabaseUrl();
const reader = await anonKey(URL_BASE);
if (!reader) throw new Error('could not read the public Supabase anon key to read the articles');
console.log(`reading with the anon key from ${reader.name}`);

const readHeaders = { apikey: reader.key, Authorization: `Bearer ${reader.key}`, Prefer: 'return=representation' };
const restGet = async (path) => {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: readHeaders });
  if (!r.ok) throw new Error(`GET ${path} -> HTTP ${r.status} ${await r.text()}`);
  return r.text();
};

const rows = JSON.parse(
  await restGet('seo_articles?select=*&published=eq.true&limit=5000'),
);
console.log(`published articles read: ${rows.length}`);

// A rename must not land on a slug another article already owns, or the row update
// fails on the unique index and the copy correction is lost with it.
const slugOwners = new Map();
for (const row of rows) slugOwners.set(row.slug, row.id);

const plan = [];
const collisions = [];
const claimed = new Map();
for (const row of rows) {
  const patch = {};
  for (const f of FIELDS) {
    const v = row[f];
    if (typeof v !== 'string' || !v) continue;
    const next = applyRules(v);
    if (next !== v) patch[f] = next;
  }
  let nextSlug = applySlugRules(row.slug || '');
  let slugChanged = nextSlug !== row.slug;
  if (slugChanged) {
    const owner = slugOwners.get(nextSlug);
    if (owner && owner !== row.id) {
      collisions.push({ slug: row.slug, nextSlug, owner });
      nextSlug = row.slug;
      slugChanged = false;
    } else if (claimed.has(nextSlug)) {
      collisions.push({ slug: row.slug, nextSlug, owner: claimed.get(nextSlug) });
      nextSlug = row.slug;
      slugChanged = false;
    } else {
      claimed.set(nextSlug, row.id);
    }
  }
  if (Object.keys(patch).length || slugChanged) {
    plan.push({ id: row.id, slug: row.slug, nextSlug, patch, original: row });
  }
}

console.log(`articles needing a change: ${plan.length}`);
const fieldCounts = {};
let slugChanges = 0;
for (const p of plan) {
  for (const f of Object.keys(p.patch)) fieldCounts[f] = (fieldCounts[f] || 0) + 1;
  if (p.slug !== p.nextSlug) slugChanges++;
}
console.log(`  fields changed: ${JSON.stringify(fieldCounts)}`);
console.log(`  slugs changed: ${slugChanges}`);
if (collisions.length) {
  console.log(`  slug renames SKIPPED because the new slug is already taken: ${collisions.length}`);
  for (const c of collisions.slice(0, 10)) console.log(`      ${c.slug} -> ${c.nextSlug}`);
}

// ---------------------------------------------------------------- report

const report = {
  generated_at: new Date().toISOString(),
  mode: APPLY ? 'apply' : 'dry-run',
  read_key_from: reader.name,
  live_project_ref: LIVE_PROJECT_REF,
  articles_touched: plan.length,
  changes: plan.map((p) => ({
    id: p.id,
    slug: p.slug,
    next_slug: p.nextSlug,
    fields: Object.keys(p.patch),
    before: Object.fromEntries(Object.entries(p.patch).map(([f, v]) => [f, p.original[f]])),
    after: p.patch,
  })),
};

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = dirname(REPORT_PATH || join(VAULT_DIR, 'article-copy-reports'));
const reportPath = REPORT_PATH || join(outDir, `article-copy-report-${stamp}.json`);
mkdirSync(outDir, { recursive: true });
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`change report: ${reportPath}`);

// ---------------------------------------------------------------- backup

const backupPath = join(outDir, `article-copy-backup-${stamp}.json`);
writeFileSync(
  backupPath,
  JSON.stringify(
    { generated_at: report.generated_at, rows: plan.map((p) => p.original) },
    null,
    2,
  ),
);
console.log(`backup: ${backupPath}`);

// ---------------------------------------------------------------- apply

if (!APPLY) {
  console.log('\nDRY RUN — nothing was written. Re-run with --apply to write these changes.');
  const sample = report.changes.slice(0, 3);
  for (const c of sample) {
    console.log(`\n  ${c.slug}`);
    for (const [f, before] of Object.entries(c.before)) {
      const b = before.length > 260 ? `${before.slice(0, 260)}…` : before;
      console.log(`    ${f} BEFORE: ${b}`);
      const a = c.after[f].length > 260 ? `${c.after[f].slice(0, 260)}…` : c.after[f];
      console.log(`    ${f} AFTER : ${a}`);
    }
  }
  const writer = serviceRoleKey();
  if (!writer) {
    console.log('\nA WRITE KEY IS NOT IN THE VAULT, so --apply cannot run yet.');
    console.log(UNBLOCK_HINT);
  } else {
    console.log(`\nA write key for ${LIVE_PROJECT_REF} is in the vault (${writer.name}). --apply will use it.`);
  }
  process.exit(0);
}

const writer = serviceRoleKey();
if (!writer) {
  console.error(
    `no service_role key for the live project (${LIVE_PROJECT_REF}) is in the vault, so nothing was written.\n` +
    `Looked for: ${VAULT_KEY_NAMES.join(', ')} (and APEX_SUPABASE_SERVICE_KEY in the environment).\n` +
    UNBLOCK_HINT,
  );
  process.exit(1);
}
console.log(`writing with the service_role key from ${writer.name}`);

const writeHeaders = {
  apikey: writer.key,
  Authorization: `Bearer ${writer.key}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

let written = 0;
const failures = [];
for (const p of plan) {
  const body = { ...p.patch };
  if (p.slug !== p.nextSlug) body.slug = p.nextSlug;
  try {
    const r = await fetch(`${URL_BASE}/rest/v1/seo_articles?id=eq.${p.id}`, {
      method: 'PATCH',
      headers: writeHeaders,
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
    const updated = await r.json();
    if (Array.isArray(updated) && updated.length === 0) {
      throw new Error('the update matched no row, so the write was refused');
    }
    written++;
  } catch (e) {
    failures.push(`${p.slug}: ${e.message}`);
  }
}

console.log(`\nrows written: ${written}`);
if (failures.length) {
  console.log(`FAILURES (${failures.length}):`);
  for (const f of failures) console.log(`  ${f}`);
  console.log(`\nrestore with the backup at ${backupPath}`);
  process.exit(1);
}
console.log(`backup for rollback: ${backupPath}`);
console.log('article-claims-fix: done. Re-run scripts/article-claims-check.mjs to prove the claims are gone.');
