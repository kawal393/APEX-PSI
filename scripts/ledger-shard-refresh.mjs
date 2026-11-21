#!/usr/bin/env node
// Keep the git copy of the public ledger current, and refuse to publish a copy that
// moved the wrong way.
//
// Usage:
//   node scripts/ledger-shard-refresh.mjs              # fetch, rebuild, gate, print
//   node scripts/ledger-shard-refresh.mjs --publish    # ... and commit + push if every gate is green
//
// Why the gates are the whole point: ledger-shards/ is the only ledger artefact that
// survives losing Lovable or GitHub. A refresh that silently swallowed a row, gained a
// gap, or republished a signature no published key covers would put a WORSE copy on
// GitHub than the one already there — and the worse copy is the one a stranger verifies.
// So every run compares itself against the manifest it is replacing:
//
//   R1 FETCH      the door answered and carried rows
//   R2 SIGS       every row verifies under a published key
//   R3 DUPES      no sequence appears twice
//   R4 GAPS       the gap set is exactly the one already documented
//   R5 NO-LOSS    every sequence the old copy held, the new copy still holds
//   R6 GROW       rows and the high-water sequence never go backwards
//   R7 OFFLINE    scripts/offline-verify-from-git.mjs still says PASS on the new shards
//
// R4 is deliberately rigid. If the door ever returns sequence 5463, that is news that
// contradicts ledger-shards/README.md and AGENTS.md, and a script must not be the one
// that quietly rewrites that story.
//
// No credential is read, printed or stored here. Pushing uses whatever git remote the
// working copy already has.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const PUBLISH = argv.includes('--publish');
const SOURCE =
  argv.find((a) => a.startsWith('--source='))?.slice(9) ||
  'https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/audit-mirror?limit=700';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHARDS = path.join(ROOT, 'ledger-shards');
const MANIFEST = path.join(SHARDS, 'manifest.json');
const ROOTS = path.join(SHARDS, 'ROOTS.tsv');

const git = (args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' }).trim();
const readManifest = () => (fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : null);

const before = readManifest();

// ---- R1: the door has to answer before anything else is considered -------------
let shardRun;
try {
  shardRun = execFileSync('node', [path.join(ROOT, 'scripts', 'ledger-git-shards.mjs'), SOURCE, SHARDS, '--merge'], {
    encoding: 'utf8',
    cwd: ROOT,
  });
} catch (e) {
  console.log('R1 FETCH      : FAIL — the shard publisher did not complete');
  console.log(String(e.stdout || e.message).trim().split('\n').slice(-6).join('\n'));
  process.exit(1);
}
const after = readManifest();
console.log(shardRun.trim());
console.log('');

const gapsNow = (after.gaps || []).slice().sort((a, b) => a - b);
const gapsThen = before ? (before.gaps || []).slice().sort((a, b) => a - b) : null;
const present = new Set();
for (const f of fs.readdirSync(SHARDS).filter((n) => n.endsWith('.ndjson'))) {
  for (const line of fs.readFileSync(path.join(SHARDS, f), 'utf8').trim().split('\n')) {
    present.add(JSON.parse(line).sequence_number);
  }
}

// R5 rebuilds the old copy's promised sequence set from the old manifest and checks each
// one is still on disk — a shard that failed to parse or got dropped would be caught here.
let lost = [];
if (before) {
  const known = new Set(gapsThen);
  for (let s = before.sequences.min; s <= before.sequences.max; s++) if (!known.has(s) && !present.has(s)) lost.push(s);
}

const checks = [
  ['R1 FETCH', (after.source_rows || 0) > 0, `${after.source_rows} row(s) from the door, ${after.rows} in the git copy after merge`],
  ['R2 SIGS', after.signatures.unverifiable === 0, `${after.signatures.unverifiable} row(s) not covered by a published key`],
  ['R3 DUPES', after.duplicate_sequences === 0, `${after.duplicate_sequences} duplicate sequence(s)`],
  [
    'R4 GAPS',
    gapsThen === null ? true : gapsNow.join(',') === gapsThen.join(','),
    gapsThen === null ? `baseline set: ${gapsNow.length ? gapsNow.join(',') : 'none'}` : `was ${gapsThen.join(',') || 'none'}, now ${gapsNow.join(',') || 'none'}`,
  ],
  ['R5 NO-LOSS', lost.length === 0, lost.length ? `missing: ${lost.slice(0, 20).join(', ')}` : `${present.size} sequences all still on disk`],
  [
    'R6 GROW',
    !before || (after.rows >= before.rows && after.sequences.max >= before.sequences.max),
    `${before ? before.rows : 0} -> ${after.rows} rows, high water ${before ? before.sequences.max : 0} -> ${after.sequences.max}`,
  ],
];

// ---- R7: the offline proof must still pass on the bytes we just wrote ----------
let offline = '';
let offlinePass = false;
try {
  offline = execFileSync('node', [path.join(ROOT, 'scripts', 'offline-verify-from-git.mjs')], { encoding: 'utf8', cwd: ROOT });
  offlinePass = /binary gate OFFLINE-ALL : PASS/.test(offline);
} catch (e) {
  offline = String(e.stdout || e.message);
}
checks.push(['R7 OFFLINE', offlinePass, offlinePass ? 'stranger-with-npm verifies every row in the copy' : 'offline verifier did not report PASS']);

// R8 exists because it nearly happened: `.gitignore` carries a `*.log` rule, so the
// lineage file was first named ROOTS.log and every run would have written a file git
// silently refuses to track. An untracked archive is no archive.
// `--no-index` is load-bearing: without it check-ignore stays quiet about a path that
// is already in the index, so the gate would report PASS on a file about to be ignored.
let lineageIgnored = false;
try {
  execFileSync('git', ['-C', ROOT, 'check-ignore', '-q', '--no-index', '--', path.relative(ROOT, ROOTS)], { stdio: 'pipe' });
  lineageIgnored = true;
} catch {}
let lineageTracked = false;
try { lineageTracked = git(['ls-files', '--', path.relative(ROOT, ROOTS)]).trim().length > 0; } catch {}
const lineageOnDisk = fs.existsSync(ROOTS);
checks.push([
  'R8 LINEAGE',
  !lineageIgnored && (!lineageOnDisk || lineageTracked),
  lineageIgnored
    ? `${path.basename(ROOTS)} matches a gitignore rule — the lineage would never be published`
    : lineageTracked
      ? `${path.relative(ROOT, ROOTS)} is in git's index`
      : lineageOnDisk
        ? `${path.relative(ROOT, ROOTS)} exists but is not in git's index`
        : 'first lineage line — this run will create it',
]);

// ---- the dated root line ------------------------------------------------------
// Keyed on the state, not the timestamp: a daily run over an idle ledger must add one
// line when the copy actually moved and none when it did not, or the log becomes a diary.
const state = `rows=${after.rows}\tseq=${after.sequences.min}-${after.sequences.max}\tgaps=${gapsNow.length}${gapsNow.length ? `(${gapsNow.join(',')})` : ''}\tcopy_root=${after.copy_root}`;
const lineageLine = `${new Date().toISOString().slice(0, 10)}\t${state}`;
const previous = fs.existsSync(ROOTS) ? fs.readFileSync(ROOTS, 'utf8').trim().split('\n').filter(Boolean) : [];
const lastState = previous.at(-1)?.split('\t').slice(1).join('\t');
const rootMoved = lastState !== state;

let allPass = checks.every(([, ok]) => ok);
for (const [name, ok, detail] of checks) console.log(`${name.padEnd(12)}: ${ok ? 'PASS' : 'FAIL'} — ${detail}`);
console.log(`ROOTS.tsv     : ${rootMoved ? 'append' : 'unchanged'} — ${lineageLine}`);
console.log(`\nbinary gate SHARD-REFRESH : ${allPass ? 'PASS' : 'FAIL'}`);

if (!allPass) {
  console.log('\nNot published. The previous shards on disk were replaced by this run, so check the');
  console.log('diff before the next attempt — git still holds the last passing copy.');
  process.exit(1);
}

if (rootMoved) fs.writeFileSync(ROOTS, previous.concat(lineageLine).join('\n') + '\n');

if (!PUBLISH) {
  console.log('\nno --publish: nothing committed or pushed.');
  process.exit(0);
}

const dirty = git(['status', '--porcelain', '--', 'ledger-shards', 'scripts/ledger-git-shards.mjs', 'scripts/ledger-shard-refresh.mjs']);
if (!dirty) {
  console.log('\nnothing to publish — the git copy already holds this exact ledger.');
  process.exit(0);
}

git(['add', '--', 'ledger-shards']);
git(['commit', '-m', `Refresh the git ledger copy: ${after.rows} rows, sequence ${after.sequences.min}-${after.sequences.max}`]);

// A daily run must not be the thing that creates a merge it cannot resolve. If the remote
// moved, take it only if git merges cleanly; otherwise back out and leave the decision to Master.
const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
try {
  execFileSync('git', ['-C', ROOT, 'pull', '--no-edit', 'origin', branch], { encoding: 'utf8', stdio: 'pipe' });
} catch {
  try { git(['merge', '--abort']); } catch {}
  console.log(`\nbinary gate SHARD-PUBLISH : FAIL — origin/${branch} moved in a way this run cannot merge cleanly.`);
  process.exit(1);
}
git(['push', 'origin', `HEAD:${branch}`]);
const aheadBehind = git(['rev-list', '--left-right', '--count', `origin/${branch}...HEAD`]);
console.log(`\nbinary gate SHARD-PUBLISH : PASS — origin/${branch} ${aheadBehind} (left-right), copy_root ${after.copy_root.slice(0, 16)}…`);
