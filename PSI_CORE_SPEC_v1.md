# APEX PSI CORE — FROZEN SPEC v1.0 (PSI-SEAL/1)

Status: **INFORMATIONAL / FROZEN.** The core does not change to win an argument.
Profiles and algorithms change around it. This document is the spec-of-record
for the frozen core, mirroring `src/lib/psi-schema.ts` and proven by
`psi-conformance/`.

## 1. The primitive (7 steps, no more)

```
canonicalise(input) -> SHA-256 -> sign -> receipt -> (batch) Merkle -> anchor -> verify
```

`verify()` returns exactly five facts: **integrity · signature · merkle ·
anchor · timestamp.** It never returns truth, legality, correctness, or safety.

## 2. Binding rules (parity-checked)

- **R1** Canonicalisation = RFC 8785 (JCS). Every implementation uses the
  language's real JCS library, not a hand-rolled substitute.
- **R4** Hash = lowercase 64-char hex; a `sha256:` prefix is tolerated on input,
  stripped before hashing.
- **R5** `commit = SHA-256(JCS(payload))`.
- **R8** Merkle root: binary tree over **raw 32-byte** digests;
  `parent = SHA-256(left_bytes ‖ right_bytes)`; an odd trailing node is
  **promoted, never duplicated**.
- **R9** Domain separation: `leaf = SHA-256("PSI1:" ‖ commit-hash)`. The `PSI1:`
  prefix means a PSI leaf can never collide with a bare content hash.
- **R11** Engine split: schema / hashing / canonicalisation / verifier are MIT;
  the proprietary parts are the **daemon, the keys, and the marks**.

## 3. Algorithm agility (the quantum clause)

The signature slot is a LIST, not a field, and verification never assumes a
single algorithm:

```
signatures: [ { alg: "ed25519", sig }, { alg: "lms-w4-sha256", sig }, ... ]
```

PSI-SEAL/1 binds **Ed25519** (institutional) **+ LMS-W4-SHA256** (post-quantum),
anchored externally to **Bitcoin**. New algorithms are added as new profile
versions — the 1.0 rules never mutate (a live 2026 audit case may depend on
them). NIST deprecates RSA-2048/ECC by 2030 and FIPS 140-2 slips off-compliance
in 2026, so long-lived proofs MUST stay algorithm-agile to survive.

## 4. Versioning

- 1.0 rules are **forever reproducible**.
- 1.1 = backwards-compatible (additive only).
- 2.0 = breaking (new major profile).
- Historical digests are sacred: no change to canonicalisation, serialisation,
  line endings, or the leaf formula retroactively invalidates sealed evidence.
  (A CRLF-vs-LF breakage is the canonical cautionary tale.)

## 5. Profiles are thin

A profile is a small JSON Schema constraining `payload + predicate + metadata`.
It is NOT a new protocol. The Gate (PSI-MANCHOR/1, a.k.a. PSI-ACT/1) is one
profile; the media seal is another. All reuse §1 unchanged.

## 6. Survival test (acceptance)

> If Apex Infrastructure disappears tomorrow, can a stranger verify existing
> evidence, prove its cryptographic validity, and independently confirm its
> external anchor — with no Apex servers, accounts, or support?

If **yes**, the layer is real. Every feature is measured against this test; if
it doesn't strengthen it, it does not get built. The independent verifier uses
only a public key and public anchor data, and must run fully offline.

## 7. What verify() is NOT

The chain proves **existence and integrity at a time** — never that content is
true, lawful, or accurate. No warranty, guarantee, indemnity, or certificate of
compliance is offered or implied. Liability never accumulates on the protocol
author; the marks (licensed operators) carry the commercial relationship.
