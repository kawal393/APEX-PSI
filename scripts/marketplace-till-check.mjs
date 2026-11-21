#!/usr/bin/env node
// marketplace-till-check — the site may call an external page a purchase route
// only when our own code can honour the sale.
//
// Measured 22 Nov 2026, after Master clicked "Or buy Pro on RapidAPI":
//   * the address is not dead — the page renders BASIC $0.00 / PRO $11.00 /
//     ULTRA $55.00 and its configured backend is our own Supabase host.
//   * an HTTP status proves nothing about a marketplace page. A URL invented on
//     the spot — /this-does-not-exist-qq9x/api/no-such-api-qq9x/pricing — also
//     answers HTTP 200 with 230 KB, reflects the invented slug back into its own
//     body, and carries "not found" exactly like ours does. So G1 matches on the
//     backend address the listing is wired to, which no echo can manufacture.
//   * what did break is behind the page: no function under supabase/functions
//     reads a marketplace credential, so a subscription bought there never
//     reaches the tier table in _shared/tiers.ts. The buyer pays the marketplace,
//     our hosted doors still answer them at the public allowance, and the page
//     they bought from advertises 500,000 requests a month we never promised.
//
// A till we cannot provision is a listing, not a purchase. This gate keeps the
// copy at exactly that distinction.
//
// Usage: node scripts/marketplace-till-check.mjs [--live] [--self-test]
// Exit 0 = every advertised marketplace agrees with what the code can do.
// Exit 1 = a sentence promises a purchase the estate cannot deliver.
// Exit 2 = could not measure.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LIVE = process.argv.includes('--live');
const SELF_TEST = process.argv.includes('--self-test');
const SITE = 'https://www.ai-governance-standard.com';

const HOSTS = ['rapidapi.com', 'aws.amazon.com/marketplace', 'azure.microsoft.com/marketplace', 'console.cloud.google.com/marketplace'];
// Purchase wording aimed at a marketplace page.
const BUY_VERB = /\b(?:buy|purchase|subscribe to|order)\b[^<]{0,40}\b(?:on|through|via|at|in)\b[^<]{0,24}(?:rapidapi|marketplace)/i;
const CLAIM = /\b(?:sold|offered)\b[^<]{0,80}marketplace/i;
// Wording that is true while we cannot provision a marketplace sale.
const INFORMATIONAL = /listed on|listing|published|view the|reference/i;

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const texts = walk(path.join(ROOT, 'src')).map((f) => [path.relative(ROOT, f), fs.readFileSync(f, 'utf8')]);

if (LIVE) {
  const html = await (await fetch(SITE + '/?t=' + Date.now(), { headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' } })).text();
  const names = [...new Set([...html.matchAll(/assets\/(index-[A-Za-z0-9_-]+\.js)/g)].map((m) => m[1]))];
  if (names.length !== 1) { console.error('could not name the live bundle:', names); process.exit(2); }
  const bundle = await (await fetch(`${SITE}/assets/${names[0]}?t=${Date.now()}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
  texts.push([`LIVE BUNDLE ${names[0]} (${bundle.length} B)`, bundle]);
}

// G3: what can our code actually do with a marketplace sale? The credential a
// gateway forwards, or a webhook the marketplace calls on subscribe — either
// one has to land somewhere in the functions we ship.
const fnText = walk(path.join(ROOT, 'supabase', 'functions')).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const mentionsMarketplace = /rapidapi|aws marketplace|azure marketplace/i.test(fnText);
const readsCredential = /x-rapidapi-key|x-rapidapi-value|x-rapidapi-signature|rapidapi.*webhook|webhook.*rapidapi/i.test(fnText);
const canSell = mentionsMarketplace && readsCredential;
console.log(`G3 PROVISIONS-A-MARKETPLACE-SALE : ${canSell ? 'YES' : 'NO'} — functions mention a marketplace: ${mentionsMarketplace ? 'yes' : 'no'}, read its credential or webhook: ${readsCredential ? 'yes' : 'no'}`);

const marketplaceUrls = new Set();
for (const [, text] of texts) {
  for (const m of text.matchAll(/https?:\/\/[^\s"'`)\\\]]+/g)) {
    if (HOSTS.some((h) => m[0].includes(h))) marketplaceUrls.add(m[0]);
  }
}
console.log(`marketplace URLs advertised in the copy: ${marketplaceUrls.size}`);

// The marker a marketplace listing can only carry by being ours: the backend
// address the provider configured on it. Read from our own tracked record, so
// this never hardcodes a host that has moved. It is deliberately NOT the
// requested path — measured below, RapidAPI reflects any path back into the
// page body, so matching on the slug proves nothing.
const PROTOCOL_FILE = path.join(ROOT, 'public', '.well-known', 'apex-protocol.json');
const backendHost = fs.existsSync(PROTOCOL_FILE)
  ? ((fs.readFileSync(PROTOCOL_FILE, 'utf8').match(/https:\/\/([a-z0-9_-]+)\.supabase\.co/i) || [])[1] ?? null)
  : null;
if (!backendHost) { console.error('could not read our hosted backend from public/.well-known/apex-protocol.json'); process.exit(2); }
console.log(`hosted backend the estate publishes     : ${backendHost}.supabase.co`);

let bad = 0;
const fail = (m) => { bad++; console.log('VIOLATION      ' + m); };

for (const u of marketplaceUrls) {
  // G1 — the page must be a listing wired to our own backend, not merely a 200.
  let status = 'UNREACHABLE';
  let body = '';
  try {
    const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
    status = r.status;
    body = await r.text();
  } catch (e) { console.log(`  could not fetch ${u} — ${e.message.slice(0, 60)}`); }
  const ours = body.includes(`${backendHost}.supabase.co`);
  const alive = Number(status) === 200 && ours;
  console.log(`G1 TILL-ALIVE                    : ${alive ? 'OK' : 'DEAD'} — ${u} [http ${status}, page is wired to our backend: ${ours ? 'yes' : 'NO'}]`);
  if (!alive) fail(`the copy advertises ${u} but that page answers HTTP ${status} and is not a listing carrying our hosted backend — it is someone else's page, or nobody's`);
}

// G2 — purchase wording, file by file.
for (const [where, text] of texts) {
  const flat = text.replace(/\s+/g, ' ');
  const hit = flat.match(BUY_VERB) || flat.match(CLAIM);
  if (!hit) continue;
  const sentence = hit[0].trim().slice(0, 100);
  if (INFORMATIONAL.test(sentence)) continue;
  if (canSell) { console.log(`G2 BUY-WORDING                   : ok — ${where} sells "${sentence}" and the code provisions it`); continue; }
  fail(`${where} says "${sentence}" — a purchase we cannot deliver, because a marketplace sale is not provisioned (G3 NO). Say "listed", or accept its credential in a function.`);
}

if (SELF_TEST) {
  // Each rule has to be able to fail, or a PASS proves nothing.
  const fake = 'https://rapidapi.com/this-does-not-exist-qq9x/api/no-such-api-qq9x/pricing';
  const r = await fetch(fake, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const b = await r.text();
  const reflected = b.includes('no-such-api-qq9x');
  const caughtG1 = r.status === 200 && reflected && !b.includes(`${backendHost}.supabase.co`);
  const oldCopy = 'Or buy Pro on RapidAPI and get your key instantly';
  const trueCopy = 'The Pro plan is also listed on RapidAPI — capacity is issued here';
  const caughtG2 = !canSell && BUY_VERB.test(oldCopy);
  const staysGreen = !BUY_VERB.test(trueCopy) && !CLAIM.test(trueCopy);
  console.log(`SELF-TEST G1 : fabricated listing answered HTTP ${r.status} and the page reflected the invented slug back -> ${caughtG1 ? 'CAUGHT: a 200 would have passed it; the backend marker did not' : 'MISSED: this rule cannot see a dead page'}`);
  console.log(`SELF-TEST G2 : injected "${oldCopy}" -> ${caughtG2 ? 'CAUGHT' : 'MISSED'}`);
  console.log(`SELF-TEST G2 : true copy "${trueCopy}" -> ${staysGreen ? 'left alone, so the rule does not flatter itself' : 'FALSE POSITIVE: the rule would fail honest wording'}`);
  if (!caughtG1 || !caughtG2 || !staysGreen) { console.log('\nSELF-TEST FAILED — this guard is not measuring what it claims.'); process.exit(1); }
  console.log('\nSELF-TEST PASSED — both rules demonstrably fire and demonstrably spare true copy.');
}

console.log(bad ? `\nFAIL — ${bad} marketplace promise(s) the code cannot keep.` : '\nPASS — every advertised marketplace is stated at the strength our code can deliver.');
process.exit(bad ? 1 : 0);
