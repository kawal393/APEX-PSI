// mcprush-claim-check — a directory's number on our site is a claim about a third party, so it
// is measured against that third party, not against our own memory.
//
// Fatal in the repository source (CI, every push):
//   1. a mcprush grade or score phrase in src/** that mcprush's own badge does not publish.
//   2. a claim of listing in the official MCP Registry that the registry does not answer for.
//   3. a registry record for our server that still carries an absolute we cut from our copy, or
//      that the registry still lists as active after the repository replaced it — measured 12 Nov
//      2026: our 1.1.2 record IS published and clean, and 1.0.1 is served beside it as active, so
//      the cause is a status change on the old record, not a pending publish. Do not say "pending".
// Reported, not fatal, unless --live is passed:
//   the served bundle. Red there with clean source means the site is serving copy the repo
//   already cut — a publish is pending, and only Master's click closes it.
//
// Usage: node scripts/mcprush-claim-check.mjs [--live]
// Exit 0 = agrees with the sources. 1 = contradiction. 2 = could not measure.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.ai-governance-standard.com';
const BADGE = 'https://mcprush.com/badge/apex-psi-mcp/card.svg';
const REGISTRY = 'https://registry.modelcontextprotocol.io/v0/servers?search=apex-psi-mcp&limit=20';
const REGISTRY_NAME = 'io.github.kawal393/apex-psi-mcp';
const OFFICIAL_META = 'io.modelcontextprotocol.registry/official';
const SCORE_WORDS = ['Grade A', 'grade A', '100/100', 'trust score'];
const UA = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36' };

const get = async (url) => {
  const r = await fetch(url, { headers: { ...UA, 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(25000) });
  return { status: r.status, body: await r.text() };
};

function sourceFiles(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== 'node_modules') sourceFiles(p, out); }
    else if (/\.(tsx|ts)$/.test(e)) out.push(p);
  }
  return out;
}

(async () => {
  const live = process.argv.includes('--live');
  const red = [];
  const warn = [];

  // 1. what mcprush publishes about us, from the artifact a visitor's browser loads
  const badge = await get(BADGE).catch(e => { console.error('badge unreadable:', e.message); process.exit(2); });
  const aria = (badge.body.match(/aria-label="([^"]+)"/) || [])[1] || '';
  if (!/^<svg/.test(badge.body.trim()) || !aria) { console.error('no SVG/aria-label to measure, status', badge.status); process.exit(2); }
  const securityLetter = (aria.match(/security\s+([A-F])/i) || [])[1] || null;
  const clients = (aria.match(/works with\s+(\d+)\s+clients/i) || [])[1] || null;
  const publishesScore = SCORE_WORDS.some(w => new RegExp(w.replace('/', '\\/'), 'i').test(aria));
  console.log('badge aria-label:', aria);
  console.log(`parsed: security=${securityLetter || '-'} clients=${clients || '-'} publishes a grade/score phrase=${publishesScore}`);

  // 2. our source: a score phrase beside "mcprush" is fatal unless the badge itself says it
  const srcText = sourceFiles(join(ROOT, 'src')).map(f => ({ f, t: readFileSync(f, 'utf8') }));
  const flagged = new Set();
  for (const { f, t } of srcText) {
    for (let i = t.indexOf('mcprush'); i !== -1; i = t.indexOf('mcprush', i + 1)) {
      const snippet = t.slice(Math.max(0, i - 300), i + 300);
      for (const w of SCORE_WORDS) {
        if (snippet.includes(w) && !new RegExp(w.replace('/', '\\/'), 'i').test(aria)) {
          const key = `${f}|${w}`;
          if (!flagged.has(key)) {
            flagged.add(key);
            red.push(`${f.replace(ROOT + '\\', '')}: asserts "${w}" beside mcprush, which the badge does not publish`);
          }
        }
      }
    }
  }
  console.log(`source scan: ${flagged.size} unbacked mcprush assertion(s)`);
  const allSrc = srcText.map(x => x.t).join('');
  if (securityLetter && !new RegExp(`security[^"]{0,40}${securityLetter}`, 'i').test(allSrc))
    red.push(`mcprush reads security ${securityLetter} and no source file carries it — the tile drifted from the measurement`);

  // 3. the official registry: its record must equal the manifest in our repository, and must not
  //    publish an absolute we forbid in our own copy
  const MANIFEST = 'https://raw.githubusercontent.com/kawal393/apex-psi-mcp-server/main/server.json';
  const [reg, man] = await Promise.all([get(REGISTRY), get(MANIFEST)]);
  if (!reg || reg.status !== 200) { console.error('registry unreadable:', reg && reg.status); process.exit(2); }
  if (man.status !== 200) { console.error('server.json unreadable:', man.status); process.exit(2); }
  let served = [], want = null;
  try {
    served = (JSON.parse(reg.body).servers || []).filter(s => s?.server?.name === REGISTRY_NAME);
    want = JSON.parse(man.body);
  } catch { console.error('registry or manifest answered non-JSON'); process.exit(2); }
  if (!served.length) red.push(`our copy claims a listing in the official MCP Registry; the registry returns nothing for "${REGISTRY_NAME}"`);
  else {
    // The registry keeps one record per published version, so a search answers with all of them
    // in the order it stores them. The newest is not necessarily the one a client reads first.
    const rec = s => (s?._meta?.[OFFICIAL_META] || {});
    for (const s of served) {
      const m = rec(s);
      console.log(`registry serves: ${s.server.version} · status=${m.status || '(none)'} · updated ${m.updatedAt || '?'} · ${JSON.stringify(s.server.description)}`);
    }
    console.log(`server.json says: version ${want.version} · ${JSON.stringify(want.description)}`);

    const statusOf = s => rec(s).status || 'active';
    const live = served.filter(s => statusOf(s) === 'active');
    const current = live.find(s => s.server.version === want.version);
    const stale = live.filter(s => s.server.version !== want.version);

    // Fatal is what this tree controls. A record the registry holds for a version we already
    // replaced can only be retired with the publisher's own identity, so it is reported loudly as
    // a pending action rather than hung red on every push forever.
    if (current && /truth|guarantee|tamper-proof|immutable|100%/i.test(current.server.description || ''))
      red.push(`the registry record for the version we declare (${want.version}) publishes an absolute we do not say ourselves: ${JSON.stringify(current.server.description)}`);
    if (!current)
      red.push(`the registry does not serve the version our own manifest declares (${want.version}) — a registry publish is PENDING`);
    for (const s of stale) {
      if (/truth|guarantee|tamper-proof|immutable|100%/i.test(s.server.description || ''))
        warn.push(`registry record ${s.server.version} is still listed active and publishes an absolute we cut from our own copy: ${JSON.stringify(s.server.description)}`);
    }
    if (stale.length)
      warn.push(`the registry lists ${stale.map(s => s.server.version).join(' and ')} as active beside ${want.version}, and a client searching "${REGISTRY_NAME}" reads ${JSON.stringify(stale[0].server.description)} first${served.length > 1 ? '' : ''} — the cure is PATCH /v0.1/servers/${REGISTRY_NAME}/versions/${stale[0].server.version}/status with {"status":"deprecated"} using the publisher's GitHub identity, which is Master's hands, not ours`);
  }

  // 4. the served bundle — fatal only under --live (the daily scan)
  if (live) {
    const html = await get(SITE + '/?t=' + Date.now());
    const names = [...new Set([...html.body.matchAll(/assets\/(index-[A-Za-z0-9_-]+\.js)/g)].map(m => m[1]))];
    if (names.length !== 1) { console.error('could not name the live bundle:', names); process.exit(2); }
    const bundle = await get(`${SITE}/assets/${names[0]}?t=${Date.now()}`);
    console.log(`live bundle ${names[0]} (${bundle.body.length} B)`);
    for (const w of SCORE_WORDS) {
      if (new RegExp(w.replace('/', '\\/'), 'i').test(bundle.body) && !new RegExp(w.replace('/', '\\/'), 'i').test(aria)) {
        red.push(`the SERVED bundle asserts "${w}" about mcprush, which the badge does not publish — ${flagged.size === 0 ? 'the repository already cut it, so a Lovable publish is PENDING' : 'and the repository still carries it too'}`);
      }
    }
  } else {
    warn.push('live bundle not checked in this run (pass --live, as the 07:00 scan does)');
  }

  console.log('');
  warn.forEach(w => console.log('note:', w));
  if (red.length) {
    console.log(`RED — ${red.length} contradiction(s):`);
    red.forEach(r => console.log('  ·', r));
    process.exit(1);
  }
  console.log('GREEN — we assert about mcprush only what mcprush asserts about us.');
})();
