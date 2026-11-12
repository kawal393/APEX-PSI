// APEX PSI — Bitcoin anchor machine self-test.
//
// Why this exists: the anchor poller used to publish whatever transaction sat
// first in a block, and it read Bitcoin's CompactSize as a 7-bit continuation
// scheme. Three defects came out of that, and this test drives all three:
//
//   1. A proof that does not carry the digest it is filed under was treated as
//      evidence for that digest. The proof we hold for
//      draft-singh-psi-agent-02 is exactly that proof, so it must never be
//      confirmed.
//   2. A hex search that is not byte-aligned "finds" commitments that are not
//      in the proof. A half-byte hit is a coincidence, not a commitment.
//   3. A block height was published without a transaction. The height is a
//      lookup hint; without the transaction that the attestation names, there
//      is nothing to publish.
//
// The two proof fixtures below are the bytes this project actually holds: the
// calendar response stored on 6 November 2026 and the calendar's upgraded
// answer. They are kept in the test so the defect cannot come back quietly.
//
// Usage:  node --experimental-strip-types scripts/ots-anchor-selftest.ts
// Exit 0 only when every assertion holds.

import {
  extractBitcoinBlockHeight,
  proofCoversDigest,
  readBitcoinAttestation,
} from "../supabase/functions/_shared/ots.ts";

/** The digest published for draft-singh-psi-agent-02 on 6 November 2026. */
const DIGEST = "2592edc5dd4634d2ba6ee1c459d45d7372e0c6be358c2d3afe8e6353c43b68a1";

/** The calendar response stored on 6 November 2026 (172 bytes). */
const STORED_PROOF_B64 =
  "8AihPve3dcMX8QjwIImQZYZ/PEpYSp0ZrikzBJJSiFXpQC/XG/kHu7T/xSiACPAQpMdXl2ZZFdHd6MDbdoZwcwjxILQIthwPcdq4g+BYYtc/75a0Xt9crB7i6sZ0MwBKn5aOCPEEau1lafAImVrGFFDqVr8Ag9/jDS75DI4uLWh0dHBzOi8vYWxpY2UuYnRjLmNhbGVuZGFyLm9wZW50aW1lc3RhbXBzLm9yZw==";

/** The calendar's upgraded answer (930 bytes). */
const UPGRADED_PROOF_B64 =
  "CPEgVDdTLKJgUDezABuinW3vhl7Hd6XHJwltOGyYhzwVZc0I8SBXKff3rj0JmQajqh32+5wQtpHzE2Kv4ydBceWPZ0G9KgjxIBiQsqtJUIU2Yc/KDm8JbQvEAHIXwxA8FV88TFe6NzFgCPEgWVpExh4sUHmIyods0TYpGSff2ABPRHDx5c2YPmpCHF4I8CCWmW46yEM6LYqcjfzPJyWUEtolFyElPctokJHVZPHzRQjwILJQ2iFs+FaV5VLaT+B8zDy06WeFXutOubgXPb/MT/uvCPAgzLZrczf3qg0yRJbwxGNZBmRn0uCbizB1m7QR33cn5aAI8CCCi/7zY1FrDYEitRw0JID5bfypWO0G19uRP6aPmD+KegjxIIgPsBAOGneWoK5BbIcOd99/FSMZVMtjZQ2QYAXvo0PJCPEgk1MK0TXWIEeTOx3U2zt5C/Q1Im6lHoxGrI3K+HHUc7AI8CAMoJKJeq2Y5wZrMBgB+TXrbyIGYuhJ/tdyZg95rNr94QjxWQEAAAABJjFJKkPNhw6ebec4v9O2G6GzXPFt6D6oYeTTqO0b/3AAAAAAAP7///8Cr/AAAAAAAAAWABQKYgkEBq5uFQYzdnIfgp8TK20eKQAAAAAAAAAAImog8ASu3w4ACAjxIDtJKLMo2AaNYy0Wx1Cqlz13VAExcSf8SevnCOEqQ2vVCAjwIB/lt5u6i6qmkeTzYKdgjibWEbxYZDF4nao7JiDMhS5cCAjwIDXYj7kNzakOYm07x3cQDrko6tUH9hmktzcKOVwiMduqCAjxIEYVPeDinnFuEQIT0kV19zliHdXtlSHhOPuaDcfER7QtCAjxILaOzr+UqLM6IxRs9YmjjlZy7cgLojgVBjhF5GgT6+0oCAjwIGxwWBgXCUIas1c/bFa0fE8SNOkDEHQbS365+D3xrVc5CAjxIMGCz2WdzDFRoCs+gHbtZbxxzFHVN/be6PZcNOdIYcUYCAjwIJ8U8HDx+yqCKM9LFYE2XOwtyYsUEn5LigkiXvSkWSeFCAjxIIR360TC+FAeQyS2qIVGi/FsDnq5Frs30yg6BpV6Af3OCAjwIJTYJwbSnZkYRB7Ibx5r9UYsn4VawWe5xUBeR2JY4lT8CAjxINCuqtfex/Mzx4IGSlYE1daLFjHuJneevaIMs8XTejYiCAjwILmY3CBlmKYy8kZ8HZmv4HXcw3N4jGC0lc04ADTCy2DACAgABYiWDXPXGQEDsL87";

const ATTESTATION_TAG = [0x05, 0x88, 0x96, 0x0d, 0x73, 0xd7, 0x19, 0x01];
const TXID = "853acfcb2767bd3525b413cab28b52ad6938e397cc9916d8553c818fc448f66a";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ok   ${name}`);
  } else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures++;
  }
}

function b64ToBytes(b64: string): Uint8Array {
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Base-128 varint, seven bits per byte, least significant first. */
function base128(n: number): number[] {
  const out: number[] = [];
  do {
    let b = n & 0x7f;
    n = Math.floor(n / 128);
    if (n) b |= 0x80;
    out.push(b);
  } while (n);
  return out;
}

/** Bitcoin CompactSize: one byte below 0xfd, then 2, 4 or 8 little-endian bytes. */
function csize(n: number): number[] {
  if (n < 0xfd) return [n];
  if (n <= 0xffff) return [0xfd, n & 0xff, (n >> 8) & 0xff];
  return [0xfe, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
}

/** A proof carrying a Bitcoin attestation: tag, length, height, transaction id. */
function buildProof(opts: { height: number; txid?: string; digest?: string }): Uint8Array {
  const height = base128(opts.height);
  const txid = opts.txid ? [...Buffer.from(opts.txid, "hex")] : [];
  const payload = [...height, ...txid];
  const parts: number[] = [...ATTESTATION_TAG, ...csize(payload.length), ...payload];
  if (opts.digest) parts.push(...Buffer.from(opts.digest, "hex"));
  return new Uint8Array(parts);
}

const stored = b64ToBytes(STORED_PROOF_B64);
const upgraded = b64ToBytes(UPGRADED_PROOF_B64);

console.log("ots anchor self-test\n");

// ── 1. Binding: the proofs this project holds do not cover our digest ──────
{
  check(
    "the stored 6 November proof does not cover the published digest",
    proofCoversDigest(stored, DIGEST) === false,
  );
  check(
    "the upgraded proof does not cover the published digest",
    proofCoversDigest(upgraded, DIGEST) === false,
  );
}

// ── 2. A proof that carries the digest is recognised ───────────────────────
{
  const proof = buildProof({ height: 974768, txid: TXID, digest: DIGEST });
  check("a proof carrying the digest is recognised", proofCoversDigest(proof, DIGEST) === true);
}

// ── 3. A half-byte hit is not a commitment ─────────────────────────────────
{
  // The digest's hex is planted one nibble into a hex string, so a hex search
  // finds it and a byte-aligned search must not.
  const hexStr = `a${DIGEST}cd`;
  const shifted = new Uint8Array(Buffer.from(hexStr, "hex"));
  check(
    "the shifted digest is visible to a naive hex search",
    Buffer.from(shifted).toString("hex").indexOf(DIGEST) === 1,
  );
  check(
    "a nibble-shifted digest is not a binding",
    proofCoversDigest(shifted, DIGEST) === false,
  );
}

// ── 4. The digest written as text is not a binding ─────────────────────────
{
  const asText = new Uint8Array(Buffer.from(`digest: ${DIGEST}`, "utf-8"));
  check(
    "the digest written as text is not a binding",
    proofCoversDigest(asText, DIGEST) === false,
  );
}

// ── 5. The attestation carries a height AND a transaction ──────────────────
{
  const proof = buildProof({ height: 974768, txid: TXID, digest: DIGEST });
  const att = readBitcoinAttestation(proof);
  check("reads the attested height", att.height === 974768, `got ${att.height}`);
  check("reads the attested transaction", att.txid === TXID, `got ${att.txid}`);
  check(
    "the height helper agrees with the attestation reader",
    extractBitcoinBlockHeight(proof) === 974768,
  );
}

// ── 6. A height without a transaction publishes nothing ────────────────────
{
  const proof = buildProof({ height: 974768, digest: DIGEST });
  const att = readBitcoinAttestation(proof);
  check("reads the height", att.height === 974768, `got ${att.height}`);
  check("publishes no transaction without one", att.txid === null, `got ${att.txid}`);
}

// ── 7. The proof this project actually holds ───────────────────────────────
{
  const att = readBitcoinAttestation(upgraded);
  check(
    "the upgraded proof names the height 974,768",
    att.height === 974768,
    `got ${att.height}`,
  );
  check(
    "the upgraded proof names no transaction, so none is published",
    att.txid === null,
    `got ${att.txid}`,
  );
  const storedAtt = readBitcoinAttestation(stored);
  check(
    "the stored proof carries no Bitcoin attestation",
    storedAtt.height === null && storedAtt.txid === null,
    `got ${JSON.stringify(storedAtt)}`,
  );
}

// ── 8. A proof with no attestation at all ──────────────────────────────────
{
  const att = readBitcoinAttestation(new Uint8Array([1, 2, 3, 4, 5]));
  check(
    "a proof with no attestation yields nothing",
    att.height === null && att.txid === null,
  );
}

// ── 9. A height in the wrong encoding is refused ───────────────────────────
{
  // CompactSize instead of base-128: the reader must not accept it as a
  // plausible height and hand back a transaction it cannot place.
  const wrong = [0xfe, 0xf0, 0xdc, 0x0e, 0x00, ...Buffer.from(TXID, "hex")];
  const proof = new Uint8Array([...ATTESTATION_TAG, ...csize(wrong.length), ...wrong]);
  const att = readBitcoinAttestation(proof);
  check(
    "a mis-encoded height yields no transaction",
    att.txid === null,
    `got ${att.txid}`,
  );
}

if (failures) {
  console.log(`\n${failures} failure(s). The anchor machine is not trustworthy.`);
  process.exit(1);
}
console.log("\nThe anchor machine binds proofs to digests and publishes nothing it cannot place.");
