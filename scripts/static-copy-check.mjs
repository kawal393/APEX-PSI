// Prove the LIVE STATIC FILES equal the ones in this repository.
//
// Why this exists: live-copy-check.mjs reads the served JS bundle, which is where every
// React sentence lives. It cannot see public/*.txt — and public/llms.txt is exactly where a
// false standards claim survived. It still told readers that "draft-singh-psi-http is in
// preparation and has not been filed" on 21 Oct 2026, five days after we measured all five
// drafts returning HTTP 200 and corrected nineteen HTML surfaces. A machine-readable surface
// that no guard reads is a surface that drifts.
//
// Usage:  node scripts/static-copy-check.mjs [site]
// Exit 0 - every watched static file is byte-identical to the committed copy.
// Exit 3 - a file differs: either Lovable has not published main yet, or the live copy has
//          drifted away from the repo. Both are reportable; neither is a pass.
// Exit 1 - a fetch failed, or the live copy carries a claim on the never-again list.
// 3 rather than 2 on purpose: 2 already means "the guard could not run" to commerce-truth-check
// and to the morning scan, and "not published yet" is a different fact from "cannot check".

const SITE = process.argv[2] || 'https://www.ai-governance-standard.com';
const BASE = 'https://ai-governance-standard.com';

// Files in public/ that a stranger or a model can read and quote.
const WATCH = ['llms.txt', 'llms-full.txt'];

// Claims that are false today, asserted against the LIVE bytes whatever else happens,
// so a republish cannot smuggle them back.
const MUST_NOT = [
  ['llms.txt', ['has not been filed', 'in preparation and has not been filed']],
];

const headers = { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' };
let differs = 0;
let fatal = 0;

for (const file of WATCH) {
  const res = await fetch(`${BASE}/${file}?t=${Date.now()}`, { headers }).catch((e) => null);
  if (!res) {
    console.log(`FAIL ${file}: network`);
    fatal++;
    continue;
  }
  const live = await res.text();
  if (res.status !== 200) {
    console.log(`MISSING ${file}: HTTP ${res.status} (not published yet)`);
    differs++;
    continue;
  }
  let local = null;
  try {
    local = await Bun.file(`public/${file}`).text();
  } catch {
    const { readFileSync } = await import('node:fs');
    try {
      local = readFileSync(`public/${file}`, 'utf8');
    } catch {
      console.log(`FAIL ${file}: no committed copy to compare against`);
      fatal++;
      continue;
    }
  }
  const norm = (s) => s.replace(/\r\n/g, '\n');
  if (norm(live) === norm(local)) {
    console.log(`MATCH ${file}: live equals committed (${live.length} B)`);
  } else {
    console.log(`DRIFT ${file}: live ${live.length} B vs committed ${local.length} B`);
    differs++;
  }
  for (const [target, needles] of MUST_NOT) {
    if (target !== file) continue;
    for (const needle of needles) {
      const hits = live.split(needle).length - 1;
      if (hits > 0) {
        console.log(`FAIL ${file}: serves a claim we measured false — "${needle}" x${hits}`);
        fatal++;
      }
    }
  }
}

// The MCP discovery cards are read by agents, not by people, and nothing else in this
// suite looked at them — so on 22 Oct both cards could name six tools while this suite's own
// probe was declaring the remote they point at dead. The probe was the defect: that remote
// answers an anonymous caller with HTTP 401 plus `WWW-Authenticate: … resource_metadata="…"`,
// and the metadata document it points to resolves over HTTPS. That is the Model Context
// Protocol's correct handshake for an OAuth-protected resource server, not a bricked doorway —
// and this card IS the hosted connector's card, so its six hosted tool names belong here.
//
// Blanket-banning those names made the guard wrong in the opposite direction, which is the same
// defect class as over-claiming. What a guard must refuse is not a name, it is a MIX: one
// surface wearing the other surface's tool set, version, transport or auth story. A mixed card
// is precisely what a third-party directory copied off our own page and printed as "6 tools"
// next to an install command that delivers five.
//
// Compared semantically (version + tool names + description), not byte for byte, because these
// are machine files whose whitespace is not the claim.
const CARDS = ['.well-known/mcp/server.json', '.well-known/mcp/server-card.json'];
const CARD_MUST_NOT = ['Cryptographic open-standard evidence protocol'];
const HOSTED_SET = [
  'seal',
  'verify_hash',
  'anchor_status',
  'list_attestations',
  'ledger_stats',
  'protocol_info',
].sort().join(',');
const PACKAGE_SET = ['seal', 'verify', 'anchor', 'cite', 'verify_chain'].sort().join(',');
const HOSTED_REMOTE = 'https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/mcp';

for (const card of CARDS) {
  const res = await fetch(`${BASE}/${card}?t=${Date.now()}`, { headers }).catch(() => null);
  if (!res) {
    console.log(`FAIL ${card}: network`);
    fatal++;
    continue;
  }
  if (res.status !== 200) {
    console.log(`MISSING ${card}: HTTP ${res.status} (not published yet)`);
    differs++;
    continue;
  }
  const live = await res.text();
  const { readFileSync } = await import('node:fs');
  let local;
  try {
    local = readFileSync(`public/${card}`, 'utf8');
  } catch {
    console.log(`FAIL ${card}: no committed copy to compare against`);
    fatal++;
    continue;
  }
  const parse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  const L = parse(live);
  const C = parse(local);
  if (!L || !C) {
    console.log(`FAIL ${card}: ${!L ? 'live' : 'committed'} copy is not valid JSON`);
    fatal++;
    continue;
  }
  const liveNames = (L.tools || []).map((t) => t.name).sort().join(',');
  const repoNames = (C.tools || []).map((t) => t.name).sort().join(',');
  if (liveNames !== repoNames) {
    console.log(`DRIFT ${card}: live advertises [${liveNames}] but the repository ships [${repoNames}]`);
    differs++;
  }
  if (L.version !== C.version) {
    console.log(`DRIFT ${card}: live version ${L.version} vs committed ${C.version}`);
    differs++;
  }
  if (L.description !== C.description) {
    console.log(`DRIFT ${card}: the sentence an agent quotes is not the one in the repository`);
    differs++;
  }
  for (const needle of CARD_MUST_NOT) {
    if (live.includes(needle)) {
      console.log(`FAIL ${card}: serves a claim we measured false — "${needle}"`);
      fatal++;
    }
  }

  // Surface separation is the claim worth guarding. Top-level = the hosted connector; the npm
  // package lives under alternative_installs with its own names, version and "no account".
  if (liveNames !== HOSTED_SET) {
    console.log(`FAIL ${card}: top-level tools [${liveNames}] are not the hosted connector's measured set [${HOSTED_SET}]`);
    fatal++;
  }
  const alt = (L.alternative_installs || [])[0] || {};
  const altNames = (alt.tools || []).slice().sort().join(',');
  if (altNames !== PACKAGE_SET) {
    console.log(`FAIL ${card}: the npm door advertises [${altNames || 'nothing'}], the package answers [${PACKAGE_SET}]`);
    fatal++;
  }
  if (alt.auth !== 'none' || !alt.install || alt.install.command !== 'npx') {
    console.log(`FAIL ${card}: the npm door is not stated as a key-free npx install`);
    fatal++;
  }
  const remote = (L.remotes || [])[0] || {};
  if (remote.url !== HOSTED_REMOTE) {
    console.log(`FAIL ${card}: remote is ${remote.url || 'absent'}, not the deployed connector ${HOSTED_REMOTE}`);
    fatal++;
  }
  if (L.transport?.url !== HOSTED_REMOTE || L.transport?.type !== 'streamable-http') {
    console.log(`FAIL ${card}: transport does not name the hosted connector it describes`);
    fatal++;
  }
  if (L.auth?.type !== 'oauth2') {
    console.log(`FAIL ${card}: an OAuth server that does not say so — a reader will call it anonymously and take HTTP 401 as an outage`);
    fatal++;
  }
  if (!/OAuth/i.test(L.description || '')) {
    console.log(`FAIL ${card}: the description an agent quotes never mentions that the hosted door signs in`);
    differs++;
  }
  if (L.version !== C.version || C.version === alt.version) {
    console.log(`FAIL ${card}: version ${L.version} is not the hosted connector's own (the npm package's ${alt.version} belongs to the npm door)`);
    fatal++;
  }

  // The door must actually be behind the challenge it advertises, or the card is a promise.
  const probe = await fetch(HOSTED_REMOTE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'static-copy-check', version: '1' } } }),
  }).catch(() => null);
  if (!probe) {
    console.log(`FAIL ${card}: cannot probe the advertised remote`);
    fatal++;
  } else {
    const challenge = probe.headers.get('www-authenticate') || '';
    const pointer = (challenge.match(/resource_metadata="([^"]+)"/) || [])[1] || '';
    const metaOk = pointer
      ? (await fetch(pointer, { headers: { Accept: 'application/json' } }).catch(() => null))?.status === 200
      : false;
    if (!(probe.status === 401 && metaOk)) {
      console.log(`FAIL ${card}: advertised remote answers HTTP ${probe.status} with ${pointer ? `metadata HTTP ${metaOk ? 'ok' : 'unreachable'}` : 'no OAuth challenge'} — a 401 without a resolvable challenge is a door we cannot prove`);
      fatal++;
    } else {
      console.log(`PROVED ${card}: hosted remote challenges 401 and its resource_metadata resolves`);
    }
  }
  console.log(`CHECKED ${card}: hosted [${liveNames}] @ ${L.version} · npm [${altNames}] @ ${alt.version}`);
}

if (fatal) {
  console.log(`\nstatic-copy-check: ${fatal} fatal finding(s)`);
  process.exit(1);
}
if (differs) {
  console.log(`\nstatic-copy-check: ${differs} file(s) not yet matching main — publish pending, not a pass.`);
  process.exit(3);
}
console.log('\nstatic-copy-check: every watched static file is live and matches the repository.');
