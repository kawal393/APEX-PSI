#!/usr/bin/env node
/**
 * claim-surface-check — the metaphors we put in front of strangers must be ones we can defend.
 *
 * Why this exists: on 16 November 2026 a critique of APEX PSI was read against the literal
 * meaning of the words on our own pages, and four claims did not survive the reading:
 *
 *   1. "black box recorder" — in aviation and in silicon (TEE, Confidential Compute) that
 *      phrase means a device that cannot be bypassed by the operator. A library an agent
 *      chooses to call is not that. The words invite a question we would have to lose.
 *   2. "the world's first" — several other projects publish the same claim, so ours is not
 *      checkable and therefore not worth making.
 *   3. "flight recorder" — same failure in software: it implies a sensor, not a caller.
 *   4. "3-node MPC / quorum" — our three verifier nodes are operated by one company, so a
 *      quorum here is redundancy on one operator, not multi-party computation.
 *
 * So the copy was corrected and this guard was written in the same turn: a page that drifts
 * back to a metaphor we have withdrawn is a defect, not a style choice.
 *
 * A phrase is allowed to appear when the sentence around it withdraws it — "tamper-evident
 * rather than tamper-proof", "PSI uses no ZK and no MPC". A guard that flagged its own
 * corrections would be turned off within a week.
 *
 * Usage:  node scripts/claim-surface-check.mjs [file ...]
 * Exit 0 = clean. Exit 1 = a claim this repository has withdrawn is live on a public surface.
 *         Exit 1 = also when --self-test cannot make the guard bite.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// The public surfaces, found rather than listed.
//
// This used to be a hand-written list of 21 files while the site carries 312 source files under
// src/pages and src/components. The gap was not theoretical: the Hardening page still called
// our three Apex-operated nodes a "decentralized" quarantine while three other pages had
// already been corrected, and nothing caught it. A page Lovable's editor writes tomorrow would
// have sailed past the same hole. So the surfaces are collected by pattern now, and a new file
// is covered the moment it lands.
const SURFACE_DIRS = ["src/pages", "src/components"];
const SURFACE_EXT = /\.tsx?$/;
const SURFACE_FILES = [
  "public/llms.txt",
  "public/llms-full.txt",
  "public/.well-known/apex-protocol.json",
  "packages/apex-psi-python/apex_psi/recorder.py",
  "packages/apex-psi-python/apex_psi/gate.py",
  "packages/apex-psi-python/apex_psi/__init__.py",
];

function collectSurfaces() {
  const found = [...SURFACE_FILES];
  for (const dir of SURFACE_DIRS) {
    let entries = [];
    try {
      entries = readdirSync(join(root, dir));
    } catch {
      continue;
    }
    for (const name of entries) {
      if (SURFACE_EXT.test(name)) found.push(`${dir}/${name}`);
    }
  }
  return found.sort();
}

const DEFAULT_FILES = collectSurfaces();

// Each entry: the pattern, and the reason the phrase cannot be used as a claim.
const BANNED = [
  [/\bblack[\s-]?box\b/i, "a black box is hardware that cannot be bypassed; ours is a library the caller chooses to call"],
  [/\bflight recorder\b/i, "a flight recorder is wired to the sensors; ours is a function the caller chooses to call"],
  [/world'?s first/i, "other projects publish the same claim, so ours is not checkable"],
  [/\bworld first\b/i, "other projects publish the same claim, so ours is not checkable"],
  [/\bfirst ever\b/i, "the same superlative problem, and harder to check"],
  [/\btamper-?proof\b/i, "a record is tamper-evident: whoever holds the signing key can rebuild a log"],
  [/\bcryptographic truth\b/i, "a seal is an audit trail, not the truth of the contents"],
  [/\bdigital truth\b/i, "same reason"],
  [/\btrustless\b/i, "the notary and the ledger are trusted parties; the verifier removes the need to trust an answer"],
  [/\bguaranteed\b/i, "an absolute the code does not enforce"],
  [/\bimmutable\b/i, "the chain is append-only and tamper-evident, not immutable in the absolute sense"],
  [/\bmulti-?party computation\b/i, "our three nodes are operated by one company — that is redundancy, not MPC"],
  [/\bMPC consensus\b/i, "same reason"],
  [/\bdecentrali[sz]ed\b/i, "the ledger is operated by one company; anyone may verify, which is a different claim"],
  [/\bunbreakable\b/i, "an absolute the code does not enforce"],
  // Measured 19 Nov 2026: three key panels drew the daily limit as `∞`, one of them labelled
  // "∞ Unlimited". A key whose limit is 0 or -1 has no cap configured; that is not unlimited
  // capacity on infrastructure we operate and meter. The glyph is banned outright because no
  // sentence in this repository needs it, so this rule can never be argued away.
  [/∞/, "an infinity glyph on a meter claims capacity the code does not grant; a key with no configured cap is 'no daily cap set'"],
  [/>\s*Unlimited\s*</i, "the same absolute in the badge shape; the truthful label names what is actually true of the row"],
  [/["'`](?:∞\s*)?Unlimited["'`]/, "the same absolute in a string literal, so it cannot arrive through a translated label"],
];

// Item 4 of the header note: a quorum of our own nodes is redundancy on one operator. The
// phrases above cannot catch a bare UI heading, so the disclosure is checked as an invariant:
// any t-of-n quorum that speaks of nodes must say, in the same breath, who runs them.
//
// Both separators are matched ("2-of-3", "2/3", "3 of 5"), and each side is restricted to one
// digit, so a measurement date like 2026-11-04 cannot read as a threshold.
const TOFN = "\\b[1-9][\\s-]*(?:of|[-/])[\\s-]*[1-9]\\b";
const QUORUM_CLAIM = new RegExp(`${TOFN}[\\s\\S]{0,80}?\\bquorum|\\bquorum\\b[\\s\\S]{0,80}?${TOFN}`, "gi");
const NODE_WORD = /\bnodes?\b/i;
const OPERATOR_DISCLOSURE =
  /operated by|one operator|single operator|APEX-operated|redundan|not MPC|not multi-party|independent operator/i;

// A banned phrase is permitted when the sentence around it withdraws it. Each entry is a
// fragment that must appear within the 90 characters before the match.
const EXEMPT = [
  "rather than",
  "not ",
  "no ",
  "never",
  "withdraw",
  "does not",
  "cannot",
  "instead of",
  "not a ",
  "is not",
  "without",
];

const args = process.argv.slice(2);
const selfTest = args.includes("--self-test");
const files = args.filter((a) => !a.startsWith("--"));

// Two files need a different rule, and the reason is written down rather than assumed.
//
// Corrections.tsx is the register of what this repository withdrew. Its "said" fields quote
// the phrases we have cut, so they must be allowed to carry them; its "now" and
// "undertaking" fields are what we claim today, so they are scanned in full. The guard
// therefore reads the register's structure instead of blanket-exempting the page.
const WITHDRAWN_ONLY_FIELDS = {
  "src/pages/Corrections.tsx": /said:\s*"[^"]*"/gs,
  // The IETF draft page quotes the text that was actually filed, word for word, so a reader
  // can see what changed. Those quotes may carry the withdrawn phrases; the page's own claims
  // around them are scanned in full.
  "src/pages/IETFDraft.tsx": /filed:\s*'[^']*'/gs,
};

// ResearchReferences.tsx is a bibliography of other people's work. "Decentralised" there
// describes somebody else's subject, and the page says so in its own note. Only those two
// words are exempt on that page: a superlative about APEX PSI is still banned there.
const FILE_EXEMPT = {
  "src/components/ResearchReferences.tsx": [
    /decentrali[sz]ed/i,
    /multi-?party computation/i,
    // Somebody else's article title, quoted as a link. Our own claims are still scanned here.
    /tamper-?proof/i,
  ],
};

function scan(text, exempt = []) {
  const problems = [];
  for (const [pattern, why] of BANNED) {
    const regex = new RegExp(pattern.source, "gi");
    let m;
    while ((m = regex.exec(text)) !== null) {
      const before = text.slice(Math.max(0, m.index - 90), m.index).toLowerCase();
      if (EXEMPT.some((e) => before.includes(e))) continue;
      if (exempt.some((e) => e.test(m[0]))) continue;
      const line = text.slice(0, m.index).split("\n").length;
      problems.push(`line ${line}: "${m[0]}" — ${why}`);
      if (m.index === regex.lastIndex) regex.lastIndex++;
    }
  }
  const quorum = new RegExp(QUORUM_CLAIM.source, "gi");
  let q;
  while ((q = quorum.exec(text)) !== null) {
    const window = text.slice(Math.max(0, q.index - 160), q.index + q[0].length + 160);
    // Only the machine quorum needs the disclosure: a 3-of-5 of credentialed humans is a
    // quorum of independent people, and the words that would disclose a node operator are
    // not in that sentence and should not be.
    if (!NODE_WORD.test(window)) continue;
    if (OPERATOR_DISCLOSURE.test(window)) continue;
    const line = text.slice(0, q.index).split("\n").length;
    problems.push(
      `line ${line}: "${q[0].replace(/\s+/g, " ")}" — a t-of-n quorum of nodes is redundancy on one operator, ` +
        `so the sentence must say who operates them (see the same undertaking on the Hardening and Protocol pages)`,
    );
    if (q.index === quorum.lastIndex) quorum.lastIndex++;
  }
  return problems;
}

function read(rel) {
  const path = isAbsolute(rel) ? rel : join(root, rel);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

if (selfTest) {
  // A guard that cannot fail is not a guard. This proves it bites on each shape it closes.
  const samples = [
    ["black box recorder", "a black box is hardware that cannot be bypassed; ours is a library the caller chooses to call"],
    ["the world's first public reference", "other projects publish the same claim, so ours is not checkable"],
    ["our flight recorder for agents", "a flight recorder is wired to the sensors; ours is a function the caller chooses to call"],
    ["the record is tamper-proof", "a record is tamper-evident: whoever holds the signing key can rebuild a log"],
    ["verified by multi-party computation", "our three nodes are operated by one company — that is redundancy, not MPC"],
    ["the key reads ∞ Unlimited", "an infinity glyph on a meter claims capacity the code does not grant"],
    ['<span className="badge">Unlimited</span>', "the absolute in the badge shape"],
    ['const tierLabel = "Unlimited";', "the absolute in a string literal"],
    ["2-of-3 quorum across the verification nodes", "a t-of-n quorum of nodes must name its operator"],
  ];
  let failures = 0;
  for (const [text, why] of samples) {
    const found = scan(text);
    if (found.length === 0) {
      failures++;
      console.error(`FAIL the guard let this through: "${text}"`);
    } else {
      console.log(`PASS the guard bites: "${text}"`);
    }
  }
  // And the corrections themselves must not be flagged.
  const allowed = [
    "both are tamper-evident rather than tamper-proof",
    "PSI uses no ZK and no MPC",
    "this is not a black box; it is a receipt",
    '<span className="text-[10px]">No daily cap set</span>',
    "a 3-of-5 quorum of credentialed professionals signs the determination with Ed25519",
    "2-of-3 quorum across the 3 nodes, all operated by APEX — redundancy, not consensus",
  ];
  for (const text of allowed) {
    const found = scan(text);
    if (found.length > 0) {
      failures++;
      console.error(`FAIL the guard flagged its own correction: "${text}" -> ${found[0]}`);
    } else {
      console.log(`PASS the guard allows a withdrawal: "${text}"`);
    }
  }
  console.log(`\n${failures === 0 ? "SELF-TEST OK" : "SELF-TEST FAILED"}: ${failures} failure(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

const targets = files.length ? files : DEFAULT_FILES;
const problems = [];
let checked = 0;

for (const rel of targets) {
  let text = read(rel);
  if (text === null) {
    problems.push(`${rel}: the file is not there`);
    continue;
  }
  checked++;
  const withdrawn = WITHDRAWN_ONLY_FIELDS[rel];
  if (withdrawn) text = text.replace(withdrawn, 'said: ""');
  for (const problem of scan(text, FILE_EXEMPT[rel] || [])) {
    problems.push(`${rel}: ${problem}`);
  }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s) in ${checked} file(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`PASS — ${checked} public surface(s) carry no metaphor this repository has withdrawn.`);
