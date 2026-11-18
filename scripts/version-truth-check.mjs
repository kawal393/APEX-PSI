// Prove the public copy names the version the registries actually serve.
//
// Why this exists: a version pin is an instruction to install a specific artefact. On
// 15 Nov 2026 the site told every visitor to pin 1.5.0 while npm and PyPI both served
// 1.6.0, and README.md still told a stranger to `npm i apex-psi-verifier@1.3.0` — a
// release we publicly deprecated on 7 Nov. Nothing in the estate compared what the copy
// said against what the index serves, so both stayed wrong. The registry-truth guard
// drives envelopes through the published bytes; it never reads a sentence.
//
// The rules, and the reason each is a rule and not a mood:
//
//   1. INSTALL COMMANDS name the registry latest. `npm i pkg@V` and `pip install
//      pkg==V` are what a stranger copies and runs. They are unambiguous, so they are
//      checked without any interpretation of the sentence around them.
//   2. PIN INSTRUCTIONS name the registry latest. "Pin 1.6.0", "published at 1.6.0",
//      "Verifier v1.6.0" — the sentence that tells you which release to take.
//   3. Every OTHER version named in public copy is either the registry latest or a
//      release recorded as deprecated. A version nobody can find on either index is a
//      version we invented.
//   4. Every deprecated release is named as one to avoid somewhere in the public copy.
//      A release we deprecate and never mention is a release a stranger can still
//      install on purpose, believing it is current.
//   5. npm and PyPI serve the same latest version, because the two free verifiers must
//      print the same verdict for the same receipt.
//
// Describing why a release is bad is legitimate and required, so rule 3 permits a
// deprecated version to appear in prose. Rules 1 and 2 are what stop it being installed.
//
// Two holes were found in this guard by an adversary and closed here:
//
//   19 Nov 2026, the README. It said "so pin **1.3.0**" and the guard passed it: the
//   pin pattern could not see a version wrapped in markdown emphasis. Emphasis is now
//   unwrapped before scanning.
//
//   19 Nov 2026, apexmuse (Meta Muse), acting as the adversary against this guard. It
//   sent the string `npm i -g apex-psi-verifier@1.3.0` and the guard passed it, because
//   the install pattern expected the package name to follow the command directly, and
//   "-g" sat between them. It also found `pin v1.3.0` misses for the same reason the
//   emphasis form did — a "v" between the cue and the digits. Both are closed here:
//   the install pattern now accepts flags before the package name, every version
//   capture now accepts an optional "v", and the self-test below drives each of those
//   shapes so a later edit that weakens the check is caught by the check itself.
//
// Usage:  node scripts/version-truth-check.mjs
//         node scripts/version-truth-check.mjs --self-test   (reads no index)
// Exit 0 - every watched surface names the version the registries serve.
// Exit 1 - a surface names a different version, names a deprecated release as the one
//          to install, or the registries could not be read. A guard that could not check
//          anything is not a pass, so "cannot read" is a failure and says so.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const NPM_PKG = 'apex-psi-verifier';
const PY_PKG = 'psi-verifier';
const NPM_LATEST_URL = `https://registry.npmjs.org/${NPM_PKG}/latest`;
const PYPI_LATEST_URL = `https://pypi.org/pypi/${PY_PKG}/json`;

// Public surfaces a stranger reads. The served bundle is not among them: it is measured
// after publication by scripts/live-copy-check.mjs, and this guard runs before publish.
const ROOTS = ['public', 'src'];
const EXTRA_FILES = [
  'README.md',
  'SECURITY.md',
  join('packages', 'psi-verifier', 'README.md'),
  join('packages', 'psi-verifier-py', 'README.md'),
];
const TEXT_EXT = new Set(['.txt', '.json', '.md', '.ts', '.tsx']);

// src/pages/Corrections.tsx is a dated record of statements we made and then corrected.
// Its install commands are the ones we were wrong about, quoted as the error. Editing
// them would falsify the record; refusing to scan them would be honest. Same carve-out
// live-copy-check.mjs makes for the quoted historical entry on /corrections.
const HISTORY_FILES = new Set([join('src', 'pages', 'Corrections.tsx')]);

const NOTICE_FILE = join('packages', 'psi-verifier', 'deprecation-notices.json');

// Version-looking strings that belong to a different namespace and are not releases of
// ours. Masked before scanning, or the guard would demand we deprecate RFC 9162 §2.1.4.2.
const FOREIGN_VERSION_CONTEXT = [
  /PSI-SEAL\/[0-9]+(?:\.[0-9]+)*/g,
  /\b(?:RFC|section|sec|clause|paragraph)\s+[0-9]+(?:\.[0-9]+)+/gi,
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (TEXT_EXT.has(p.slice(p.lastIndexOf('.')))) out.push(p);
  }
  return out;
}

function readIfPresent(p) {
  try {
    if (statSync(p).size > 4_000_000) return null;
    return readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

async function readJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'apex-psi-version-truth-check', Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  }).catch((e) => ({ ok: false, status: `network: ${e.message}` }));
  if (!res.ok) return { error: `HTTP ${res.status}` };
  try {
    return { json: await res.json() };
  } catch (e) {
    return { error: `bad JSON: ${e.message}` };
  }
}

// ---------------------------------------------------------------- patterns

// A version wrapped in markdown emphasis is still a version a stranger reads. Before
// 19 Nov 2026 the README told a reader to "pin **1.3.0**" and this guard passed it:
// the pin pattern could not see a version sitting between two asterisks. Emphasis is
// unwrapped before scanning so `**1.3.0**`, `*1.3.0*`, `_1.3.0_` and `` `1.3.0` `` are
// judged as the bare version they are.
function unwrapEmphasis(text) {
  return text
    .replace(/\*\*(\d+\.\d+\.\d+)\*\*/g, '$1')
    .replace(/\*(\d+\.\d+\.\d+)\*/g, '$1')
    .replace(/_(\d+\.\d+\.\d+)_/g, '$1')
    .replace(/`(\d+\.\d+\.\d+)`/g, '$1');
}

// Rule 1 — install commands. A stranger runs these verbatim. Flags may sit between the
// command and the package name ("npm i -g pkg@V"), because that is how a global install
// is written, and a version may carry a "v" prefix ("pkg@v1.3.0").
const INSTALL_PATTERNS = [
  [
    'npm install command',
    new RegExp(
      `\\b(?:npm|pnpm|yarn|bun)\\s+(?:i|install|add)\\s+(?:-{1,2}[^\\s]+\\s+)*${NPM_PKG}@v?(\\d+\\.\\d+\\.\\d+)`,
      'g',
    ),
  ],
  [
    'pip install command',
    new RegExp(
      `pip3?\\s+install\\s+(?:-[^\\s]+\\s+)*${PY_PKG}==v?(\\d+\\.\\d+\\.\\d+)`,
      'g',
    ),
  ],
];

// Rule 2 — pin instructions. The sentence that tells you which release to take.
const PIN_PATTERNS = [
  ['pin sentence', /[Pp]in\s+[`'"]?@?v?(\d+\.\d+\.\d+)/g],
  ['published at', /published at \*?\*?v?(\d+\.\d+\.\d+)/gi],
  // A sentence that says a release IS the published one is an install instruction in
  // prose. "`psi-verifier` 1.3.0 is published on PyPI" names 1.3.0 as the release to
  // take, whether or not a stranger copies a code block.
  ['published on', /(\d+\.\d+\.\d+)\s+is published on (?:PyPI|npm)/gi],
  ['is on a registry', /(\d+\.\d+\.\d+)\s+is on (?:PyPI|npm)\b/gi],
  ['is latest', /(\d+\.\d+\.\d+)[^.\n]{0,120}?is (?:now\s+)?[`'"]?latest/gi],
  ['published_version', /"published_version"\s*:\s*"v?(\d+\.\d+\.\d+)"/g],
  ['verifier title', /Verifier v(\d+\.\d+\.\d+)/g],
  ['version statement', /\bversion \*?\*?v?(\d+\.\d+\.\d+) on both/gi],
];

// Rule 3 — a bare reference to our package, outside an install command. It may name the
// latest release or a deprecated one (we have to be able to say which release is bad);
// anything else is a version we invented. Other packages have their own version
// namespaces — the MCP server, the schema, the vendored WASM — and are not ours to judge.
const BARE_PATTERNS = [
  ['npm package reference', new RegExp(`${NPM_PKG}@v?(\\d+\\.\\d+\\.\\d+)`, 'g')],
  ['pypi package reference', new RegExp(`${PY_PKG}==v?(\\d+\\.\\d+\\.\\d+)`, 'g')],
  // A package name followed by a version in prose — "`psi-verifier` 1.3.0" — is a bare
  // reference to a release. It is the form the README used to name a deprecated release
  // as the current one.
  [
    'npm package and version',
    new RegExp(`${NPM_PKG}[\`'\\"\\s*_@=v]{0,4}(\\d+\\.\\d+\\.\\d+)`, 'g'),
  ],
  [
    'pypi package and version',
    new RegExp(`${PY_PKG}[\`'\\"\\s*_@=v]{0,4}(\\d+\\.\\d+\\.\\d+)`, 'g'),
  ],
];

// Rule 4 — the warning forms. The window is cut at the first sentence break, so a
// later sentence that merely praises a version is not read as a warning about it.
const AVOID_CUES = [
  /pin(?:ned)?\s+away\s+from/gi,
  /\bavoid\b/gi,
  /\bdo not pin\b/gi,
  /\bnever pin\b/gi,
];
const AVOID_WINDOW = 320;

function avoidVersions(text) {
  const found = new Set();
  for (const cue of AVOID_CUES) {
    cue.lastIndex = 0;
    let m;
    while ((m = cue.exec(text)) !== null) {
      const tail = text.slice(m.index + m[0].length, m.index + m[0].length + AVOID_WINDOW);
      const stop = tail.search(/[;]\s|:\s|\.\s|\n\n/);
      const seg = stop === -1 ? tail : tail.slice(0, stop);
      for (const v of seg.match(/\d+\.\d+\.\d+/g) || []) found.add(v);
    }
  }
  return found;
}

function maskForeign(text) {
  let out = text;
  for (const re of FOREIGN_VERSION_CONTEXT) {
    re.lastIndex = 0;
    out = out.replace(re, (m) => m.replace(/[0-9]/g, '#'));
  }
  return out;
}

// ---------------------------------------------------------------- self-test

// Each shape the guard is supposed to bite on, and the version it must find. An
// adversary sent the first two on 19 Nov 2026; the rest are the shapes already closed
// before that. A later edit that weakens a pattern fails here.
const ATTACKS = [
  { group: 'install', raw: 'npm i -g apex-psi-verifier@1.3.0', v: '1.3.0' },
  { group: 'install', raw: 'npm install --global apex-psi-verifier@1.3.0', v: '1.3.0' },
  { group: 'install', raw: 'npm i -g apex-psi-verifier@v1.3.0', v: '1.3.0' },
  { group: 'install', raw: 'pnpm add apex-psi-verifier@1.3.0', v: '1.3.0' },
  { group: 'install', raw: 'yarn add apex-psi-verifier@1.3.0', v: '1.3.0' },
  { group: 'install', raw: 'pip install --upgrade psi-verifier==1.3.0', v: '1.3.0' },
  { group: 'install', raw: 'npm i apex-psi-verifier@1.3.0', v: '1.3.0' },
  { group: 'pin', raw: 'so pin **1.3.0**', v: '1.3.0' },
  { group: 'pin', raw: 'so pin `1.3.0`', v: '1.3.0' },
  { group: 'pin', raw: 'so pin v1.3.0', v: '1.3.0' },
  { group: 'pin', raw: '`psi-verifier` 1.3.0 is published on PyPI', v: '1.3.0' },
  { group: 'pin', raw: '`apex-psi-verifier` 1.3.0 is on npm', v: '1.3.0' },
  { group: 'pin', raw: '`apex-psi-verifier` 1.3.0 is now `latest`', v: '1.3.0' },
];

// Text that must NOT be read as an install or pin instruction. A guard that flags
// ordinary prose is a guard people turn off.
const CLEAN = [
  { group: 'install', raw: 'npm install' },
  { group: 'install', raw: 'npm i' },
  { group: 'install', raw: 'run npm install in this repository' },
  { group: 'install', raw: 'pip install' },
  { group: 'pin', raw: 'Pin the version you rely on; that is the whole discipline.' },
  { group: 'pin', raw: 'the published version is the one the registry serves' },
];

function findVersions(raw, group) {
  const text = unwrapEmphasis(maskForeign(raw));
  const patterns = group === 'install' ? INSTALL_PATTERNS : PIN_PATTERNS;
  const out = [];
  for (const [what, re] of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) out.push({ what, v: m[1] });
  }
  return out;
}

function selfTest() {
  const failures = [];
  for (const a of ATTACKS) {
    const hits = findVersions(a.raw, a.group);
    if (!hits.some((h) => h.v === a.v)) {
      failures.push(`MISSED [${a.group}] ${JSON.stringify(a.raw)} — expected ${a.v}`);
    }
  }
  for (const c of CLEAN) {
    const hits = findVersions(c.raw, c.group);
    if (hits.length) {
      failures.push(
        `FALSE POSITIVE [${c.group}] ${JSON.stringify(c.raw)} — read as ${hits
          .map((h) => `${h.what}=${h.v}`)
          .join(', ')}`,
      );
    }
  }
  console.log(
    `version-truth-check self-test: ${ATTACKS.length} attack shape(s), ${CLEAN.length} clean string(s)`,
  );
  if (failures.length) {
    for (const f of failures) console.log(`FAIL ${f}`);
    console.log(`\nversion-truth-check: ${failures.length} self-test failure(s).`);
    process.exit(1);
  }
  console.log('version-truth-check: every attack shape is caught.');
}

if (process.argv.includes('--self-test')) {
  selfTest();
  process.exit(0);
}

// ---------------------------------------------------------------- registries

const npmRes = await readJson(NPM_LATEST_URL);
const pyRes = await readJson(PYPI_LATEST_URL);

if (npmRes.error) {
  console.log(`FAIL npm ${NPM_PKG}: cannot read the registry — ${npmRes.error}`);
  process.exit(1);
}
if (pyRes.error) {
  console.log(`FAIL PyPI ${PY_PKG}: cannot read the registry — ${pyRes.error}`);
  process.exit(1);
}

const npmLatest = npmRes.json?.version;
const pyLatest = pyRes.json?.info?.version;

if (!npmLatest || !pyLatest) {
  console.log('FAIL a registry answered without a version string');
  process.exit(1);
}
console.log(`npm  ${NPM_PKG} latest = ${npmLatest}`);
console.log(`PyPI ${PY_PKG} latest = ${pyLatest}`);

const problems = [];

if (npmLatest !== pyLatest) {
  problems.push(
    `the two free verifiers serve different versions — npm says ${npmLatest}, PyPI says ${pyLatest}. Publish them together, or an install instruction can only be right about one of them.`,
  );
}
const LATEST = npmLatest;

// ---------------------------------------------------------------- notices

let notices = {};
try {
  notices = JSON.parse(readFileSync(NOTICE_FILE, 'utf8'));
} catch (e) {
  problems.push(`cannot read ${NOTICE_FILE}: ${e.message}`);
}
const deprecated = new Set(
  Object.keys(notices).filter((v) => /^\d+\.\d+\.\d+$/.test(v) && v !== LATEST),
);
const nonReleases = Object.keys(notices).filter((v) => !/^\d+\.\d+\.\d+$/.test(v));
console.log(
  `notices: ${[...deprecated].join(', ') || 'none'}` +
    (nonReleases.length ? ` (non-release: ${nonReleases.join(', ')})` : ''),
);

// ---------------------------------------------------------------- surfaces

const files = [];
for (const root of ROOTS) files.push(...walk(root));
for (const f of EXTRA_FILES) files.push(f);

const discouraged = new Set();
let scanned = 0;

function judgeText(raw, label) {
  const text = unwrapEmphasis(maskForeign(raw));

  // Install commands are located first so a bare reference inside one is not counted
  // twice — the command is judged by rule 1, which is stricter.
  const installSpans = [];
  for (const [what, re] of INSTALL_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      installSpans.push([m.index, m.index + m[0].length]);
      const v = m[1];
      if (v === LATEST) continue;
      const line = text.slice(0, m.index).split('\n').length;
      problems.push(
        `${label}:${line} — ${what} names ${v}; the registries serve ${LATEST}` +
          (deprecated.has(v) ? ` and ${v} is a deprecated release` : ''),
      );
    }
  }
  const insideInstall = (i) => installSpans.some(([a, b]) => i >= a && i < b);

  for (const [what, re] of PIN_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const v = m[1];
      if (v === LATEST) continue;
      const line = text.slice(0, m.index).split('\n').length;
      problems.push(
        `${label}:${line} — ${what} names ${v}; the registries serve ${LATEST}` +
          (deprecated.has(v) ? ` and ${v} is a deprecated release` : ''),
      );
    }
  }

  for (const [what, re] of BARE_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (insideInstall(m.index)) continue;
      const v = m[1];
      if (v === LATEST || deprecated.has(v)) continue;
      const line = text.slice(0, m.index).split('\n').length;
      problems.push(
        `${label}:${line} — ${what} names ${v}, which is neither the registry latest (${LATEST}) nor a release recorded in ${NOTICE_FILE}`,
      );
    }
  }

  for (const v of avoidVersions(text)) discouraged.add(v);
}

for (const file of files) {
  if (HISTORY_FILES.has(file)) {
    console.log(`SKIP ${file} (dated correction history)`);
    continue;
  }
  const raw = readIfPresent(file);
  if (raw === null) continue;
  scanned++;
  judgeText(raw, file);
}

console.log(`scanned ${scanned} public surface file(s)`);

// Rule 4 — a deprecated release the copy never warns about is a release a stranger can
// still install on purpose, believing it is current.
for (const v of deprecated) {
  if (!discouraged.has(v)) {
    problems.push(
      `${NOTICE_FILE} records ${v} as deprecated, but no public surface tells a reader to avoid it`,
    );
  }
}
for (const v of discouraged) {
  if (!deprecated.has(v)) {
    problems.push(
      `the copy tells readers to avoid ${v}, but ${NOTICE_FILE} does not record it as a deprecated release`,
    );
  }
}

if (problems.length) {
  console.log('');
  for (const p of problems) console.log(`FAIL ${p}`);
  console.log(`\nversion-truth-check: ${problems.length} problem(s).`);
  process.exit(1);
}
console.log('\nversion-truth-check: every public surface names the version the registries serve.');
