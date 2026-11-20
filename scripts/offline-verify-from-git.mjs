#!/usr/bin/env node
// Prove that a stranger holding only the git copy of this repo — the ledger
// shards plus the npm-published verifier — can verify a real 2026 receipt with
// no call to APEX. Usage: node scripts/offline-verify-from-git.mjs [version]
const VER = process.argv[2] || "1.7.0";
const fs = await import('node:fs');
const path = await import('node:path');
const zlib = await import('node:zlib');

const ROOT = path.resolve(import.meta.dirname, '..');
const SHARDS = path.join(ROOT, 'ledger-shards');
const os = await import('node:os');
const CACHE = path.join(os.homedir(), '.apex-verifier-cache');

// Fetch the published package into a cache once, then verify offline from it.
fs.mkdirSync(CACHE, { recursive: true });
const tgz = path.join(CACHE, `apex-psi-verifier-${VER}.tgz`);
if (!fs.existsSync(tgz)) {
  const r = await fetch(`https://registry.npmjs.org/apex-psi-verifier/-/apex-psi-verifier-${VER}.tgz`);
  if (!r.ok) { console.error(`npm ${VER} -> HTTP ${r.status}`); process.exit(2); }
  fs.writeFileSync(tgz, Buffer.from(await r.arrayBuffer()));
}
const dir = path.join(CACHE, VER);
if (!fs.existsSync(path.join(dir, 'package', 'dist', 'index.js'))) {
  fs.mkdirSync(dir, { recursive: true });
  // Minimal tar reader: a published package is a handful of small files, and
  // depending on a system `tar` would break the proof on machines without it.
  const buf = zlib.gunzipSync(fs.readFileSync(tgz));
  for (let off = 0; off + 512 <= buf.length;) {
    const header = buf.subarray(off, off + 512);
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const size = parseInt(header.subarray(124, 136).toString('utf8').replace(/\0.*$/, '') || '0', 8);
    const type = String.fromCharCode(header[156]);
    off += 512;
    if (!name || (type !== '0' && type !== '\0')) continue;
    const out = path.join(dir, name);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf.subarray(off, off + size));
    off += Math.ceil(size / 512) * 512;
  }
}
const { pathToFileURL } = await import('node:url');
const v = await import(pathToFileURL(path.join(dir, 'package', 'dist', 'index.js')).href);

const anchorDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', '.well-known', 'apex-psi-trust-anchor.json'), 'utf8'));
const allKeys = anchorDoc.keys || [];
const ledgerKeys = allKeys.filter((k) => (k.algorithm || k.alg) === 'Ed25519' && k.status !== 'hybrid-only');
if (ledgerKeys.length === 0) { console.error('anchor lists no Ed25519 ledger key — refusing to report a pass'); process.exit(2); }
const anchorKeys = ledgerKeys.map((k) => k.public_key).filter(Boolean);
const roots = ledgerKeys.map((k) => ({ public_key: k.public_key, key_id: k.key_id }));
const npmPins = v.PSI_PUBLIC_KEY_HEXES;
const unpinned = anchorKeys.filter((k) => !npmPins.includes(k.toLowerCase()));

const rows = [];
for (const f of fs.readdirSync(SHARDS).filter((n) => n.endsWith('.ndjson')).sort()) {
  for (const line of fs.readFileSync(path.join(SHARDS, f), 'utf8').trim().split('\n')) rows.push(JSON.parse(line));
}
rows.sort((a, b) => a.sequence_number - b.sequence_number);

let passed = 0; const failures = []; let digestMismatch = 0;
for (const r of rows) {
  try {
    const rec = { ...r, signature: { alg: 'ed25519', value: r.ed25519_signature, binds: r.signature_binds || 'merkle_leaf' } };
    const res = await v.psiVerifyBinding(rec, roots);
    const reso = await v.psiResolveBinding(rec);
    if (reso.digest && reso.digest !== r.merkle_leaf_hash) digestMismatch++;
    if (res?.status === 'verified') { passed++; continue; }
    failures.push([r.sequence_number, res?.status || 'no-status', (res?.detail || '').slice(0, 70)]);
  } catch (e) { failures.push([r.sequence_number, 'throw', e.message.slice(0, 70)]); }
}

// One named row, printed in full so the verdict is checkable by hand.
const sample = rows.at(-1);
const sampleRec = { ...sample, signature: { alg: 'ed25519', value: sample.ed25519_signature, binds: sample.signature_binds || 'merkle_leaf' } };
const sampleRes = await v.psiVerifyBinding(sampleRec, roots);

console.log(`verifier used           : apex-psi-verifier ${v.PSI_VERIFIER_VERSION} (fetched from npm, cached in .verifier-cache)`);
console.log(`anchor entries / ledger keys: ${allKeys.length} / ${ledgerKeys.length} (${ledgerKeys.map((k) => `${k.key_id}:${k.status}`).join(', ')})`);
console.log(`ledger keys npm also pins : ${unpinned.length === 0 ? 'ALL' : `MISSING ${unpinned.map((k) => k.slice(0, 12)).join(', ')}`}`);
console.log(`shard rows read from git: ${rows.length}`);
console.log(`verifier status verified: ${passed}`);
console.log(`failed                  : ${failures.length}`);
console.log(`digest != stored leaf   : ${digestMismatch} (0 means the verifier rebuilds the same leaf we signed)`);
if (failures.length) console.log(`first failures          : ${failures.slice(0, 5).map((f) => f.join(' | ')).join('  ;;  ')}`);
console.log(`sample row              : seq ${sample.sequence_number} ${sample.commit_id} sealed ${sample.created_at}`);
console.log(`sample verdict          : ${JSON.stringify(sampleRes).slice(0, 240)}`);
console.log(`binary gate OFFLINE-ALL : ${failures.length === 0 && passed === rows.length && digestMismatch === 0 ? 'PASS' : 'FAIL'}`);
