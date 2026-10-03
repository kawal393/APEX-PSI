# Changelog — @apex/psi-verifier / psi-verifier (Python)

All notable changes to the MIT-licensed PSI verifier. Verification is, and
remains, free forever.

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
