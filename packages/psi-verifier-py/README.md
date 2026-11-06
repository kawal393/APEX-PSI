# psi-verifier (Python)

> Apex PSI is not a tool and not a product. It is the verification substrate — the layer beneath proof. It does not judge. It does not certify. It only remembers.

**MIT. Free forever.** Verify any APEX PSI seal. Zero dependencies, Python 3.8+.

```python
from psi_verifier import verify, PsiSealInvalidError

try:
    result = verify(seal)          # enforce=True by default (v1.2.0)
except PsiSealInvalidError as e:
    print(e)                       # tells you exactly where to get a valid seal
```

## v1.2.0 — enforcement release with cross-language parity

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
`seal_hash = SHA-256(JCS(core envelope))` (R10), Ed25519 over the ASCII
`seal_hash` against public keys the caller supplies (R11), and matching
`schema_digest` (R12).

## Post-quantum signatures (R11.7)

R10 hashes the envelope without the signature member, so the Ed25519 half of a
hybrid seal never covers `signature.pq_value`. A seal that *declares* a
post-quantum signature is reported verified only when that half was actually
verified. The package ships no post-quantum algorithm, so the caller passes a
checker for the algorithm the seal declares:

```python
from psi_verifier import verify_seal

def check(message: bytes, signature: str, public_key: str) -> bool:
    return mldsa65_verify(message, signature, public_key)

result = verify_seal(seal, trust_roots=[key], post_quantum=[{
    "alg": "ML-DSA-65",
    "public_key": mldsa65_public_key_hex,
    "verify": check,
}])
# result.post_quantum_status == "verified" | "invalid" | "unverifiable" | "absent"
```

No checker for the declared algorithm -> `unverifiable`. A checker that ran and
said no -> `invalid`. Either way the seal is not reported as verified.

## Licensing

- **This verifier: MIT.** Check seals forever, no cost, no permission.
- **The generator (sealing engine): proprietary.** Free for personal /
  non-commercial use; commercial sealing is licensed under PSI-05 royalty terms.
  Generate a conformant seal at <https://ai-governance-standard.com/seal>.

Schema: © 2026 APEX Infrastructure. Specification: <https://ai-governance-standard.com/spec>
