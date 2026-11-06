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

// Every surface that a stranger or a model can read and quote, paired with the repository branch
// that is its source of truth. The branch, not the folder this script happens to sit in: measured
// on 6 Nov, ai-governance-standard.com serves content byte-identical to origin/main while the
// working branch was nine commits elsewhere — so a guard that reads the working tree reports
// "publish pending" for work that was never meant for the site, and stays silent about main
// actually drifting. Both errors are the guard's, not the estate's.
// Which branch a site publishes from is not a guess here: it is proved every run by finding the
// branch whose committed bytes equal the live bytes, and that proof is printed.
const SURFACES = [
  {
    site: "https://apex-infrastructure.com",
    repo: join(homedir(), ".openhands", "apex-infra-site"),
    branches: ["origin/main"],
    files: ["llms.txt", "SELF_AUDIT.md", "PROOF_COVERAGE.md"],
    cards: [".well-known/mcp/server.json"],
  },
  {
    site: "https://www.ai-governance-standard.com",
    repo: join(homedir(), ".openhands", "psi-hub-merge"),
    branches: ["origin/main", "origin/hub-merge", "origin/truth-badge-23oct"],
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
// The morning scan prints only a guard's LAST line. "1 fatal finding(s)" on its own therefore
// tells the reader nothing about what to fix, which is how a network miss stayed anonymous for a
// whole run. Every counted finding is named here and repeated on the summary line.
const notes = [];
const count = (kind, msg) => {
  if (kind === "fatal") fatal++; else differs++;
  notes.push(msg);
};
const fail = (msg) => {
  console.log(`FAIL ${msg}`);
  count("fatal", msg);
};
const sayDrift = (msg) => {
  console.log(`FAIL ${msg}`);
  count("differs", msg);
};

// One retry, two seconds later: these are fourteen HTTPS requests to two hosts and a single
// dropped socket is not a defect in the site. A second failure is reported as the failure it is.
async function get(url, init) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch(url, { ...(init || {}), headers: { ...headers, ...((init && init.headers) || {}) } }).catch(async (e) => {
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 2000));
        return "retry";
      }
      return null;
    });
    if (res === "retry") continue;
    if (res) return res;
  }
  return null;
}

async function committedCopy(surface, ref, file) {
  const { execFileSync } = await import("node:child_process");
  try {
    return execFileSync("git", ["-C", surface.repo, "show", `${ref}:public/${file}`], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  } catch {
    return null;
  }
}

const norm = (s) => s.replace(/\r\n/g, "\n");

// Which branch a site publishes from is proved, not assumed: it is the branch whose committed
// bytes equal the live bytes. Reported once per domain, and every comparison below is against it,
// because measuring live content against a working branch that was never shipped tells the reader
// a lie in both directions at once.
async function resolvePublishBranch(surface, host) {
  // Score every candidate branch by how many watched files it matches byte for byte. Requiring the
  // first file alone to match made this guard shout "the site drifted from every branch" on
  // 7 Nov, when the truth was ordinary: llms.txt had a new committed line awaiting publication and
  // SELF_AUDIT.md still matched main. One pending sentence is not a lost branch.
  let best = { ref: null, hits: -1 };
  for (const ref of surface.branches) {
    let hits = 0;
    for (const file of surface.files) {
      const copy = await committedCopy(surface, ref, file);
      if (copy === null) continue;
      if (surface.live?.[file] !== undefined && norm(copy) === norm(surface.live[file])) hits++;
    }
    if (hits > best.hits) best = { ref, hits };
  }
  if (best.hits <= 0) {
    console.log(`NO BRANCH MATCHES ${host}: not one watched file equals any of ${surface.branches.join(", ")} — comparing against ${surface.branches[0]}; either everything is awaiting publication or the site drifted`);
    count("differs", `${host} matches no candidate branch at any watched file`);
    return surface.branches[0];
  }
  console.log(`PUBLISHES FROM ${best.ref}: ${best.hits} of ${surface.files.length} watched file(s) on ${host} equal that branch byte for byte`);
  return best.ref;
}

for (const surface of SURFACES) {
  const host = surface.site.replace(/^https:\/\//, "");
  surface.live = {};
  for (const file of surface.files) {
    const res = await get(`${surface.site}/${file}?t=${Date.now()}`);
    if (!res) {
      console.log(`FAIL ${file}: network (${surface.site}, after one retry)`);
      count("fatal", `${file} unreachable on ${surface.site}`);
      continue;
    }
    const live = await res.text();
    if (res.status !== 200) {
      console.log(`MISSING ${file}: ${surface.site} answers HTTP ${res.status} (not published yet)`);
      count("differs", `${file} not published on ${surface.site} (HTTP ${res.status})`);
      continue;
    }
    surface.live[file] = live;
  }
  surface._ref = Object.keys(surface.live).length ? await resolvePublishBranch(surface, host) : surface.branches[0];

  for (const file of surface.files) {
    const live = surface.live[file];
    if (live === undefined) continue;
    const local = await committedCopy(surface, surface._ref, file);
    if (local === null) {
      console.log(`FAIL ${file}: no committed copy at ${surface._ref}:public/${file} in ${surface.repo}`);
      count("fatal", `${file} has no committed copy on ${surface._ref}`);
      continue;
    }
    if (norm(live) === norm(local)) {
      console.log(`MATCH ${file}: ${host} equals ${surface._ref} (${live.length} B)`);
    } else {
      const first = norm(live).split("\n").findIndex((l, i) => l !== norm(local).split("\n")[i]);
      console.log(`DRIFT ${file}: live ${live.length} B vs ${surface._ref} ${norm(local).length} B — first difference at line ${first + 1}.`);
      count("differs", `${file} on ${host} differs from ${surface._ref} at line ${first + 1}`);
    }
    for (const [target, needles] of MUST_NOT) {
      if (target !== file) continue;
      for (const needle of needles) {
        const hits = live.split(needle).length - 1;
        if (hits > 0) {
          console.log(`FAIL ${file}: ${surface.site} serves a claim we measured false — "${needle}" x${hits}`);
          count("fatal", `${surface.site} still serves "${needle}"`);
        }
      }
    }
  }

  // Work that is committed on a branch but has never reached the published one is invisible to
  // every other check in this suite: it exists, it is honest, and no machine or person can read it.
  try {
    const { execFileSync } = await import("node:child_process");
    const head = execFileSync("git", ["-C", surface.repo, "rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
    const against = surface._ref || surface.branches[0];
    const ahead = Number(execFileSync("git", ["-C", surface.repo, "rev-list", "--count", `${against}..HEAD`], { encoding: "utf8" }).trim());
    const behind = Number(execFileSync("git", ["-C", surface.repo, "rev-list", "--count", `HEAD..${against}`], { encoding: "utf8" }).trim());
    console.log(`BRANCH ${host}: HEAD is ${head}, ${ahead} commit(s) ahead of the published ${against}, ${behind} behind it`);
    if (head !== against.replace(/^origin\//, "") && ahead > 0) {
      count("differs", `${host}: ${ahead} commit(s) on ${head} have never reached the published ${against}`);
    }
  } catch (e) {
    console.log(`FAIL ${host}: could not measure the branch state (${String(e.message).split("\n")[0]})`);
    count("fatal", `${host}: branch-state measurement failed`);
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
  const res = await get(`${surface.site}/${card}?t=${Date.now()}`);
  if (!res) {
    console.log(`FAIL ${card}: network (${surface.site}, after one retry)`);
    count("fatal", `${card} unreachable on ${surface.site}`);
    continue;
  }
  if (res.status !== 200) {
    console.log(`MISSING ${card}: ${surface.site} answers HTTP ${res.status} (not published yet)`);
    count("differs", `${card} not published on ${surface.site} (HTTP ${res.status})`);
    continue;
  }
  const live = await res.text();
  const local = await committedCopy(surface, surface.branches[0], card);
  if (local === null) {
    console.log(`FAIL ${card}: no committed copy at ${surface.branches[0]}:public/${card} in ${surface.repo}`);
    count("fatal", `${card} has no committed copy for ${surface.site}`);
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
    count("fatal", `${card} on ${surface.site} is not valid JSON`);
    continue;
  }
  const liveNames = (L.tools || []).map((t) => t.name).sort().join(',');
  const repoNames = (C.tools || []).map((t) => t.name).sort().join(',');
  if (liveNames !== repoNames) {
    console.log(`DRIFT ${card}: live advertises [${liveNames}] but the repository ships [${repoNames}]`);
    count("differs", `${card} on ${surface.site} advertises tools the repository does not ship`);
  }
  if (L.version !== C.version) {
    console.log(`DRIFT ${card}: live version ${L.version} vs committed ${C.version}`);
    count("differs", `${card} on ${surface.site} is version ${L.version}, main says ${C.version}`);
  }
  if (L.description !== C.description) {
    console.log(`DRIFT ${card}: the sentence an agent quotes is not the one in the repository`);
    count("differs", `${card} on ${surface.site} introduces itself with a sentence that is not in main`);
  }
  for (const needle of CARD_MUST_NOT) {
    if (live.includes(needle)) {
      console.log(`FAIL ${card}: serves a claim we measured false — "${needle}"`);
      count("fatal", `${card} on ${surface.site} still serves "${needle}"`);
    }
  }

  // Surface separation is the claim worth guarding. Top-level = the hosted connector; the npm
  // package lives under alternative_installs with its own names, version and "no account".
  // Only the standard domain's cards make those claims; the flagship's server.json is a different
  // document and asserting this set against it would be the guard inventing a defect.
  if (surface.deepCards) {
  if (liveNames !== HOSTED_SET) {
    fail(`${card}: top-level tools [${liveNames}] are not the hosted connector's measured set [${HOSTED_SET}]`);
  }
  const alt = (L.alternative_installs || [])[0] || {};
  const altNames = (alt.tools || []).slice().sort().join(',');
  if (altNames !== PACKAGE_SET) {
    fail(`${card}: the npm door advertises [${altNames || 'nothing'}], the package answers [${PACKAGE_SET}]`);
  }
  if (alt.auth !== 'none' || !alt.install || alt.install.command !== 'npx') {
    fail(`${card}: the npm door is not stated as a key-free npx install`);
  }
  const remote = (L.remotes || [])[0] || {};
  if (remote.url !== HOSTED_REMOTE) {
    fail(`${card}: remote is ${remote.url || 'absent'}, not the deployed connector ${HOSTED_REMOTE}`);
  }
  if (L.transport?.url !== HOSTED_REMOTE || L.transport?.type !== 'streamable-http') {
    fail(`${card}: transport does not name the hosted connector it describes`);
  }
  if (L.auth?.type !== 'oauth2') {
    fail(`${card}: an OAuth server that does not say so — a reader will call it anonymously and take HTTP 401 as an outage`);
  }
  if (!/OAuth/i.test(L.description || '')) {
    sayDrift(`${card}: the description an agent quotes never mentions that the hosted door signs in`);
  }
  if (L.version !== C.version || C.version === alt.version) {
    fail(`${card}: version ${L.version} is not the hosted connector's own (the npm package's ${alt.version} belongs to the npm door)`);
  }

  // The door must actually be behind the challenge it advertises, or the card is a promise.
  const probe = await get(HOSTED_REMOTE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'static-copy-check', version: '1' } } }),
  });
  if (!probe) {
    fail(`${card}: cannot probe the advertised remote`);
  } else {
    const challenge = probe.headers.get('www-authenticate') || '';
    const pointer = (challenge.match(/resource_metadata="([^"]+)"/) || [])[1] || '';
    const metaOk = pointer
      ? (await get(pointer, { headers: { Accept: 'application/json' } }))?.status === 200
      : false;
    if (!(probe.status === 401 && metaOk)) {
      fail(`${card}: advertised remote answers HTTP ${probe.status} with ${pointer ? `metadata HTTP ${metaOk ? 'ok' : 'unreachable'}` : 'no OAuth challenge'} — a 401 without a resolvable challenge is a door we cannot prove`);
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
  console.log(`\nstatic-copy-check: ${fatal} fatal finding(s): ${notes.join(" · ")}`);
  process.exit(1);
}
if (differs) {
  console.log(`\nstatic-copy-check: ${differs} file(s) not yet matching main — publish pending, not a pass. ${notes.join(" · ")}`);
  process.exit(3);
}
console.log('\nstatic-copy-check: every watched static file is live and matches the repository.');
