// Prove the LIVE STATIC FILES equal the ones in this repository.
//
// Why this exists: live-copy-check.mjs reads the served JS bundle, which is where every
// React sentence lives. It cannot see public/*.txt — and public/llms.txt is exactly where a
// false standards claim survived. It still told readers that "draft-singh-psi-http is in
// preparation and has not been filed" on 21 Oct 2026, five days after we measured all five
// drafts returning HTTP 200 and corrected nineteen HTML surfaces. A machine-readable surface
// that no guard reads is a surface that drifts.
//
// Usage:  node scripts/static-copy-check.mjs
// Exit 0 - every watched static file on both domains is byte-identical to its committed copy.
// Exit 3 - a file differs: either the site has not been republished from main, or the live copy
//          has drifted away from the repo. Both are reportable; neither is a pass.
// Exit 1 - a fetch failed, a committed copy is missing, or the live copy carries a claim on the
//          never-again list.
// 3 rather than 2 on purpose: 2 already means "the guard could not run" to commerce-truth-check
// and to the morning scan, and "not published yet" is a different fact from "cannot check".

import { homedir } from "node:os";
import { join } from "node:path";

// Every surface that a stranger or a model can read and quote, paired with the repository folder
// that is its source of truth. Both pairs are asserted, because the domains ship different files:
// SELF_AUDIT.md exists only on the flagship, llms-full.txt only on the standard domain. This
// distinction is the whole reason for the table — on 2 Nov this guard was given SELF_AUDIT.md to
// watch while still defaulting to the standard domain, so it compared a flagship file against
// `public/` in whatever folder the scan happened to launch it from, reported "publish pending" and
// could never have cleared. A guard that checks file X on the site that does not serve X is red
// forever, and a permanently red guard is the same as no guard.
const SURFACES = [
  {
    site: "https://apex-infrastructure.com",
    dir: join(homedir(), ".openhands", "apex-infra-site", "public"),
    files: ["llms.txt", "SELF_AUDIT.md"],
    cards: [".well-known/mcp/server.json"],
  },
  {
    site: "https://www.ai-governance-standard.com",
    dir: join(homedir(), ".openhands", "psi-hub-merge", "public"),
    files: ["llms.txt", "llms-full.txt"],
    cards: [".well-known/mcp/server.json", ".well-known/mcp/server-card.json"],
    // The hosted connector's card carries claims only this domain makes (tool set, OAuth, npm door).
    deepCards: true,
  },
];

// Claims that are false today, asserted against the LIVE bytes whatever else happens,
// so a republish cannot smuggle them back.
const MUST_NOT = [
  ['llms.txt', ['has not been filed', 'in preparation and has not been filed']],
];

const headers = { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' };
let differs = 0;
let fatal = 0;

async function committedCopy(dir, file) {
  const { readFileSync } = await import("node:fs");
  try {
    return readFileSync(join(dir, file), "utf8");
  } catch {
    return null;
  }
}

for (const surface of SURFACES) {
  for (const file of surface.files) {
    const res = await fetch(`${surface.site}/${file}?t=${Date.now()}`, { headers }).catch(() => null);
    if (!res) {
      console.log(`FAIL ${file}: network (${surface.site})`);
      fatal++;
      continue;
    }
    const live = await res.text();
    if (res.status !== 200) {
      console.log(`MISSING ${file}: ${surface.site} answers HTTP ${res.status} (not published yet)`);
      differs++;
      continue;
    }
    const local = await committedCopy(surface.dir, file);
    if (local === null) {
      console.log(`FAIL ${file}: no committed copy under ${surface.dir}`);
      fatal++;
      continue;
    }
    const norm = (s) => s.replace(/\r\n/g, "\n");
    if (norm(live) === norm(local)) {
      console.log(`MATCH ${file}: ${surface.site.replace(/^https:\/\//, "")} equals committed (${live.length} B)`);
    } else {
      const first = (norm(live).split("\n").findIndex((l, i) => l !== norm(local).split("\n")[i]));
      console.log(`DRIFT ${file}: live ${live.length} B vs committed ${norm(local).length} B — first difference at line ${first + 1}. Either the site has not been republished from main, or the live copy drifted.`);
      differs++;
    }
    for (const [target, needles] of MUST_NOT) {
      if (target !== file) continue;
      for (const needle of needles) {
        const hits = live.split(needle).length - 1;
        if (hits > 0) {
          console.log(`FAIL ${file}: ${surface.site} serves a claim we measured false — "${needle}" x${hits}`);
          fatal++;
        }
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

for (const surface of SURFACES) for (const card of surface.cards) {
  const res = await fetch(`${surface.site}/${card}?t=${Date.now()}`, { headers }).catch(() => null);
  if (!res) {
    console.log(`FAIL ${card}: network (${surface.site})`);
    fatal++;
    continue;
  }
  if (res.status !== 200) {
    console.log(`MISSING ${card}: ${surface.site} answers HTTP ${res.status} (not published yet)`);
    differs++;
    continue;
  }
  const live = await res.text();
  const local = await committedCopy(surface.dir, card);
  if (local === null) {
    console.log(`FAIL ${card}: no committed copy under ${surface.dir}`);
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
  // Only the standard domain's cards make those claims; the flagship's server.json is a different
  // document and asserting this set against it would be the guard inventing a defect.
  if (surface.deepCards) {
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
  } else {
    console.log(`CHECKED ${card}: ${surface.site.replace(/^https:\/\//, "")} serves it and it matches the repository (tools [${liveNames}] @ ${L.version})`);
  }
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
