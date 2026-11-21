// notary-canary-check — the daily proof that the sealing door actually seals.
//
// Why this exists: from 19 to 22 November 2026 the runtime signing secret was
// replaced with a value whose public half the published trust anchor did not
// list. The notary refused every request with a blank 500 and nothing in the
// estate said so for four days. The reason nothing could say so is that the
// only proof of a working identity used to be a real seal — and a seal writes a
// permanent public ledger row, so it cannot be run casually by a robot.
//
// Three rules, all read-only. Every one is proven able to fail by --selftest.
//   R1 IDENTITY  the door reports an identity, and that identity is the key the
//      published anchor calls active. Catches a wrong or rotated-out secret and
//      an anchor that was never updated after a rotation.
//   R2 BINDING   every ledger row in the window verifies against a key the
//      published anchor lists, and rows signed since the active key's own
//      valid_from verify against the ACTIVE key. Catches receipts a stranger
//      cannot check, measured against the anchor rather than a hardcoded string.
//   R3 FLOW      the newest public row is not older than the silence ceiling.
//      A door that is not writing is a door nobody can prove is working.
//
// Usage: node scripts/notary-canary-check.mjs            (live, network)
//        node scripts/notary-canary-check.mjs --selftest (fabricated states)
// Exit 0 = all three rules pass. Exit 1 = a rule failed, reason printed.
// Exit 2 = could not measure (network/parse), which is never reported as a pass.

import crypto from 'node:crypto';

const SITE = 'https://www.ai-governance-standard.com';
const FUNCTIONS = 'https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1';
const ANCHOR = `${SITE}/.well-known/apex-psi-trust-anchor.json`;
const LEDGER = `${FUNCTIONS}/audit-mirror`;
const IDENTITY = `${FUNCTIONS}/signing-identity`;
const SILENCE_CEILING_HOURS = Number(process.env.APEX_CANARY_MAX_SILENCE_HOURS || 72);
const ROWS = Number(process.env.APEX_CANARY_ROWS || 60);

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function publicKeyFromHex(hexKey) {
  const der = Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(hexKey, 'hex')]);
  return crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
}

/** The notary signs the ASCII hex digest it stores, so verification uses the same bytes. */
function signatureVerifies(pubHex, messageAsciiHex, sigHex) {
  try {
    return crypto.verify(
      null,
      Buffer.from(String(messageAsciiHex), 'ascii'),
      publicKeyFromHex(pubHex),
      Buffer.from(String(sigHex), 'hex'),
    );
  } catch {
    return false;
  }
}

async function getJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'APEX-PSI-canary/1', 'Cache-Control': 'no-store' } });
  const text = await r.text();
  if (!r.ok) return { http: r.status, text };
  try {
    return { http: r.status, json: JSON.parse(text) };
  } catch {
    return { http: r.status, text };
  }
}

async function getLedgerRows(limit) {
  const r = await fetch(`${LEDGER}?limit=${limit}`, { headers: { 'Cache-Control': 'no-store' } });
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const text = await r.text();
  const rows = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      rows.push(JSON.parse(t));
    } catch {
      return { error: 'the ledger door returned a line that is not a record' };
    }
  }
  return { rows };
}

// ---- R1 --------------------------------------------------------------------
export function ruleIdentity(id) {
  if (!id) return { ok: false, what: 'the signing-identity instrument returned nothing' };
  if (id.http === 404) {
    return { ok: false, what: 'signing-identity is not deployed, so the door has never been asked which key it would sign with' };
  }
  const b = id.json;
  if (!b) return { ok: false, what: `signing-identity answered HTTP ${id.http} without a readable body` };
  if (b.secret_configured !== true) {
    return { ok: false, what: `APEX_PSI_ED25519_SEED is not configured in the runtime (${b.reason || 'no reason given'}) — every seal is refused` };
  }
  if (b.verdict !== 'SIGNS_AND_IS_PUBLISHED') {
    return { ok: false, what: `the door reports ${b.verdict}: ${b.reason || 'no reason given'}` };
  }
  return { ok: true, note: `signs under ${b.anchor_key_id} (${b.derived_ed25519_public_key.slice(0, 12)}…), which the anchor names active` };
}

// ---- R2 --------------------------------------------------------------------
export function ruleBinding(rows, anchor) {
  const keys = (anchor.keys || []).map((k) => ({
    id: String(k.key_id),
    status: String(k.status || '').toLowerCase(),
    pub: String(k.public_key || '').toLowerCase(),
    valid_from: k.valid_from,
  }));
  const listed = keys.filter((k) => /^[0-9a-f]{64}$/.test(k.pub));
  if (!listed.length) return { ok: false, what: 'the published anchor lists no usable Ed25519 key to check against' };
  const active = listed.find((k) => k.id === String(anchor.active_key_id));
  if (!active) return { ok: false, what: `anchor active_key_id "${anchor.active_key_id}" names no key the anchor lists` };

  const faults = [];
  let signedByActive = 0;
  let signedByOtherPublished = 0;
  const activeFromMs = Date.parse(active.valid_from || '0000-01-01T00:00:00Z') || 0;

  for (const row of rows) {
    const msg = String(row.signature_binds || '').includes('commit') ? row.commit_hash : row.merkle_leaf_hash;
    const sig = row.ed25519_signature;
    if (!msg || !sig) {
      faults.push(`sequence ${row.sequence_number}: row carries no signature to bind`);
      continue;
    }
    const matched = listed.filter((k) => signatureVerifies(k.pub, msg, sig));
    const at = Date.parse(row.created_at) || 0;
    if (!matched.length) {
      faults.push(
        `sequence ${row.sequence_number} (${row.commit_id}, ${row.created_at}): the signature verifies against NO key the published anchor lists — a stranger cannot verify this receipt`,
      );
      continue;
    }
    if (matched.some((k) => k.id === active.id)) {
      signedByActive++;
      continue;
    }
    signedByOtherPublished++;
    if (at && activeFromMs && at >= activeFromMs) {
      faults.push(
        `sequence ${row.sequence_number}: signed by ${matched.map((k) => k.id).join('/')} after ${active.id} became the anchor's active key (${active.valid_from}) — the anchor says one key signs and the record shows another`,
      );
    }
  }
  if (faults.length) return { ok: false, what: faults.join('\n  ') };
  return {
    ok: true,
    note: `${rows.length} row(s) checked against the published anchor: ${signedByActive} under the active key, ${signedByOtherPublished} under other published keys, 0 unverifiable`,
  };
}

// ---- R3 --------------------------------------------------------------------
export function ruleFlow(rows, nowMs, ceilingHours) {
  if (!rows.length) return { ok: false, what: 'the ledger door returned no rows at all' };
  const newest = rows.reduce((a, b) => ((Date.parse(b.created_at) || 0) > (Date.parse(a.created_at) || 0) ? b : a));
  const ageH = (nowMs - (Date.parse(newest.created_at) || 0)) / 3600000;
  if (!isFinite(ageH)) return { ok: false, what: `newest row ${newest.sequence_number} has an unparseable created_at "${newest.created_at}"` };
  if (ageH > ceilingHours) {
    return {
      ok: false,
      what: `nothing has been sealed into the public ledger for ${ageH.toFixed(1)}h (ceiling ${ceilingHours}h). Newest row: sequence ${newest.sequence_number} at ${newest.created_at}. The door is unproven — test it before telling anyone it works.`,
    };
  }
  return { ok: true, note: `newest public row is sequence ${newest.sequence_number}, ${ageH.toFixed(1)}h old (ceiling ${ceilingHours}h)` };
}

// ---- selftest --------------------------------------------------------------
export function selftest() {
  const { generateKeyPairSync } = crypto;
  const rogue = generateKeyPairSync('ed25519');
  const roguePub = rogue.publicKey
    .export({ format: 'der', type: 'spki' })
    .subarray(-32)
    .toString('hex');
  const signRogue = (msg) =>
    crypto.sign(null, Buffer.from(msg, 'ascii'), rogue.privateKey).toString('hex');

  const good = generateKeyPairSync('ed25519');
  const goodPub = good.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
  const signGood = (msg) => crypto.sign(null, Buffer.from(msg, 'ascii'), good.privateKey).toString('hex');
  const old = generateKeyPairSync('ed25519');
  const oldPub = old.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
  const signOld = (msg) => crypto.sign(null, Buffer.from(msg, 'ascii'), old.privateKey).toString('hex');

  const anchor = {
    active_key_id: 'apex-test-active',
    keys: [
      { key_id: 'apex-test-active', status: 'active', public_key: goodPub, valid_from: '2026-11-01T00:00:00Z' },
      { key_id: 'apex-test-old', status: 'rotated', public_key: oldPub, valid_from: '2026-01-01T00:00:00Z' },
    ],
  };
  const leaf = 'a'.repeat(64);
  const rows = [
    { sequence_number: 3, merkle_leaf_hash: leaf, ed25519_signature: signGood(leaf), created_at: '2026-11-20T00:00:00Z' },
    { sequence_number: 2, merkle_leaf_hash: leaf, ed25519_signature: signOld(leaf), created_at: '2026-10-20T00:00:00Z' },
  ];

  let failed = 0;
  const check = (label, got, want) => {
    const ok = got.ok === want;
    if (!ok) failed++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`);
    if (!ok) console.log(`        got ok=${got.ok}: ${got.what || got.note}`);
  };

  // The verification primitive itself: a real signature passes, a tampered one does not.
  const primitivePasses = signatureVerifies(goodPub, leaf, signGood(leaf));
  const primitiveCatchesTamper = !signatureVerifies(goodPub, 'b'.repeat(64), signGood(leaf));
  check('primitive: a genuine Ed25519 signature verifies', { ok: primitivePasses }, true);
  check('primitive: the same signature rejected on other bytes', { ok: primitiveCatchesTamper }, true);

  check('R2: rows signed by the active and a rotated published key', ruleBinding(rows, anchor), true);
  check(
    'R2: a row signed by an UNPUBLISHED key is refused',
    ruleBinding([{ sequence_number: 9, merkle_leaf_hash: leaf, ed25519_signature: signRogue(leaf), created_at: '2026-11-20T00:00:00Z' }], anchor),
    false,
  );
  check(
    'R2: a row signed by the rotated key AFTER the active key began is refused',
    ruleBinding([{ sequence_number: 9, merkle_leaf_hash: leaf, ed25519_signature: signOld(leaf), created_at: '2026-11-20T00:00:00Z' }], anchor),
    false,
  );
  check('R2: an anchor whose active_key_id names nothing is refused', ruleBinding(rows, { active_key_id: 'ghost', keys: anchor.keys }), false);
  check('R2: a row with no signature is refused', ruleBinding([{ sequence_number: 9, created_at: '2026-11-20T00:00:00Z' }], anchor), false);

  check('R1: a configured runtime whose key the anchor calls active', ruleIdentity({ json: { secret_configured: true, verdict: 'SIGNS_AND_IS_PUBLISHED', anchor_key_id: 'apex-test-active', derived_ed25519_public_key: goodPub } }), true);
  check('R1: the exact 19 Nov state (secret derives an unpublished key)', ruleIdentity({ json: { secret_configured: true, verdict: 'REFUSES_ALL_SEALS', reason: 'derived key not listed' } }), false);
  check('R1: secret absent from the runtime', ruleIdentity({ json: { secret_configured: false, verdict: 'REFUSES_ALL_SEALS' } }), false);
  check('R1: runtime signs with a key the anchor does not call active', ruleIdentity({ json: { secret_configured: true, verdict: 'ROTATION_IN_PROGRESS', reason: 'pending key' } }), false);
  check('R1: instrument not deployed', ruleIdentity({ http: 404, text: 'not found' }), false);

  const now = Date.parse('2026-11-22T00:00:00Z');
  check('R3: a row from 5 hours ago', ruleFlow([{ sequence_number: 1, created_at: '2026-11-21T19:00:00Z' }], now, 72), true);
  check('R3: the 19-22 Nov silence, three days with no rows', ruleFlow([{ sequence_number: 1, created_at: '2026-11-18T00:00:00Z' }], now, 72), false);
  check('R3: an empty ledger', ruleFlow([], now, 72), false);

  console.log(failed ? `\nSELFTEST FAILED — ${failed} rule(s) cannot fail, so their PASS would prove nothing.` : '\nSELFTEST PASS — every rule is proven able to fail.');
  return failed ? 1 : 0;
}

if (process.argv[1] && process.argv[1].endsWith('notary-canary-check.mjs')) {
  if (process.argv.includes('--selftest') || process.argv.includes('--self-test')) process.exit(selftest());

  const results = [];
  console.log(`APEX PSI sealing-door canary — ${new Date().toISOString()}`);

  const anchorRes = await getJson(ANCHOR);
  if (!anchorRes.json) {
    console.log(`FAIL  could not read the published trust anchor (HTTP ${anchorRes.http || 'no response'})`);
    process.exit(2);
  }
  const anchor = anchorRes.json;
  console.log(`anchor  active_key_id=${anchor.active_key_id} | ${anchor.keys.length} keys | served from ${ANCHOR}`);

  const idRes = await getJson(IDENTITY);
  const r1 = ruleIdentity(idRes.http === 404 ? { http: 404 } : idRes);
  results.push(r1);
  console.log(`\nR1 IDENTITY ${r1.ok ? 'PASS' : 'FAIL'}  ${r1.ok ? r1.note : r1.what}`);

  const led = await getLedgerRows(ROWS);
  if (led.error) {
    console.log(`FAIL  could not read the public ledger: ${led.error}`);
    process.exit(2);
  }
  console.log(`ledger  ${led.rows.length} newest rows, sequences ${led.rows[led.rows.length - 1]?.sequence_number}–${led.rows[0]?.sequence_number}`);

  const r2 = ruleBinding(led.rows, anchor);
  results.push(r2);
  console.log(`R2 BINDING  ${r2.ok ? 'PASS' : 'FAIL'}  ${r2.ok ? r2.note : r2.what}`);

  const r3 = ruleFlow(led.rows, Date.now(), SILENCE_CEILING_HOURS);
  results.push(r3);
  console.log(`R3 FLOW     ${r3.ok ? 'PASS' : 'FAIL'}  ${r3.ok ? r3.note : r3.what}`);

  const bad = results.filter((r) => !r.ok).length;
  console.log(bad ? `\nFAIL — ${bad} of 3 rules. The door is not proven to seal.` : '\nPASS — the door names its key, the record binds to published keys, and rows are flowing.');
  process.exit(bad ? 1 : 0);
}
