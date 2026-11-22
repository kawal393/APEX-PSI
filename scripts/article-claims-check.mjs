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
//          --after-fix  scan what the corpus WOULD say once the fix table is applied in
//                   memory, and write nothing. This is how the fix is proven to clear the
//                   guard before anyone spends a write key on it.

import { readFileSync } from 'node:fs';
import { RULES, applyCopyRules, articleDisagreements } from './article-copy-rules.mjs';

const SITE = process.argv[3] || 'https://www.ai-governance-standard.com';
const REPORT_ONLY = process.argv.includes('--report');
const AFTER_FIX = process.argv.includes('--after-fix');

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
  ["world’s first", /world['’]?s first/gi,
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

// ---------------------------------------------------------------- scan, as one function

const textOf = (r) =>
  FIELDS.map((f) => (typeof r[f] === 'string' ? r[f] : Array.isArray(r[f]) ? r[f].join(', ') : ''))
    .filter(Boolean)
    .join('\n');

const sentenceAround = (text, index) => {
  const start = Math.max(0, text.lastIndexOf('.', index - 1) + 1);
  const stop = text.indexOf('.', index);
  return text.slice(start, stop === -1 ? text.length : stop + 1);
};

/** Every banned claim one row carries. Pure: no network, no table, so the self-test can drive it. */
function findClaims(row) {
  const out = [];
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
      out.push({ label, why, slug, sample: m[0] });
    }
  }
  if (BANNED_SLUG.test(row.slug || '')) {
    out.push({
      label: 'banned word in the URL',
      why: 'a slug is a URL a stranger reads and a crawler indexes',
      slug,
      sample: row.slug,
    });
    const token = BANNED_SLUG_TOKENS.find((t) => (row.slug || '').toLowerCase().includes(t));
    if (token && !SLUG_REWRITE_RULES.has(token)) {
      out.push({
        label: 'banned word in the URL with no redirect rule',
        why: 'an old address would 404 once the correction renames the article; add the token to src/lib/article-slug.ts',
        slug,
        sample: token,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------- self-test

// A guard that has never been shown to catch anything is a number that happens to be
// small. This drives every banned phrase through the scanner in isolation, proves the
// exemption sentences are exemptions and not mute buttons, and — the part that matters
// today — proves the substitution table handed to apexmuse actually clears this guard.
// It reads no table and no network, so it runs in CI with no credential.
if (process.argv.includes('--self-test')) {
  const SAMPLES = {
    'cryptographic truth': 'This page offers cryptographic truth for every AI decision.',
    'tamper-proof': 'Our logs are tamper-proof by design.',
    irrefutable: 'The receipt is irrefutable evidence of the run.',
    indisputable: 'An indisputable record of what the model did.',
    unbreakable: 'An unbreakable signature over the payload.',
    flawless: 'A flawless audit of the pipeline.',
    "world’s first": 'The EU wrote the world’s first comprehensive AI law.',
    'certified compliant': 'The vendor claims certified compliant status.',
    'compliant by design': 'A system that is compliant by design and nothing else.',
    'trustworthy and compliant': 'Trustworthy and compliant AI for the enterprise.',
    'absolute certainty': 'We state the outcome with absolute certainty.',
  };
  const EXEMPT_SENTENCES = {
    flawless: 'Do not call a receipt flawless — it proves integrity, not correctness.',
    'certified compliant': 'A receipt is issued rather than a seal that makes you certified compliant.',
    'absolute certainty': 'Historical contexts cannot be reconstructed with absolute certainty.',
  };
  let bad = 0;
  const fail = (msg) => {
    console.log(`  SELFTEST FAIL ${msg}`);
    bad++;
  };

  for (const [label] of NEVER) {
    const s = SAMPLES[label];
    if (!s) {
      fail(`no sample sentence for "${label}" — this rule is unproven`);
      continue;
    }
    const hits = findClaims({ slug: 'self-test', title: s, content_md: s }).filter((f) => f.label === label);
    if (!hits.length) fail(`"${label}" did not fire on its own sample — the regex is blind`);
  }

  for (const [label, , , exempt] of NEVER) {
    if (!exempt) continue;
    const s = EXEMPT_SENTENCES[label];
    if (!s) {
      fail(`rule "${label}" has an exemption nobody wrote a sentence for`);
      continue;
    }
    if (findClaims({ slug: 'self-test', title: s, content_md: s }).some((f) => f.label === label))
      fail(`exemption for "${label}" does not exempt — the rule would ban its own correction`);
  }

  const honest = 'The receipt is tamper-evident and independently verifiable against the published key.';
  for (const f of findClaims({ slug: 'honest-copy', title: honest, content_md: honest }))
    fail(`honest copy was flagged: ${f.label} on "${f.sample}"`);

  const redirected = findClaims({ slug: 'cryptographic-truth-proving-ai-actions' });
  if (!redirected.some((f) => f.label === 'banned word in the URL')) fail('a banned slug token went unseen');
  if (redirected.some((f) => f.label.includes('no redirect rule')))
    fail('cryptographic-truth is in the rewrite table yet reported as having none');
  const orphan = findClaims({ slug: 'tamper-proof-ai-logs' });
  if (!orphan.some((f) => f.label === 'banned word in the URL with no redirect rule'))
    fail('a slug token with no redirect rule passed silently — an old URL would 404 after the rename');

  // The substitutions the fix writes are imported from the same module the fix uses, so
  // this proves the table that ships, not a copy of it that could drift.
  const rules = RULES;
  const applyFix = (t) => applyCopyRules(t);
  for (const [label] of NEVER) {
    const s = SAMPLES[label];
    if (!s) continue;
    const after = applyFix(s);
    const left = findClaims({ slug: 'self-test', title: after, content_md: after }).filter((f) => f.label === label);
    if (left.length) fail(`the handed table does not clear "${label}": "${after}" still flags "${left[0].sample}"`);
  }
  // The priority claim reaches us in two typographic forms, and until 22 Nov 2026 the
  // regex carried only the straight apostrophe while the generated copy carried the curly
  // one — a banned phrase the guard could read but never see. Both forms are driven here.
  for (const form of ["the world's first AI ministry", 'the world’s first AI ministry']) {
    if (!findClaims({ slug: 'self-test', title: form, content_md: form }).some((f) => f.label === 'world’s first'))
      fail(`the priority claim went unseen in this form: ${form}`);
    const after = applyFix(form);
    if (findClaims({ slug: 'self-test', title: after, content_md: after }).some((f) => f.label === 'world’s first'))
      fail(`the handed table leaves the priority claim standing: ${after}`);
  }

  for (const [, to] of rules) {
    const introduced = findClaims({ slug: 'self-test', title: to, content_md: to });
    if (introduced.length)
      fail(`a replacement text is itself banned: "${to}" flags ${introduced.map((f) => f.label).join(', ')}`);
  }

  // The article before a rewritten phrase has to agree with the phrase that replaced it.
  // "an unbreakable chain" is grammatical and "an tamper-evident chain" is not, and the
  // published corpus contains that shape — so every substitution pair is driven through
  // both articles and the output must read correctly either way.
  const wantArticle = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');
  for (const [from, to] of RULES) {
    for (const given of ['a', 'an', 'A', 'An']) {
      const after = applyCopyRules(`${given} ${from} chain of trust`);
      const got = (after.match(/^(a|an)\b/i) || [])[1];
      if (!got) {
        fail(`rewriting "${given} ${from}" lost the article: "${after}"`);
        continue;
      }
      if (got.toLowerCase() !== wantArticle(to)) {
        fail(`article agreement broken: "${given} ${from} chain" -> "${after}" — "${to}" wants "${wantArticle(to)}"`);
      }
    }
  }

  console.log(
    bad
      ? `\nSELFTEST FAIL — ${bad} problem(s). The guard or the handed table cannot bite, so a green run would mean nothing.`
      : `\nSELFTEST PASS — ${NEVER.length} phrase rules fire, ${Object.keys(EXEMPT_SENTENCES).length} exemptions hold, honest copy passes, both slug cases fire, ${RULES.length} substitutions clear this guard and keep "a"/"an" agreeing with what they write.`,
  );
  process.exit(bad ? 1 : 0);
}


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

// ---------------------------------------------------------------- scan

/**
 * One row exactly as the fix would write it — the same imported table, the same slug
 * rewrites, no network and no write. The point of running this BEFORE a fix is that
 * "the guard will pass afterwards" stops being a belief about 193 substitutions and
 * becomes a measured number over the 1,000 rows that are really published.
 */
function asFixed(row) {
  const out = { ...row };
  for (const f of FIELDS) {
    if (typeof out[f] === 'string') out[f] = applyCopyRules(out[f]);
    else if (Array.isArray(out[f])) out[f] = out[f].map((k) => (typeof k === 'string' ? applyCopyRules(k) : k));
  }
  if (typeof out.slug === 'string') {
    for (const [from, to] of SLUG_REWRITE_RULES) out.slug = out.slug.split(from).join(to);
  }
  return out;
}

const scanned = AFTER_FIX ? rows.map(asFixed) : rows;
if (AFTER_FIX) {
  console.log(`--after-fix: scanning ${rows.length} rows AS THE FIX WOULD WRITE THEM (nothing is published by this run)`);
  // A correction that replaces a false claim with broken English is a new defect, not a
  // fix, so the projection counts the article disagreements the table would introduce.
  // Measured 22 Nov 2026: 0 across the 1,000 live rows.
  const grammar = [];
  for (const row of scanned) grammar.push(...articleDisagreements(textOf(row)));
  console.log(`  "a"/"an" disagreements introduced by the table: ${grammar.length}${grammar.length ? ` — ${grammar.slice(0, 5).join(' | ')}` : ''}`);
  if (grammar.length) {
    console.log('FAIL the substitution table breaks article agreement, so the rewrite must not ship as it is');
    process.exit(1);
  }
}

const findings = [];
for (const row of scanned) findings.push(...findClaims(row));

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
