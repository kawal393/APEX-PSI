# Changelog — apex-psi-verifier / psi-verifier (Python)

All notable changes to the MIT-licensed PSI verifier. Verification is, and
remains, free forever.

## 1.6.1 — Deprecation-metadata release (14 Nov 2026)

- **No code change.** The verifier is byte-identical to 1.6.0: the same RFC 9162
  consistency-proof verification (R13.2), the same inclusion proofs (R13.1), the
  same fail-closed Ed25519 and post-quantum handling. Nothing was weakened and
  nothing was added.
- **Why a release exists.** A deprecation is a machine-readable label on a
  release, and npm's token-free trusted-publishing session cannot write a label
  onto an existing release: every metadata-only write is refused with 404
  (measured across five body shapes on 14 Nov 2026). The registry's publish
  route accepts a release body that carries the earlier releases alongside the
  new one, so 1.6.1 is the release that carries the labels for 1.2.0, 1.3.0,
  1.5.0 and the 0.0.0-stage placeholder.
- The labels themselves are in `deprecation-notices.json`, which is the single
  source of truth for them in this repository. 1.2.0 and 1.3.0 carry security
  advisories: 1.2.0 does not verify the seal's Ed25519 signature, and 1.3.0
  reports a declared post-quantum signature as verified without checking it.

## 1.6.0 — Consistency-proof release (14 Nov 2026)

- **The log can now prove it never forgot.** Measured 14 Nov 2026: the
  published verifier shipped RFC 9162 INCLUSION proofs (R13.1) and nothing
  else. An inclusion proof says a receipt is in a tree; it does not say the
  tree is the same tree an hour later. An operator holding the log could
  still show one client a tree that includes a receipt and another client a
  different tree at the same moment — the split view.
- **R13.2**: `psiVerifyConsistency()` / `psi_verify_consistency()` verify a
  consistency proof between two tree heads, walking the RFC 9162 sec 2.1.4.2
  procedure step for step. The verdict is `consistent` only when the head of
  the OLDER tree AND the head of the NEWER tree are both recomputed from the
  supplied path and match the heads that were supplied. Anything else is
  `mismatch`; anything that cannot be checked is `malformed`.
- New in both distributions: `psiTreeHead()` / `psi_tree_head()` (the RFC
  9162 Merkle Tree Hash) and `psiConsistencyPath()` / `psi_consistency_path()`
  (the generator, so a log can serve the proof it is then judged by). The
  generator refuses to invent a proof for a tree that is not a prefix of the
  newer one.
- New citations: `13.4` (malformed), `13.5` (mismatch), `13.6` (consistent).
  The seal schema digest is untouched — R13.2 is a verifier-side rule, so
  every seal ever issued still verifies.
- Tests: every size pair up to 64 leaves is generated and verified, and every
  single-node mutation of a valid proof is refused — 2,080 pairs and 2,223
  tampered proofs in Python, the same shapes plus an independent reference
  implementation in TypeScript. Cross-language parity holds byte for byte
  (11,756 B, sha256 `16960ad032b9d42e3ee28289dd4cfee812e52350834def84a5390c5be57223d6`).

## 1.5.0 — Post-quantum fail-closed release (7 Nov 2026)

- **A declared post-quantum signature must now be checked.** Measured
  7 Nov 2026 against the published 1.3.0 distribution — npm `apex-psi-verifier`
  and PyPI `psi-verifier` alike: a seal carrying a GENUINE Ed25519 signature
  over its `seal_hash`, plus `pq_alg: "ML-DSA-65"` and a `pq_value` of 512
  bytes of random noise, was reported as `conformant: true`,
  `signature_status: "verified"`, `authentic: true`, zero failures. The same
  forgery passed against the 1.4.0 sources in this repository.
- The cause is structural. R10 hashes the envelope WITHOUT the signature
  member, so the Ed25519 half of a hybrid seal never covers `pq_value`. Every
  shipped verifier read `pq_alg` / `pq_value` and acted on neither.
- **R11.7**: a seal that DECLARES a post-quantum signature is reported
  `verified` only when that half was actually verified. A declared signature
  with no checker for it is `unverifiable`; one that was checked and failed is
  `invalid`. A post-quantum signature nobody checked is not a verified one.
- The verifier package ships no post-quantum algorithm and still has no
  runtime dependency. The caller supplies a `PsiPostQuantumChecker`
  (`postQuantum` / `post_quantum`); the verifier matches it against the
  algorithm the seal declares. A checker that throws is treated as a check that
  could not run, never as a check that said yes.
- `ConformanceResult` gains `post_quantum_status` and `post_quantum_detail`.
  New citations: `11.10` (no post-quantum declared), `11.11` (declared,
  unverifiable), `11.12` (declared, does not verify), `11.13` (declared an
  algorithm but carries no signature).
- `psiVerifySignature()` / `psi_verify_signature()` take the checkers as a
  fourth argument; `verifySeal()` / `verify_seal()` take `postQuantum` /
  `post_quantum` in their options.
- Tests: the forgery above is now encoded as a test in both distributions,
  along with the empty-`pq_value` case. 29 tests in
  `test/seal-signature.test.ts`, and cross-language parity holds byte for byte
  (9299 B, sha256 `312395be408e06ff60bc528750adb00d568ef337700c14b304487b019dfea099`).
- The flagship site's own browser checker (`src/lib/psi-schema.ts`) was
  updated in the same release. It is a second implementation of R11, and it had
  inherited the same blindness. It now carries the R11.7 verdict and checks
  ML-DSA-65 against the published anchor key when a seal declares it.
- **The declared half is now reported whatever the classical half did.**
  Measured 7 Nov 2026 in this release: a seal that DECLARES a post-quantum
  signature but whose Ed25519 half does not verify came back with
  `post_quantum_status: "absent"` — a verdict stating, wrongly, that the seal
  declares no post-quantum signature at all. The seal was rejected either way,
  so this was a false statement in the verdict rather than a false pass. The
  post-quantum half is now examined independently of the Ed25519 half, and
  every return path carries `post_quantum_status` and `post_quantum_detail`.

## 1.4.0 — Repository release, never published (Nov 2026)

- **R11.6**: a signature NAMES the digest it authenticates (`binds: seal_hash`
  or `binds: merkle_leaf`) and the verifier recomputes that digest instead of
  trusting the declared value.
- **R13.1**: an RFC 9162 inclusion proof is verified by walking the tree's
  split rather than by the leaf-index parity shortcut.
- This version was **never published** to npm or PyPI. Measured 7 Nov 2026:
  the npm registry carries `1.2.0` and `1.3.0`, PyPI carries `1.3.0`. The
  forgery that 1.5.0 fixes was accepted by 1.4.0 exactly as it was by 1.3.0.

## 1.3.0 — Authenticity release (17 Oct 2026)

- **R11 is now actually checked.** Before this release neither distribution
  verified a signature at all: the verifier compared the stored `seal_hash`
  with a recomputed one and stopped there. A forgery — content edited, hash
  recomputed, old signature carried over — was reported as a pass. That is the
  attack the new test suite encodes, and it is the reason for the version bump.
- New `psiVerifySignature()` / `psi_verify_signature()`: Ed25519 over the ASCII
  `seal_hash`, checked with the platform's own primitive (WebCrypto in
  TypeScript, `cryptography` in Python) and **only against public keys the
  caller supplies**. Citations `11.1`–`11.5` cover absent / empty / not-an-
  Ed25519-shape / wrong-alg / no-trust-root.
- `ConformanceResult` gains `signature_status` (`verified` | `invalid` |
  `absent` | `unverifiable`), `authentic` and `trusted_key_id`. `authentic` is
  true only when a signature was checked and passed; schema conformance has
  never implied authenticity and now cannot be mistaken for it.
- `verifySeal()` / `verify_seal()` accept `{ trustRoots, requireValidSignature }`
  (Python: `trust_roots`, `require_valid_signature`). A seal whose signature was
  not verifiable is **non-conformant by default**; `requireValidSignature:false`
  restores the old report-only behaviour.
- `formatAcceptance()` can no longer print a pass it did not compute: only
  `verified` yields ACCEPT, anything else yields PARTIAL naming the status.
- A missing Ed25519 primitive is reported as `unverifiable`, never as a pass.
  The verifier refuses rather than assumes.
- Tests added: 10 in `test/seal-signature.test.ts` (Node, zero dependencies),
  including the forgery case, the empty-signature case our own generator used
  to emit, a wrong-key case, and the published hello-psi vectors.
- Cross-language proof: `tools/cross_language_check.py` (Python) plus
  `test/cross-language/node_check.mts` (Node, `npm run test:cross-language`)
  sign a seal in one language and verify it in the other, then diff the full
  verdict renderings — 8 cases, byte-identical output, same SHA-256.

## 1.2.0 — Parity release

- `verify()` / `verify_seal()` reject non-conformant seals by default
  (`enforce=True`); every rejection line is byte-identical between the
  TypeScript and Python distributions and carries a readable rule citation.
- Added `psi_schema_digest_from_document()` /
  `psiSchemaDigestFromDocument()` for anyone digesting the published schema.

## 1.1.1 — Parity release

- Strict cross-language parity: the TypeScript and Python distributions emit
  **byte-identical** rejection text for the same input, with identical casing
  and punctuation.
- Every finding carries a readable rule citation, e.g.
  `PSI-SEAL v1.1.1 REJECT: schema_digest mismatch — rule 4.2`.
- Added `PSI_VERIFIER_VERSION`, `PSI_RULE_CITATIONS`, `rejectLine()` /
  `reject_line()` and `formatAcceptance()` / `format_acceptance()`.
- Schema digest and Merkle root are unchanged and identical across both
  distributions: `6d8d65e5fec9f58d762058eb8d47308e33a9e67c396a96ee8bdd84b14f4e04b9`.
- Every rejection closes with: *verified, not asserted; trust the math, not the maker.*

## 1.1.0 — Enforcement release

**Intentional breaking change: enforcement is now the default.**

- `verify(seal)` (JS/TS) and `verify(seal)` (Python) **reject** seals that are
  not PSI-SEAL/1 conformant, by throwing `PsiSealInvalidError`. Previously the
  verifier only reported failures, so pipelines could accept non-conformant
  data by accident.
- Rejection messages are actionable and stable: they print the canonical schema
  digest, every failed normative rule, the canonical schema URL, and where to
  generate a conformant seal.
- Legacy override: `verify(seal, { enforce: false })` / `verify(seal, enforce=False)`.
- Added `assertSeal()`, `isConformant()` / `is_conformant()`, `formatRejection()` /
  `format_rejection()`, `PSI_SEAL_URL`, `PSI_SCHEMA_URL`.
- `verifySeal()` / `verify_seal()` are unchanged and never raise — use them for
  reporting surfaces such as dashboards.
- New Python distribution (`psi-verifier`), byte-identical rule set and digest
  to the TypeScript implementation.

Migration: if a pipeline previously ignored `result.conformant`, it will now
fail on non-conformant input. That is the intended behaviour — either seal the
data conformantly, or pass `enforce: false` explicitly.

## 1.0.0 — Initial release

- PSI-SEAL/1.0.0 canonical schema verification (rules R1–R12), zero
  dependencies, browser / Node 18+ / Deno / Bun / workers.
