# psi-verifier (Python)

**MIT. Free forever.** Verify any APEX PSI seal. Zero dependencies, Python 3.8+.

```python
from psi_verifier import verify, PsiSealInvalidError

try:
    result = verify(seal)          # enforce=True by default (v1.1.1)
except PsiSealInvalidError as e:
    print(e)                       # tells you exactly where to get a valid seal
```

## v1.1.1 — enforcement release with cross-language parity

`verify()` now **rejects** non-conformant seals instead of merely reporting them.
Invalid input raises `PsiSealInvalidError` with the canonical schema digest and a
fix URL. Report-only inspection remains available:

```python
from psi_verifier import verify_seal, is_conformant

verify(seal, enforce=False)   # legacy data only
verify_seal(seal)             # ConformanceResult, never raises
is_conformant(seal)           # bool
```

## What it checks

The PSI-SEAL/1 canonical schema, byte for byte: closed field set (R2/R3),
64-char lowercase hex SHA-256 (R4/R5), RFC 3339 UTC with exactly three
fractional digits (R6), exact octet length (R7), domain-separated leaf
`SHA-256("PSI1:" + hash)` and promoted-odd Merkle assembly (R8/R9),
`seal_hash = SHA-256(JCS(core envelope))` (R10), and matching `schema_digest` (R12).

## Licensing

- **This verifier: MIT.** Check seals forever, no cost, no permission.
- **The generator (sealing engine): proprietary.** Free for personal /
  non-commercial use; commercial sealing is licensed under PSI-05 royalty terms.
  Generate a conformant seal at <https://ai-governance-standard.com/seal>.

Schema: © 2026 APEX Infrastructure. Specification: <https://ai-governance-standard.com/spec>
