# Changelog — apex-psi-verifier / psi-verifier (Python)

All notable changes to the MIT-licensed PSI verifier. Verification is, and
remains, free forever.

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
