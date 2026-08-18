# Changelog — @apex/psi-verifier / psi-verifier (Python)

All notable changes to the MIT-licensed PSI verifier. Verification is, and
remains, free forever.

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
