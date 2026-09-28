# PSI-SEAL/1 — Canonical Seal Schema

- schema id: `PSI-SEAL/1.0.0`
- status: **frozen** — normative since first publication
- this page mirrors: `src/lib/psi-schema.ts` (the rule array is the
  authoritative copy; its JCS form is hashed into every seal's
  `schema_digest`)
- reference implementations: TypeScript (`packages/psi-verifier`),
  Python (`packages/psi-verifier-py`) — byte-identical rejection lines
- conformance vectors: `psi-conformance/vectors/`

## The five protocol verbs

| Verb | Operation |
|---|---|
| **SEAL** | canonicalise a subject digest into a signed envelope |
| **VERIFY** | recompute the envelope digest and signature checks, offline |
| **ANCHOR** | bind a Merkle root to a Bitcoin transaction |
| **CITE** | emit a resolvable receipt reference for a sealed item |
| **AUDIT** | re-run verification across a set and record divergence |

## Normative byte-level rules (verbatim)

```
R1  Envelope serialisation: RFC 8785 JSON Canonicalization Scheme (JCS), UTF-8, no BOM.
R2  Field set is closed. Unknown top-level fields render a seal non-conformant.
R3  Field order in the emitted receipt: schema, schema_digest, sealed_at, subject, hash, merkle, signature, licence.
R4  Digests: lowercase hexadecimal, exactly 64 characters, no 'sha256:' prefix inside the envelope.
R5  Hash algorithm: SHA-256 over the raw octet stream of the subject; no transport encoding, no trailing padding.
R6  sealed_at: RFC 3339 UTC with exactly three fractional digits and a literal 'Z' (e.g. 2026-08-17T09:00:00.000Z).
R7  subject.size_bytes: non-negative integer, exact octet length. subject.name: NFC-normalised UTF-8 string.
R8  Merkle assembly: binary tree over leaf digests in submission order; each parent = SHA-256(left_bytes || right_bytes) over 32-byte raw digests; an odd node is promoted, never duplicated.
R9  merkle.leaf = SHA-256 of the ASCII string 'PSI1:' || hash. Domain separation is mandatory.
R10 seal_hash = SHA-256(JCS(envelope minus the signature and licence members)).
R11 Signature suite: Ed25519 over the ASCII seal_hash; optional hybrid post-quantum LMS-W4-SHA256 (NIST SP 800-208).
R12 Every seal MUST carry schema and schema_digest. Only schema-conformant seals are considered PSI-compliant.
```

## Envelope shape

A conformant seal is a JSON object whose top-level members, in order, are:

```
schema · schema_digest · sealed_at · subject · hash · merkle · signature · licence
```

`schema_digest` is `SHA-256(JCS({ "id": <schema id>, "rules": [<rule array verbatim>] }))`.
Changing any rule character changes every future seal's digest — which is why
changes are versioned, never silent (see the stability rule below).

## Anchoring

A Merkle root over batched seal leaves is written to the Bitcoin chain.
Verification checks: (1) the envelope's internal digests, (2) the signature,
(3) the inclusion proof against an anchored root. An unanchored seal is
`SEAL PENDING`; it is never presented as anchored. Anchoring is
tamper-evident, not immutable — the chain makes after-the-fact edits
detectable, and the protocol states exactly that, never more.

## What conformance does NOT claim

- It does not say a sealed statement is *true* — only that the bytes are
  provably unchanged since the sealed instant and provably present at the
  anchored time.
- It expresses no legal conclusion. Integrity and existence proofs are not
  adjudication, and no court, regulator, or party is bound by this schema.

## Stability rule

Any deviation from the rule array requires: a new schema id (PSI-SEAL/2),
lockstep changes in every implementation, a new conformance-vector release,
and a published migration note covering already-sealed history. Silent edits
are mathematically detectable because the rule digest is embedded in every
seal (R12).

## Licence posture

Verification code: MIT, free forever. The rules themselves are published for
independent implementation without permission. Engine terms and mark terms
follow `specs/README.md`. The specification text is
© 2026 APEX Infrastructure — PSI-SEAL/1 canonical seal schema. All rights reserved.
