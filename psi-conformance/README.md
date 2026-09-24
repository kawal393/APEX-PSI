# PSI CONFORMANCE — psi-conformance

Zero-dependency conformance suite for the frozen **PSI-SEAL/1** cryptographic
core. This is what lets the protocol be trusted *instead of APEX being
trusted*: any implementation in any language reproduces the same digests, and
this runner proves it — no permission, no API call, no Apex needed.

## What is checked (the binding spec)

| Rule | Primitive | Source of truth |
|---|---|---|
| R1 | JCS canonicalisation (RFC 8785, ASCII subset here) | `src/lib/psi-canonicalize.ts` |
| R5 | commit = SHA-256 of canonical input | `src/lib/psi-schema.ts` |
| R9 | leaf = SHA-256(`"PSI1:"` ‖ commit-hash) | `src/lib/psi-schema.ts` |
| R8 | Merkle root over raw 32-byte digests; odd node promoted | `src/lib/psi-schema.ts` |

Signature algorithms (Ed25519, LMS-W4-SHA256) are validated by the
cross-language parity suite in `packages/` (Node + Python produce byte-identical
PSI Records). They are intentionally out of this runner so `conformance.py`
stays pure stdlib.

## Use

```bash
python conformance.py generate   # (re)build vectors/*.json with real digests
python conformance.py test        # recompute + assert; exit 0 == CONFORMANT
```

`vectors/*.json` are committed. They are the contract. A conformant
implementation must reproduce every digest in `sha256.json`,
`canonicalization.json`, `leaf.json`, `merkle.json`, and must FAIL the
tamper cases in `negative.json`.

## Extending

Add a vector input to `SHA_SEEDS` / `CANON_SEEDS`, run `generate`, commit both
the code and the regenerated `vectors/`. Never hand-edit a digest.
