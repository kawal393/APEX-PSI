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
//   1. INSTALL COMMANDS name the registry latest. `npm i pkg@V`, `pip install pkg==V`
//      and `npx -y pkg@V` are what a stranger copies and runs. They are unambiguous, so
//      they are checked without any interpretation of the sentence around them.
//   2. PIN INSTRUCTIONS name the registry latest. "Pin 1.6.0", "published at 1.6.0",
//      "Upgrade to 1.6.0", "Verifier v1.6.0" — the sentence that tells you which release
//      to take.
//   3. Every OTHER version named in public copy is a release the index actually serves.
//      A version nobody can download is a version we invented. Rule 1 and rule 2 still
//      forbid installing it; this rule only forbids inventing it.
//   4. Every deprecated release is named as one to avoid somewhere in the public copy.
//      A release we deprecate and never mention is a release a stranger can still
//      install on purpose, believing it is current.
//   5. npm and PyPI serve the same latest version, because the two free verifiers must
//      print the same verdict for the same receipt.
//   6. A machine-readable card that pairs a package with a version names the release
//      that index serves. This is not prose a partner may skim: it is JSON their tooling
//      parses, so a stale field is a stale install, silently.
//   7. Every one of our package names that public copy puts in an install command
//      exists on the index it is named for. A name that 404s is not an old release, it is
//      a package we never shipped, and a stranger's terminal is where that is found out.
//   8. The release an index advertises as latest can actually be downloaded. Measured
//      19 Nov 2026: npm's manifest named apex-psi-verifier 1.7.0 while
//      apex-psi-verifier-1.7.0.tgz returned HTTP 404, so `npm i apex-psi-verifier` — the
//      line on every surface we own — failed for five days. The manifest lied and every
//      guard that read the manifest agreed with it. Only the tarball URL tells the truth.
//
// Describing why a release is bad is legitimate and required, so rule 3 permits a real
// release to appear in prose. Rules 1 and 2 are what stop it being installed.
//
// Holes found by an adversary and closed here:
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
//   19 Nov 2026, found by this guard's own blind spot, not by an adversary: docs/DROP-IN.md
//   launched the npm door with `["npx", "-y", "apex-psi-mcp@1.1.2"]` in four places while
//   npm had served 1.2.2 since 17 Nov. No rule could see it — rule 1 knew npm/pnpm/yarn/bun
//   install verbs only, and `npx` is how an MCP client actually starts the package, so the
//   stalest instruction on the estate was the one nobody read as an install command. npx is
//   now rule 1, and the drop-in guide is a scanned surface.
//
// Usage:  node scripts/version-truth-check.mjs
//         node scripts/version-truth-check.mjs --self-test   (reads no index, no network)
// Exit 0 - every watched surface names the version the registries serve.
// Exit 1 - a surface names a different version, names a deprecated release as the one
//          to install, names a package that does not exist, points at a release whose
//          bytes the index cannot serve, or the registries could not be read. A guard
//          that could not check anything is not a pass, so "cannot read" is a failure.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ------------------------------------------------------------- watched packages
//
// Three objects wear our name in public copy. Until 19 Nov 2026 this guard knew two of
// them, which is why the npm door's own version could drift underneath it.
const PACKAGES = [
  { name: 'apex-psi-verifier', index: 'npm', role: 'the Node verifier' },
  { name: 'psi-verifier', index: 'pypi', role: 'the Python verifier' },
  { name: 'apex-psi-mcp', index: 'npm', role: 'the npm MCP door' },
];

// Rule 5 applies to this pair only: they must print the same verdict for one receipt.
// The MCP door ships on its own release train and is not required to match either.
const VERIFIER_PAIR = ['apex-psi-verifier', 'psi-verifier'];

const NPM_PKG = 'apex-psi-verifier';
const PY_PKG = 'psi-verifier';

// Names that are ours to answer for. Rule 7 checks these and nothing else: requiring a
// stranger's third-party dependency to resolve would put our CI in another vendor's
// hands, and the failure would not be ours to fix.
const OUR_NAME = /^(apex-psi[\w-]*|psi-verifier|psi-[\w-]+|@apex\/[\w-]+)$/;

// Public surfaces a stranger reads. The served bundle is not among them: it is measured
// after publication by scripts/live-copy-check.mjs, and this guard runs before publish.
const ROOTS = ['public', 'src', 'docs'];
const EXTRA_FILES = [
  'README.md',
  'SECURITY.md',
  join('packages', 'psi-verifier', 'README.md'),
  join('packages', 'psi-verifier-py', 'README.md'),
  // The deprecation notices are not internal metadata: the publish rail feeds every entry
  // to `npm deprecate`, so the sentence lands on the registry index as public copy. It
  // said "Upgrade to 1.6.0 or later" while both indexes served 1.7.0.
  join('packages', 'psi-verifier', 'deprecation-notices.json'),
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

// `psi-verifier` is a substring of `apex-psi-verifier`. Without a left boundary every
// version bound to the npm verifier would also be read as a PyPI claim, and one stale
// line would report two failures while hiding which package it actually named.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const LEFT = '(?<![\\w./@-])';
const SEMVER = '(\\d+\\.\\d+\\.\\d+)';

// Rule 1 — install and launch commands. A stranger runs these verbatim. Flags may sit
// between the command and the package name ("npm i -g pkg@V"), because that is how a
// global install is written, and a version may carry a "v" prefix ("pkg@v1.3.0"). npx is
// in this rule because that is how an MCP client starts the npm door, and the four stale
// pins in docs/DROP-IN.md were invisible to the guard that was supposed to catch them.
const INSTALL_PATTERNS = PACKAGES.flatMap((p) =>
  p.index === 'npm'
    ? [
        [
          `npm install command (${p.name})`,
          new RegExp(
            `\\b(?:npm|pnpm|yarn|bun)\\s+(?:i|install|add)\\s+(?:-{1,2}[^\\s]+\\s+)*${esc(p.name)}@v?${SEMVER}`,
            'g',
          ),
        ],
        [
          // Two shapes, both real. A command line is `npx -y pkg@V`; the client config a
          // stranger pastes is "command": "npx", "args": ["-y", "pkg@V"] — the form
          // docs/DROP-IN.md carried, where quotes, commas and newlines sit between the
          // launcher and the pin. The bounded gap catches the config without reaching
          // across a document to invent a connection that is not there.
          `npx launch command (${p.name})`,
          new RegExp(
            `\\bnpx[\\s\\S]{0,90}?${esc(p.name)}@v?${SEMVER}`,
            'g',
          ),
        ],
        [
          `Install sentence (${p.name})`,
          new RegExp(`${LEFT}[Ii]nstall\\s+${esc(p.name)}@v?${SEMVER}`, 'g'),
        ],
      ]
    : [
        [
          `pip install command (${p.name})`,
          new RegExp(
            `pip3?\\s+install\\s+(?:-[^\\s]+\\s+)*${esc(p.name)}==v?${SEMVER}`,
            'g',
          ),
        ],
      ],
);

// Rule 2 — pin instructions. The sentence that tells you which release to take. An
// unqualified version in one of these sentences is judged against every watched package:
// naming any current release is allowed, naming anything else is a pin a stranger follows
// to a release we no longer stand behind.
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
  // "Upgrade to 1.6.0 or later" is the sentence a reader obeys when they are running a
  // release we labelled insecure. It is in the deprecation notices, which the publish rail
  // feeds to `npm deprecate`, so it is copy a stranger reads on the registry itself.
  ['upgrade to', /\bupgrade to \*?\*?v?(\d+\.\d+\.\d+)/gi],
  // "Superseded by 1.5.0" tells the reader which release replaced the one they hold.
  ['superseded by', /\bsuperseded by \*?\*?v?(\d+\.\d+\.\d+)/gi],
];

// Rule 3 — a bare reference to one of our packages, outside an install command. It may
// name any release that index actually serves; anything else is a version we invented.
// The left boundary is not decoration: SECURITY.md writes `apex-psi-verifier@1.2.0`, and
// without it that string is also read as a PyPI claim for `psi-verifier@1.2.0` — a
// release PyPI never served, so the guard reported a defect in a sentence that was
// correct and named the wrong package doing it.
const BARE_PATTERNS = PACKAGES.flatMap((p) => [
  [
    `package reference (${p.name})`,
    new RegExp(`${LEFT}${esc(p.name)}@v?${SEMVER}`, 'g'),
  ],
  [
    `pypi pinned reference (${p.name})`,
    new RegExp(`${LEFT}${esc(p.name)}==v?${SEMVER}`, 'g'),
  ],
  // A package name followed by a version in prose — "`psi-verifier` 1.3.0" — is a bare
  // reference to a release. It is the form the README used to name a deprecated release
  // as the current one.
  [
    `package and version (${p.name})`,
    new RegExp(`${LEFT}${esc(p.name)}[\`'"\\s*_@=v]{0,4}${SEMVER}`, 'g'),
  ],
]);

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

// Rule 7 — the package names a stranger's terminal would be pointed at. Scoped names,
// version pins, extras and trailing prose are all stripped before the name is judged.
const SPEC_CAPTURE_PATTERNS = [
  ['npm', /\b(?:npm|pnpm|yarn|bun)\s+(?:i|install|add)\s+((?:-{1,2}\S+\s+)*\S[^\s`"'<]*)/g],
  ['npm', /\bnpx\s+((?:-{1,2}\S+\s+)*\S[^\s`"'<]*)/g],
  ['pypi', /\bpip3?\s+install\s+((?:-\S+\s+)*\S[^\s`"'<]*)/g],
];

function cleanSpec(raw) {
  let s = raw.trim();
  // Drop leading flags; the last non-flag token is the install target.
  const tokens = s.split(/\s+/).filter((t) => !t.startsWith('-'));
  s = tokens[tokens.length - 1] || '';
  s = s.replace(/^['"`[]+/, '').replace(/['"`\],.;:)]+$/, '');
  if (!s || /^[./]/.test(s)) return null; // a path install, not an index install
  if (/[$<>{}*]/.test(s)) return null; // a placeholder in a template, not a name
  s = s.replace(/\[[^\]]*\]$/, ''); // pip extras: smolagents[mcp]
  let version = null;
  const at = s.lastIndexOf('@');
  if (at > 0 && /@v?\d+\.\d+\.\d+$/.test(s)) {
    version = s.slice(at + 1).replace(/^v/, '');
    s = s.slice(0, at);
  }
  const eq = s.indexOf('==');
  if (eq > 0) {
    version = s.slice(eq + 2).replace(/^v/, '');
    s = s.slice(0, eq);
  }
  return { name: s, version };
}

function installSpecs(text) {
  const out = [];
  for (const [index, re] of SPEC_CAPTURE_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const spec = cleanSpec(m[1]);
      if (spec && OUR_NAME.test(spec.name)) out.push({ ...spec, index });
    }
  }
  return out;
}

// ---------------------------------------------------------------- pure judging
//
// Every rule below is a pure function over (surface text, an answers-from-the-index
// object). --self-test drives them with an injected fake index so the guard can prove
// its own bite without a network and without waiting on somebody else's outage.

const lineOf = (text, i) => text.slice(0, i).split('\n').length;

function judgeText(raw, label, ctx, report, discouraged) {
  const text = unwrapEmphasis(maskForeign(raw));

  // Install commands are located first so a bare reference inside one is not counted
  // twice — the command is judged by rule 1, which is stricter. A match contained
  // inside a span another rule-1 pattern already claimed is the same instruction
  // written a second way ("npm install pkg@V" is also "install pkg@V"), so it is
  // reported once, by whichever pattern reached it first.
  const installSpans = [];
  const contained = (a, b) => installSpans.some(([s, e]) => a >= s && b <= e);
  for (const [what, re] of INSTALL_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const isDuplicateShape = what.startsWith('Install sentence') && contained(m.index, m.index + m[0].length);
      if (!isDuplicateShape) installSpans.push([m.index, m.index + m[0].length]);
      const v = m[1];
      const pkg = PACKAGES.find((p) => m[0].includes(p.name));
      if (ctx.latestFor(pkg?.name) === v) continue;
      if (isDuplicateShape) continue;
      report(
        `${label}:${lineOf(text, m.index)} — ${what} names ${v}; ${pkg?.name} serves ${ctx.latestFor(pkg?.name)}` +
          (ctx.isDeprecated(pkg?.name, v) ? ` and ${v} is a deprecated release` : ''),
      );
    }
  }
  const insideInstall = (i) => installSpans.some(([a, b]) => i >= a && i < b);

  for (const [what, re] of PIN_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const v = m[1];
      if (ctx.anyLatest(v)) continue;
      report(
        `${label}:${lineOf(text, m.index)} — ${what} names ${v}; the releases on the indexes are ${ctx.latestList()}`,
      );
    }
  }

  for (const [what, re] of BARE_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (insideInstall(m.index)) continue;
      const v = m[1];
      const pkg = PACKAGES.find((p) => m[0].includes(p.name));
      if (!pkg) continue;
      if (ctx.latestFor(pkg.name) === v || ctx.isServed(pkg.name, v)) continue;
      report(
        `${label}:${lineOf(text, m.index)} — ${what} names ${v}, a release ${pkg.name} does not serve on ${pkg.index}`,
      );
    }
  }

  // Rule 7 — our own name in an install command must resolve on the index named for it.
  for (const spec of installSpecs(text)) {
    if (ctx.indexHas(spec.index, spec.name)) continue;
    report(
      `${label} — an install command names ${spec.name} on ${spec.index}, which returns 404. A stranger copies that line before they read this message.`,
    );
  }

  for (const v of avoidVersions(text)) discouraged.add(v);
}

// Rule 6 — JSON cards that pair a package with a version. Structural, not textual: the
// two fields sit in different lines and prose patterns cannot see the pairing.
const PACKAGE_KEY = /^(package|package_name|packageName|npm_package|pip_package)$/;

function packageVersionPairs(node, path = '', out = []) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => packageVersionPairs(v, `${path}/${i}`, out));
    return out;
  }
  if (!node || typeof node !== 'object') return out;
  const pkgName = Object.keys(node)
    .filter((k) => PACKAGE_KEY.test(k) && typeof node[k] === 'string')
    .map((k) => node[k])
    .find((v) => PACKAGES.some((p) => p.name === v));
  if (pkgName && typeof node.version === 'string' && /^\d+\.\d+\.\d+$/.test(node.version))
    out.push({ path, name: pkgName, version: node.version });
  for (const k of Object.keys(node)) {
    if (k !== 'version') packageVersionPairs(node[k], `${path}/${k}`, out);
  }
  return out;
}

function judgeCard(jsonText, label, ctx, report) {
  let doc;
  try {
    doc = JSON.parse(jsonText);
  } catch {
    return; // not valid JSON: other guards own that
  }
  for (const pair of packageVersionPairs(doc)) {
    const pkg = PACKAGES.find((p) => p.name === pair.name);
    if (!pkg) continue;
    if (ctx.latestFor(pkg.name) === pair.version) continue;
    report(
      `${label} ${pair.path || '(root)'} — the machine-readable card pairs ${pkg.name} with ${pair.version}; ${pkg.index} serves ${ctx.latestFor(pkg.name)}. A partner's tool parses this field and installs what it says.`,
    );
  }
}

// ---------------------------------------------------------------- context

function makeContext({ latest, served, deprecated, indexNames, tarballs }) {
  return {
    latestFor: (name) => latest[name],
    isServed: (name, v) => (served[name] || new Set()).has(v),
    isDeprecated: (name, v) => (deprecated[name] || new Set()).has(v),
    anyLatest: (v) => Object.values(latest).includes(v),
    latestList: () =>
      Object.entries(latest)
        .map(([n, v]) => `${n} ${v}`)
        .join(', '),
    indexHas: (index, name) => (indexNames[index] || new Set()).has(name),
    downloadable: (name, v) => tarballs[`${name}@${v}`],
  };
}

const EMPTY_CONTEXT = makeContext({
  latest: Object.fromEntries(PACKAGES.map((p) => [p.name, '9.9.9'])),
  // Fixture releases. npm serves 1.2.0 of the Node verifier; PyPI never did, which is
  // what makes the SECURITY.md shape below a real regression and not a mood.
  served: {
    [NPM_PKG]: new Set(['9.9.9', '1.2.0', '1.3.0', '1.5.0', '1.6.0', '1.7.0']),
    [PY_PKG]: new Set(['9.9.9', '1.5.0', '1.6.0', '1.7.0']),
    'apex-psi-mcp': new Set(['9.9.9', '1.1.2', '1.2.0', '1.2.1', '1.2.2']),
  },
  deprecated: { [NPM_PKG]: new Set(['1.2.0', '1.3.0', '1.5.0']) },
  indexNames: { npm: new Set([NPM_PKG, 'apex-psi-mcp']), pypi: new Set([PY_PKG]) },
  tarballs: {},
});

// ---------------------------------------------------------------- self-test

// Each shape the guard is supposed to bite on, and the version it must find. An
// adversary sent the first two on 19 Nov 2026; the npx and upgrade shapes are the blind
// spots this guard was found to have on the same day. A later edit that weakens a pattern
// fails here.
const ATTACKS = [
  { group: 'install', raw: 'npm i -g apex-psi-verifier@1.3.0', v: '1.3.0' },
  { group: 'install', raw: 'npm install --global apex-psi-verifier@1.3.0', v: '1.3.0' },
  { group: 'install', raw: 'npm i -g apex-psi-verifier@v1.3.0', v: '1.3.0' },
  { group: 'install', raw: 'pnpm add apex-psi-verifier@1.3.0', v: '1.3.0' },
  { group: 'install', raw: 'yarn add apex-psi-verifier@1.3.0', v: '1.3.0' },
  { group: 'install', raw: 'pip install --upgrade psi-verifier==1.3.0', v: '1.3.0' },
  { group: 'install', raw: 'npm i apex-psi-verifier@1.3.0', v: '1.3.0' },
  // The stale pins in docs/DROP-IN.md, in the exact client-config shape they were written
  // in — quotes, commas and a newline between the launcher and the version.
  {
    group: 'install',
    raw: '"command": "npx",\n        "args": ["-y", "apex-psi-mcp@1.1.2"]',
    v: '1.1.2',
    pkg: 'apex-psi-mcp',
  },
  { group: 'install', raw: 'npx -y apex-psi-mcp@1.2.1', v: '1.2.1', pkg: 'apex-psi-mcp' },
  { group: 'install', raw: 'npm install apex-psi-mcp@1.1.2 --save', v: '1.1.2', pkg: 'apex-psi-mcp' },
  { group: 'install', raw: 'Install apex-psi-verifier@1.6.0.', v: '1.6.0' },
  { group: 'pin', raw: 'so pin **1.3.0**', v: '1.3.0' },
  { group: 'pin', raw: 'so pin `1.3.0`', v: '1.3.0' },
  { group: 'pin', raw: 'so pin v1.3.0', v: '1.3.0' },
  { group: 'pin', raw: '`psi-verifier` 1.3.0 is published on PyPI', v: '1.3.0' },
  { group: 'pin', raw: '`apex-psi-verifier` 1.3.0 is on npm', v: '1.3.0' },
  { group: 'pin', raw: '`apex-psi-verifier` 1.3.0 is now `latest`', v: '1.3.0' },
  { group: 'pin', raw: 'Upgrade to 1.6.0 or later.', v: '1.6.0' },
  { group: 'pin', raw: 'Superseded by 1.6.0, which adds R13.2.', v: '1.6.0' },
];

// Text that must NOT be read as an install or pin instruction. A guard that flags
// ordinary prose is a guard people turn off.
const CLEAN = [
  { group: 'install', raw: 'npm install' },
  { group: 'install', raw: 'npm i' },
  { group: 'install', raw: 'run npm install in this repository' },
  { group: 'install', raw: 'pip install' },
  { group: 'install', raw: 'npx -y apex-psi-mcp' },
  { group: 'install', raw: 'npm install ./packages/psi-sdk' },
  { group: 'install', raw: 'the npm package `apex-psi-mcp` runs five tools' },
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
    while ((m = re.exec(text)) !== null) out.push({ what, v: m[1], m: m[0] });
  }
  return out;
}

function selfTest() {
  const failures = [];

  for (const a of ATTACKS) {
    const hits = findVersions(a.raw, a.group);
    if (!hits.some((h) => h.v === a.v))
      failures.push(`MISSED [${a.group}] ${JSON.stringify(a.raw)} — expected ${a.v}`);
    // A qualified pattern must attribute the version to the package it named.
    if (a.pkg && !hits.some((h) => h.m.includes(a.pkg)))
      failures.push(`WRONG PACKAGE [${a.group}] ${JSON.stringify(a.raw)} — not attributed to ${a.pkg}`);
  }

  for (const c of CLEAN) {
    const hits = findVersions(c.raw, c.group);
    if (hits.length)
      failures.push(
        `FALSE POSITIVE [${c.group}] ${JSON.stringify(c.raw)} — read as ${hits
          .map((h) => `${h.what}=${h.v}`)
          .join(', ')}`,
      );
  }

  // Rules 1–3 and 7 judged end to end against an injected index that reads nothing.
  const collect = () => {
    const out = [];
    return { report: (p) => out.push(p), out };
  };

  const staleInstall = collect();
  judgeText('npm i apex-psi-verifier@1.3.0', 'stale.md', EMPTY_CONTEXT, staleInstall.report, new Set());
  if (!staleInstall.out.some((p) => p.includes('1.3.0')))
    failures.push('RULE 1 DID NOT FIRE on an install command naming a non-latest release');

  const stalePin = collect();
  judgeText('Upgrade to 1.6.0 or later.', 'notices.json', EMPTY_CONTEXT, stalePin.report, new Set());
  if (!stalePin.out.some((p) => p.includes('1.6.0')))
    failures.push('RULE 2 DID NOT FIRE on "upgrade to" naming a release that is not latest');

  const invented = collect();
  judgeText('apex-psi-mcp@8.1.4 is the door', 'x.md', EMPTY_CONTEXT, invented.report, new Set());
  if (!invented.out.some((p) => p.includes('8.1.4')))
    failures.push('RULE 3 DID NOT FIRE on a release no index serves');

  const deadName = collect();
  judgeText('npm i @apex/psi-verifier', 'y.md', EMPTY_CONTEXT, deadName.report, new Set());
  if (!deadName.out.some((p) => p.includes('@apex/psi-verifier')))
    failures.push('RULE 7 DID NOT FIRE on an install command naming a package that 404s');

  const realName = collect();
  judgeText(
    "npm install 'smolagents[mcp]' and npx -y apex-psi-mcp",
    'z.md',
    EMPTY_CONTEXT,
    realName.report,
    new Set(),
  );
  if (realName.out.length)
    failures.push(`RULE 7 FALSE POSITIVE on third-party and unpinned launches: ${realName.out[0]}`);

  const servedRelease = collect();
  judgeText(
    'the npm door apex-psi-mcp@1.2.1 predates the annotations; 1.2.2 carries them',
    'history.md',
    EMPTY_CONTEXT,
    servedRelease.report,
    new Set(),
  );
  if (servedRelease.out.length)
    failures.push(
      `RULE 3 FALSE POSITIVE on prose naming a real earlier release: ${servedRelease.out[0]}`,
    );

  // `psi-verifier` is a substring of `apex-psi-verifier`. SECURITY.md writes an npm
  // release, and the guard read it as a PyPI claim for a version PyPI never served.
  const wrongIndex = collect();
  judgeText(
    '`apex-psi-verifier@1.2.0` and earlier report whether a seal is well formed.',
    'SECURITY.md',
    EMPTY_CONTEXT,
    wrongIndex.report,
    new Set(),
  );
  if (wrongIndex.out.length)
    failures.push(
      `RULE 3 read an npm release as a PyPI claim: ${wrongIndex.out[0]} — the package name needs a left boundary`,
    );

  // Rule 6 — the JSON pairing, driven by the shape the cards actually use.
  const cardProblems = collect();
  judgeCard(
    JSON.stringify({ licensing: { verifier: { package: 'apex-psi-verifier', version: '1.6.0' } } }),
    'psi-schema.json',
    EMPTY_CONTEXT,
    cardProblems.report,
  );
  if (!cardProblems.out.some((p) => p.includes('1.6.0')))
    failures.push('RULE 6 DID NOT FIRE on a card pairing apex-psi-verifier with a stale version');

  const cardOk = collect();
  judgeCard(
    JSON.stringify({
      alternative_installs: [{ package: 'apex-psi-mcp', version: '9.9.9' }],
    }),
    'server.json',
    EMPTY_CONTEXT,
    cardOk.report,
  );
  if (cardOk.out.length) failures.push(`RULE 6 FALSE POSITIVE on a current card: ${cardOk.out[0]}`);

  const serverName = collect();
  judgeCard(
    JSON.stringify({ name: 'apex-psi', version: '0.2.0', description: 'hosted connector' }),
    'server-card.json',
    EMPTY_CONTEXT,
    serverName.report,
  );
  if (serverName.out.length)
    failures.push(
      `RULE 6 read a server NAME as a PACKAGE claim: ${serverName.out[0]} — only package fields are ours to judge`,
    );

  console.log(
    `version-truth-check self-test: ${ATTACKS.length} attack shape(s), ${CLEAN.length} clean string(s), 8 rules`,
  );
  if (failures.length) {
    for (const f of failures) console.log(`FAIL ${f}`);
    console.log(`\nversion-truth-check: ${failures.length} self-test failure(s).`);
    process.exit(1);
  }
  console.log('version-truth-check: every attack shape is caught, and every rule bites on its own.');
}

if (process.argv.includes('--self-test')) {
  selfTest();
  process.exit(0);
}

// ---------------------------------------------------------------- registries

async function readNpm(pkg) {
  const res = await readJson(`https://registry.npmjs.org/${pkg.name}`);
  if (res.error) return { error: `npm ${pkg.name}: cannot read the registry — ${res.error}` };
  const j = res.json || {};
  const latest = j['dist-tags']?.latest;
  const servedSet = new Set(Object.keys(j.versions || {}));
  const tarball = latest ? j.versions?.[latest]?.dist?.tarball : null;
  const names = new Set([pkg.name]);
  return {
    latest,
    served: servedSet,
    fileUrl: tarball,
    names,
    releases: Object.keys(j.versions || {}).length,
  };
}

async function readPypi(pkg) {
  const res = await readJson(`https://pypi.org/pypi/${pkg.name}/json`);
  if (res.error) return { error: `PyPI ${pkg.name}: cannot read the registry — ${res.error}` };
  const j = res.json || {};
  const latest = j.info?.version;
  const servedSet = new Set(Object.keys(j.releases || {}));
  if (latest) servedSet.add(latest);
  const fileUrl = j.urls?.[0]?.url || null;
  return {
    latest,
    served: servedSet,
    fileUrl,
    names: new Set([pkg.name]),
    releases: servedSet.size,
  };
}

// Rule 8 — the release the index calls latest must be downloadable. A HEAD that fails is
// re-probed with a GET before we call it broken, because one edge response is not a defect
// in the artefact and a guard that cries once gets muted.
async function isDownloadable(url) {
  if (!url) return false;
  const head = await fetch(url, {
    method: 'HEAD',
    headers: { 'User-Agent': 'apex-psi-version-truth-check' },
    signal: AbortSignal.timeout(20_000),
  }).catch(() => ({ ok: false }));
  if (head.ok) return true;
  const get = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': 'apex-psi-version-truth-check' },
    signal: AbortSignal.timeout(30_000),
  })
    .then((r) => {
      r.body?.cancel?.().catch(() => {});
      return r.ok;
    })
    .catch(() => false);
  return get;
}

const results = {};
const problems = [];

for (const pkg of PACKAGES) {
  const r = pkg.index === 'npm' ? await readNpm(pkg) : await readPypi(pkg);
  if (r.error) {
    console.log(`FAIL ${r.error}`);
    console.log('\nversion-truth-check: an index could not be read, so nothing was checked.');
    process.exit(1);
  }
  results[pkg.name] = r;
  console.log(`${pkg.index.padEnd(4)} ${pkg.name} latest = ${r.latest} (${r.releases} release(s))`);
}

// Rule 5 — the two free verifiers must serve the same version.
const [nv, pv] = [results[NPM_PKG]?.latest, results[PY_PKG]?.latest];
if (nv && pv && nv !== pv) {
  problems.push(
    `the two free verifiers serve different versions — npm says ${nv}, PyPI says ${pv}. Publish them together, or an install instruction can only be right about one of them.`,
  );
}

// Rule 8 — every watched latest must have bytes behind it.
const downloadable = {};
for (const pkg of PACKAGES) {
  const r = results[pkg.name];
  const ok = await isDownloadable(r.fileUrl);
  downloadable[`${pkg.name}@${r.latest}`] = ok;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${pkg.name}@${r.latest} ${ok ? 'downloads' : 'is advertised as latest but the index cannot serve the file'} (${r.fileUrl || 'no url'})`,
  );
  if (!ok) {
    problems.push(
      `${pkg.index} advertises ${pkg.name}@${r.latest} as latest, but ${r.fileUrl || 'its file'} is not downloadable. ` +
        `Every install line we publish for ${pkg.name} fails on a stranger's machine while our own manifest says the release exists. ` +
        `Measured 19 Nov 2026: this exact state held for apex-psi-verifier@1.7.0 for five days and no guard that read the manifest could see it.`,
    );
  }
}

// ---------------------------------------------------------------- notices

let notices = {};
try {
  notices = JSON.parse(readFileSync(NOTICE_FILE, 'utf8'));
} catch (e) {
  problems.push(`cannot read ${NOTICE_FILE}: ${e.message}`);
}
const npmServed = results[NPM_PKG]?.served || new Set();
const deprecated = new Set(
  Object.keys(notices).filter((v) => /^\d+\.\d+\.\d+$/.test(v) && v !== results[NPM_PKG]?.latest),
);
const deprecatedByPackage = { [NPM_PKG]: deprecated };
const nonReleases = Object.keys(notices).filter((v) => !/^\d+\.\d+\.\d+$/.test(v));
console.log(
  `notices: ${[...deprecated].join(', ') || 'none'}` +
    (nonReleases.length ? ` (non-release: ${nonReleases.join(', ')})` : ''),
);
for (const v of deprecated) {
  if (!npmServed.has(v)) {
    problems.push(
      `${NOTICE_FILE} deprecates ${v}, which npm does not serve for ${NPM_PKG} — the label cannot be on a release that was never published.`,
    );
  }
}

const ctx = makeContext({
  latest: Object.fromEntries(PACKAGES.map((p) => [p.name, results[p.name]?.latest])),
  served: Object.fromEntries(PACKAGES.map((p) => [p.name, results[p.name]?.served || new Set()])),
  deprecated: deprecatedByPackage,
  indexNames: {
    npm: new Set(PACKAGES.filter((p) => p.index === 'npm').map((p) => p.name)),
    pypi: new Set(PACKAGES.filter((p) => p.index === 'pypi').map((p) => p.name)),
  },
  tarballs: downloadable,
});

// ---------------------------------------------------------------- surfaces

const files = [];
for (const root of ROOTS) files.push(...walk(root));
for (const f of EXTRA_FILES) files.push(f);

const seen = new Set();
const addProblem = (p) => {
  if (seen.has(p)) return;
  seen.add(p);
  problems.push(p);
};

const discouraged = new Set();
let scanned = 0;

for (const file of files) {
  if (HISTORY_FILES.has(file)) {
    console.log(`SKIP ${file} (dated correction history)`);
    continue;
  }
  const raw = readIfPresent(file);
  if (raw === null) continue;
  scanned++;
  judgeText(raw, file, ctx, addProblem, discouraged);
  if (file.endsWith('.json')) judgeCard(raw, file, ctx, addProblem);
}

console.log(`scanned ${scanned} public surface file(s)`);

// Rule 4 — a deprecated release the copy never warns about is a release a stranger can
// still install on purpose, believing it is current.
for (const v of deprecated) {
  if (!discouraged.has(v)) {
    addProblem(
      `${NOTICE_FILE} records ${v} as deprecated, but no public surface tells a reader to avoid it`,
    );
  }
}
for (const v of discouraged) {
  if (deprecated.has(v)) continue;
  addProblem(
    `the copy tells readers to avoid ${v}, but ${NOTICE_FILE} does not record it as a deprecated release`,
  );
}

if (problems.length) {
  console.log('');
  for (const p of problems) console.log(`FAIL ${p}`);
  console.log(`\nversion-truth-check: ${problems.length} problem(s).`);
  process.exit(1);
}
console.log(
  '\nversion-truth-check: every public surface names the version the registries serve, every package named installs, and every latest has bytes.',
);
