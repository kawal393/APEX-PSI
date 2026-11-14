// Read every published article and refuse a claim the estate has already measured false.
//
// Why this exists: the 1,000 articles in `seo_articles` are read at runtime by the site's
// own /articles page, and they were written in a batch by a generator nobody re-reads.
// On 15 Nov 2026 a read of all 1,000 published rows found 39 articles calling the product
// "cryptographic truth" and 91 calling a record "tamper-proof" — the two phrases this
// estate removed from its own pages in October and kept banning. A phrase nobody reads
// after it ships is a phrase that comes back.
//
// The guard reads the public rows with the public anon key, so CI needs no secret and
// the table it measures is the table the public reads.
//
// Usage:  node scripts/article-claims-check.mjs
// Exit 0 - no published article carries a banned claim.
// Exit 1 - a banned claim is published, or the table could not be read. A guard that
//          could not read the table has checked nothing, so it is a failure, not a pass.
//
// Options: --report  print the per-phrase counts and every offending slug, do not fail
//                   (for measuring before a fix).

import { readFileSync } from 'node:fs';

const SITE = process.argv[3] || 'https://www.ai-governance-standard.com';
const REPORT_ONLY = process.argv.includes('--report');

// Claims the estate has measured false. Each entry states what the phrase asserts and
// what the product actually offers, because a guard without a reason is a superstition.
//
// An exemption is a sentence pattern that makes the phrase honest in that sentence.
// "Certified compliant" appears once on this estate, inside a sentence telling readers
// NOT to write "certified compliant" — banning it there would ban the correction. A
// phrase that is only ever wrong in the sentence where it is quoted as an example is
// not a phrase to police.
const NEVER = [
  ['cryptographic truth', /cryptographic truth/gi,
    'a receipt proves an event happened and was signed; it cannot make a claim true'],
  ['tamper-proof', /tamper[-\s]proof/gi,
    'nothing here is tamper-proof; a record is tamper-evident — any change breaks the hash and the signature'],
  ['irrefutable', /irrefutab\w*/gi,
    'nothing we issue is irrefutable; a hosted receipt proves publication and integrity, not the publisher’s identity'],
  ['indisputable', /indisputab\w*/gi,
    'same claim: we publish the key and the roots so a third party can check, not so they can be told'],
  ['unbreakable', /unbreakable/gi,
    'a signature is not unbreakable; it is checkable by anyone who holds the key'],
  ['flawless', /flawless/gi,
    'nothing is flawless, and a page that says so has not been measured',
    /\bnot compliance\b|\bnot certify\b|\bproves integrity\b/i],
  ['world’s first', /world'?s first/gi,
    'an unprovable priority claim'],
  ['certified compliant', /certified compliant/gi,
    'nobody is certified compliant by a receipt',
    /\brather than\b|\binstead of\b|\bshould not\b|\bmust not\b|\bavoid\b|\bdo not\b|\bnever\b/i],
  ['compliant by design', /compliant by design/gi,
    'a receipt does not make a system compliant; it makes the record checkable'],
  ['trustworthy and compliant', /trustworthy[^.\n]{0,30}\band\s+compliant/gi,
    'the product does not deliver compliance, so it cannot be advertised as delivering it'],
  ['absolute certainty', /absolute certainty/gi,
    'we publish evidence, not certainty',
    /\bdifficult to\b|\bwithout\b|\bcannot\b|\bimpossible\b|\bhard to\b/i],
];

// The fields a reader reads. `keywords` is read by crawlers; `slug` is in the URL.
const FIELDS = ['title', 'description', 'keywords', 'content_md'];

// Slugs are URLs a stranger sees and a crawler indexes.
const BANNED_SLUG_TOKENS = ['cryptographic-truth', 'digital-truth', 'tamper-proof', 'unbreakable'];
const BANNED_SLUG = new RegExp(BANNED_SLUG_TOKENS.join('|'), 'i');

// When a correction renames an article, the old address must keep working, so the site
// keeps a rewrite table. A banned word in a slug with no entry in that table is a URL
// that will 404 for everyone who already has it, so it is a finding of its own.
const SLUG_REWRITE_RULES = (() => {
  try {
    const src = readFileSync(new URL('../src/lib/article-slug.ts', import.meta.url), 'utf8');
    const rules = new Map();
    for (const m of src.matchAll(/\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\]/g)) rules.set(m[1], m[2]);
    return rules;
  } catch {
    return new Map();
  }
})();

// ---------------------------------------------------------------- credentials

async function fromEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.APEX_SUPABASE_ANON_KEY;
  if (url && key) return { url, key, from: 'environment' };
  return null;
}

// The publishable key is public by design: it ships inside the served bundle for every
// visitor. Reading it back from the bundle is not a secret extraction — it is reading
// the same file a browser reads — and it means CI needs no credential at all.
async function fromServedBundle() {
  const headers = { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' };
  const html = await fetch(`${SITE}/?t=${Date.now()}`, { headers }).then((r) => r.text());
  const name = [...new Set([...html.matchAll(/assets\/(index-[A-Za-z0-9_-]+\.js)/g)].map((m) => m[1]))][0];
  if (!name) return null;
  const js = await fetch(`${SITE}/assets/${name}?t=${Date.now()}`, { headers }).then((r) => r.text());
  const url = (js.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/) || [])[0];
  if (!url) return null;
  for (const j of new Set(js.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) || [])) {
    let payload = '';
    try {
      payload = Buffer.from(j.split('.')[1], 'base64url').toString('utf8');
    } catch {
      continue;
    }
    if (/"iss"\s*:\s*"supabase"/.test(payload) && /"role"\s*:\s*"anon"/.test(payload)) {
      return { url, key: j, from: 'the served bundle' };
    }
  }
  return null;
}

const creds = (await fromEnv()) || (await fromServedBundle());
if (!creds) {
  console.log(
    'FAIL could not read the public Supabase address and anon key: neither the environment nor the served bundle carries them',
  );
  process.exit(1);
}
console.log(`supabase ${creds.url} (anon key from ${creds.from})`);

// ---------------------------------------------------------------- rows

const rest = async (path) => {
  const r = await fetch(`${creds.url}/rest/v1/${path}`, {
    headers: { apikey: creds.key, Authorization: `Bearer ${creds.key}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

let rows;
try {
  rows = await rest('seo_articles?select=*&published=eq.true&limit=5000');
} catch (e) {
  console.log(`FAIL cannot read the published articles: ${e.message}`);
  process.exit(1);
}
console.log(`published articles: ${rows.length}`);
if (!rows.length) {
  console.log('no published articles — nothing to read');
  process.exit(1);
}

const textOf = (r) =>
  FIELDS.map((f) => (typeof r[f] === 'string' ? r[f] : Array.isArray(r[f]) ? r[f].join(', ') : ''))
    .filter(Boolean)
    .join('\n');

const sentenceAround = (text, index) => {
  const start = Math.max(0, text.lastIndexOf('.', index - 1) + 1);
  const stop = text.indexOf('.', index);
  return text.slice(start, stop === -1 ? text.length : stop + 1);
};

// ---------------------------------------------------------------- scan

const findings = [];
for (const row of rows) {
  const slug = row.slug || '(no slug)';
  const body = textOf(row);
  for (const [label, re, why, exempt] of NEVER) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(body)) !== null) {
      if (exempt) {
        const sentence = sentenceAround(body, m.index);
        if (exempt.test(sentence)) continue;
      }
      findings.push({ label, why, slug, sample: m[0] });
    }
  }
  if (BANNED_SLUG.test(row.slug || '')) {
    findings.push({
      label: 'banned word in the URL',
      why: 'a slug is a URL a stranger reads and a crawler indexes',
      slug,
      sample: row.slug,
    });
    const token = BANNED_SLUG_TOKENS.find((t) => (row.slug || '').toLowerCase().includes(t));
    if (token && !SLUG_REWRITE_RULES.has(token)) {
      findings.push({
        label: 'banned word in the URL with no redirect rule',
        why: 'an old address would 404 once the correction renames the article; add the token to src/lib/article-slug.ts',
        slug,
        sample: token,
      });
    }
  }
}

if (REPORT_ONLY) {
  const byLabel = new Map();
  for (const f of findings) {
    if (!byLabel.has(f.label)) byLabel.set(f.label, []);
    byLabel.get(f.label).push(f);
  }
  console.log(`\n=== banned claims across ${rows.length} articles ===`);
  if (!byLabel.size) console.log('  clean');
  for (const [label, list] of [...byLabel.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${label}: ${list.length} hit(s) in ${new Set(list.map((f) => f.slug)).size} article(s)`);
    for (const f of list.slice(0, 5)) console.log(`      ${f.slug} — ${JSON.stringify(f.sample)}`);
    if (list.length > 5) console.log(`      ... +${list.length - 5} more`);
  }
  console.log(`\ntotal findings: ${findings.length}`);
  process.exit(0);
}

if (findings.length) {
  const byLabel = new Map();
  for (const f of findings) {
    if (!byLabel.has(f.label)) byLabel.set(f.label, []);
    byLabel.get(f.label).push(f);
  }
  for (const [label, list] of [...byLabel.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`FAIL ${label}: ${list.length} hit(s) — ${list[0].why}`);
    for (const f of list.slice(0, 8)) console.log(`      ${f.slug} — ${JSON.stringify(f.sample)}`);
    if (list.length > 8) console.log(`      ... +${list.length - 8} more`);
  }
  console.log(`\narticle-claims-check: ${findings.length} finding(s) across ${rows.length} published articles.`);
  process.exit(1);
}
console.log('\narticle-claims-check: no published article carries a banned claim.');
