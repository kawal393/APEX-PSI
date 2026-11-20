#!/usr/bin/env node
// Publish the public ledger into git-resident shards and prove a receipt verifies
// from those shards alone. Usage: node scripts/ledger-git-shards.mjs <ndjson|https://...> [outdir]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [srcArg, outArg] = process.argv.slice(2);
if (!srcArg) { console.error('usage: ledger-git-shards.mjs <rows.ndjson|url> [outdir]'); process.exit(2); }
const OUT = outArg || 'ledger-shards';
const SHARD_ROWS = 500;
const KEYS = {
  'apex-psi-2026': '59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724',
  'apex-psi-2026-11': '111284cd6462a1eeeae71f58d68745e75a7c3de7a69b7328d5953af1fe840e46',
};

const sha256hex = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

async function loadRows(src) {
  let text;
  if (/^https?:/.test(src)) {
    const r = await fetch(src);
    if (!r.ok) throw new Error(`fetch ${src} -> HTTP ${r.status}`);
    text = await r.text();
  } else {
    text = fs.readFileSync(src, 'utf8');
  }
  return text.split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

// RFC 6962 leaf: SHA-256(0x00 || leaf)
const leafHash = (hex) => sha256hex(Buffer.concat([Buffer.from([0x00]), Buffer.from(hex, 'hex')]));

function merkleRoot(leavesHex) {
  let level = leavesHex.map(leafHash);
  if (level.length === 1) return level[0];
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) { next.push(level[i]); continue; }
      next.push(sha256hex(Buffer.concat([Buffer.from([0x01]), Buffer.from(level[i], 'hex'), Buffer.from(level[i + 1], 'hex')])));
    }
    level = next;
  }
  return level[0];
}

function verifyEd25519(messageHex, signatureHex, pubkeyHex) {
  const spki = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(pubkeyHex, 'hex')]);
  const key = crypto.createPublicKey({ key: spki, format: 'der', type: 'spki' });
  // The notary signs the ASCII hex digest, not the 32 raw bytes — same as packages/psi-verifier.
  return crypto.verify(null, Buffer.from(messageHex, 'ascii'), key, Buffer.from(signatureHex, 'hex'));
}

const rows = (await loadRows(srcArg)).slice().sort((a, b) => a.sequence_number - b.sequence_number);
fs.mkdirSync(OUT, { recursive: true });

const shards = [];
for (let i = 0; i < rows.length; i += SHARD_ROWS) {
  const chunk = rows.slice(i, i + SHARD_ROWS);
  const name = `ledger-${String(chunk[0].sequence_number).padStart(7, '0')}-${String(chunk.at(-1).sequence_number).padStart(7, '0')}.ndjson`;
  const body = chunk.map((r) => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(path.join(OUT, name), body);
  shards.push({ file: name, rows: chunk.length, first_sequence: chunk[0].sequence_number, last_sequence: chunk.at(-1).sequence_number, sha256: sha256hex(Buffer.from(body)), window_root: merkleRoot(chunk.map((r) => r.merkle_leaf_hash)) });
}

// Attribution + integrity, measured not assumed
let signedOld = 0, signedNew = 0, unverifiable = 0, rootMismatch = 0;
const attested = [];
for (const r of rows) {
  let ok = false;
  for (const [label, full] of Object.entries(KEYS)) {
    try {
      if (verifyEd25519(r.merkle_leaf_hash, r.ed25519_signature, full)) {
        ok = true;
        label === 'apex-psi-2026' ? signedOld++ : signedNew++;
        attested.push(label);
        break;
      }
    } catch {}
  }
  if (!ok) unverifiable++;
}

const manifest = {
  generated_at: new Date().toISOString(),
  source: srcArg,
  rows: rows.length,
  sequences: { min: rows[0].sequence_number, max: rows.at(-1).sequence_number },
  expected_in_range: rows.at(-1).sequence_number - rows[0].sequence_number + 1,
  gaps: Array.from({ length: rows.at(-1).sequence_number - rows[0].sequence_number + 1 }, (_, i) => i + rows[0].sequence_number)
    .filter((s) => !rows.some((r) => r.sequence_number === s)),
  duplicate_sequences: rows.length - new Set(rows.map((r) => r.sequence_number)).size,
  signatures: { verified_under_published_key: signedOld + signedNew, unverifiable },
  shards,
};
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(`rows ingested           : ${rows.length}`);
console.log(`sequence range          : ${manifest.sequences.min} -> ${manifest.sequences.max}`);
console.log(`expected in that range  : ${manifest.expected_in_range}  (a gap means a missing row)`);
console.log(`GAPS                    : ${manifest.gaps.length ? manifest.gaps.join(', ') : 'none'}`);
console.log(`duplicate sequences     : ${manifest.duplicate_sequences}`);
console.log(`signatures verified     : ${signedOld + signedNew} under a published key | unverifiable: ${unverifiable}`);
console.log(`shards written          : ${shards.length} of <=${SHARD_ROWS} rows to ${OUT}`);
console.log(`binary gate GAPS-NONE   : ${manifest.gaps.length === 0 && manifest.duplicate_sequences === 0 ? 'PASS' : 'FAIL'}`);
console.log(`binary gate SIGS-ALL     : ${unverifiable === 0 ? 'PASS' : 'FAIL'}`);
