// A page may not advertise a tool its server does not answer, and a number of tools may not be
// printed without saying WHICH door it belongs to.
//
// Why this guard had to exist. APEX PSI runs two MCP servers over one ledger: the npm package
// (stdio, five tools, no account) and the hosted connector (streamable-http, six tools, OAuth).
// Until 23 Oct our own /mcp page printed one merged list — the hosted connector's names sitting
// beside `npx -y apex-psi-mcp` — and a third-party directory scraped that page and published
// "6 tools" against our npm version number. An agent that installed the package and called
// verify_hash got "unknown tool", and it got it from a page that a directory had just graded
// Grade A. Two files that looked like prose were in fact a contract with every AI client.
//
// What it refuses:
//   1. a tool name that neither server answers (an invented door);
//   2. a tool count typed without naming the door it counts;
//   3. hosted-only names in a file that never mentions the hosted door or its sign-in;
//   4. npm-only names (verify_chain, cite, anchor) in a file that never mentions npm/stdio;
//   5. src/lib/mcp-surfaces.ts, the single source both pages quote, disagreeing with the
//      measured sets — hosted tools from the SDK-generated .lovable/mcp/manifest.json, package
//      tools from a real tools/list call recorded in public/.well-known/mcp/local-tools.json.
//
// Usage:
//   node scripts/tool-name-check.mjs              # check the working tree
//   node scripts/tool-name-check.mjs --ref origin/main   # prove the guard catches the old tree
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REF = process.argv.includes('--ref')
  ? process.argv[process.argv.indexOf('--ref') + 1]
  : null;

const MANIFEST = '.lovable/mcp/manifest.json';
const EVIDENCE = 'public/.well-known/mcp/local-tools.json';
const SURFACES = 'src/lib/mcp-surfaces.ts';
const DIRS = ['src', 'public'];
const TEXT_EXT = /\.(tsx?|jsx?|json|html|md|txt)$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.lovable']);

let measuredHosted = [];
let measuredPackage = [];
let packageVersion = 'unknown';
try {
  const m = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  measuredHosted = m.mcp.tools.map((t) => t.name);
} catch (e) {
  console.log(`FATAL: cannot read the hosted manifest (${MANIFEST}): ${e.message}`);
  process.exit(1);
}
try {
  const ev = JSON.parse(readFileSync(EVIDENCE, 'utf8'));
  measuredPackage = ev.tools.map((t) => t.name);
  packageVersion = ev.version;
} catch (e) {
  console.log(`FATAL: no package evidence (${EVIDENCE}); run: node empire/build-mcp-cards.mjs`);
  process.exit(1);
}

const HOSTED_ONLY = measuredHosted.filter((n) => !measuredPackage.includes(n));
const PACKAGE_ONLY = measuredPackage.filter((n) => !measuredHosted.includes(n));
const KNOWN = new Set([...measuredHosted, ...measuredPackage]);
// Every name a surface has ever claimed as an MCP tool but no server answers. `notarize` is NOT
// on this list: it is the REST endpoint /v1/notarize and ordinary product vocabulary, and the
// first draft of this guard flagged eleven honest files for it. The rule only ever applies to
// text that is talking about MCP tools, and never to src/lib/mcp — that directory is the hosted
// server's own implementation, not an advertisement of it.
const RETIRED = ['verify_hash_v2', 'check_anchor', 'get_stats', 'seal_decision', 'list_proofs', 'fetch_receipt'];

// A file is in scope when it makes an MCP claim, not merely when it contains an English word.
const MCP_SCOPE = /\bMCP\b|Model Context Protocol|tools\/list|apex-psi-mcp|streamable-http|\.well-known\/mcp|mcp-surfaces/i;
const OUT_OF_SCOPE = [/^src\/lib\/mcp\//, /^public\/\.well-known\/mcp\/local-tools\.json$/];

const read = (path) =>
  REF ? execFileSync('git', ['show', `${REF}:${path}`, ], { encoding: 'utf8' }) : readFileSync(path, 'utf8');

const listFiles = () => {
  if (REF) {
    return execFileSync('git', ['ls-tree', '-r', '--name-only', REF, '--', ...DIRS], { encoding: 'utf8' })
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s && TEXT_EXT.test(s));
  }
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (!SKIP_DIRS.has(entry) && !entry.startsWith('.')) walk(p);
      } else if (TEXT_EXT.test(entry)) out.push(p.replace(/\\/g, '/'));
    }
  };
  for (const d of DIRS) {
    try {
      walk(d);
    } catch {
      /* directory absent in this tree */
    }
  }
  return out;
};

let fatal = 0;
const fail = (where, what, detail) => {
  console.log(`FAIL ${where}: ${what}\n      ${detail}`);
  fatal++;
};

console.log(`measured truth — hosted (${measuredHosted.length}): ${measuredHosted.join(', ')}`);
console.log(`                 package (${measuredPackage.length}, v${packageVersion}): ${measuredPackage.join(', ')}`);
console.log(REF ? `scanning ${REF}` : 'scanning the working tree');

// Rule 5 first: the module both pages quote must equal the measured sets, or every page that
// trusts it inherits the drift instead of catching it.
if (!REF) {
  const src = readFileSync(SURFACES, 'utf8');
  const grab = (marker) => {
    const at = src.indexOf(marker);
    if (at < 0) return null;
    const block = src.slice(at, src.indexOf('];', at));
    return [...block.matchAll(/name:\s*"([a-z_]+)"/g)].map((m) => m[1]);
  };
  const localList = grab('LOCAL_TOOLS');
  const hostedList = grab('HOSTED_TOOLS');
  if (!localList || localList.sort().join(',') !== [...measuredPackage].sort().join(',')) {
    fail(SURFACES, 'LOCAL_TOOLS is not the package\'s measured set', `[${localList}] vs [${measuredPackage}]`);
  }
  if (!hostedList || hostedList.sort().join(',') !== [...measuredHosted].sort().join(',')) {
    fail(SURFACES, 'HOSTED_TOOLS is not the connector\'s measured set', `[${hostedList}] vs [${measuredHosted}]`);
  }
}

const WORDS = {
  hosted: /hosted|streamable-http|OAuth|supabase\.co\/functions\/v1\/mcp|\/functions\/v1\/mcp/i,
  npm: /\bnpm\b|apex-psi-mcp|stdio|npx -y/i,
};

const files = listFiles();
for (const path of files) {
  let text;
  try {
    text = read(path);
  } catch {
    continue;
  }
  if (OUT_OF_SCOPE.some((re) => re.test(path))) continue;
  if (!MCP_SCOPE.test(text)) continue;

  // Comments are not served. A file explaining a defect ("this is how \"6 tools\" got printed")
  // must not be refused for quoting it, and a code comment naming a hosted tool is documentation
  // rather than an advertisement. Only the rendered or shipped text is held to the rules, so the
  // comment lines are dropped before scanning — for .txt/.json/.html, where there is no comment
  // syntax, nothing is dropped and every word is a claim.
  const isCode = /\.(tsx?|jsx?)$/.test(path);
  const body = isCode
    ? text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
        .join('\n')
    : text;

  for (const dead of RETIRED) {
    if (new RegExp(`\\b${dead}\\b`).test(body)) {
      fail(path, 'names a tool no server answers', `"${dead}" is retired; no surface publishes it`);
    }
  }

  const named = [...body.matchAll(/\b(seal|verify|verify_hash|anchor|anchor_status|cite|verify_chain|list_attestations|ledger_stats|protocol_info)\b/g)]
    .map((m) => m[1])
    .filter((n, i, a) => a.indexOf(n) === i);
  // `verify` and `seal` are real English words on a website, so only the tool-shaped mentions
  // count: a bare word inside prose is not a claim about an MCP tool.
  const toolish = named.filter((n) => !(n === 'verify' || n === 'seal' || n === 'anchor' || n === 'cite'));
  const hostedHere = toolish.filter((n) => HOSTED_ONLY.includes(n));
  const npmHere = toolish.filter((n) => PACKAGE_ONLY.includes(n));

  if (hostedHere.length && !WORDS.hosted.test(body)) {
    fail(path, 'advertises hosted-connector tools without naming that door', `${hostedHere.join(', ')} appear with no mention of hosted/streamable-http/OAuth`);
  }
  if (npmHere.length && !WORDS.npm.test(body)) {
    fail(path, 'advertises npm-package tools without naming that door', `${npmHere.join(', ')} appear with no mention of npm/stdio/npx`);
  }

  // The drift this exists for was a page hand-writing its own tool list. A hand-written list
  // cannot fail when the server changes, so a second list beside the measured ones is refused:
  // pages import from src/lib/mcp-surfaces.ts and the count falls out of the array.
  if (path !== SURFACES && !/^scripts\//.test(path)) {
    const listDecl = /(?:const|let)\s+([A-Z_a-z]+)\s*(?::\s*[A-Za-z<>\[\]\s]*)?=\s*\[([\s\S]{0,4000}?)\]/g;
    for (const m of body.matchAll(listDecl)) {
      const [, name, body] = m;
      if (name === 'TOOLS' || name === 'LOCAL_TOOLS' || name === 'HOSTED_TOOLS') {
        fail(path, 'declares its own MCP tool list', `const ${name} = [ … ] — import the measured list from ${SURFACES} instead`);
      }
    }
  }

  // A count is a claim about one door. Refuse a bare count, however it is spelled.
  const countRe = /\b(?:six|five|four|4|6|5)\s+(?:hosted\s+|npm\s+|OAuth-protected\s+|stdio\s+)?tools?\b|\btools? exposed to the agent\b/gi;
  for (const m of body.matchAll(countRe)) {
    const line = body.slice(0, m.index).split('\n').length;
    const window = body.slice(Math.max(0, m.index - 260), m.index + 260);
    const saysDoor = /hosted|OAuth|npm|stdio|door/i.test(window);
    if (!saysDoor) {
      fail(path, 'prints a tool count without saying which door it counts', `line ~${line}: "${m[0]}"`);
    }
  }
  const spelled = body.match(/\b(?:verify|seal|anchor|cite)\b[^.\n]{0,40}\b(?:six|6) tools\b/i);
  if (spelled) {
    fail(path, 'ties the install command to a count the package does not deliver', `"${spelled[0]}"`);
  }
}

if (fatal) {
  console.log(`\ntool-name-check: ${fatal} finding(s). A page an agent reads is an interface, not copy.`);
  process.exit(1);
}
console.log(`\ntool-name-check: ${files.length} files advertise only the ${measuredPackage.length + measuredHosted.length - 1} names two real servers answer, every count names its door.`);
