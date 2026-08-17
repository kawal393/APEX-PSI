# @apex/psi-verifier

**MIT. Free forever.** Verify any APEX PSI seal, anywhere — browser, Node, Deno, Bun, workers, CI. Zero dependencies.

```ts
import { verifySeal } from "@apex/psi-verifier";

const result = await verifySeal(JSON.parse(receiptJson));
// { conformant: true, schema_id: "PSI-SEAL/1.0.0", schema_digest_match: true,
//   seal_hash_match: true, failures: [] }
```

## What it checks

The verifier enforces the **PSI-SEAL/1** canonical schema byte for byte:

| Rule | Check |
| --- | --- |
| R2 / R3 | Closed field set, canonical field order |
| R4 / R5 | 64-char lowercase hex SHA-256, unprefixed, no padding |
| R6 | `sealed_at` RFC 3339 UTC, exactly 3 fractional digits |
| R7 | Exact octet length, NFC-normalised subject name |
| R8 / R9 | Domain-separated leaf `SHA-256("PSI1:" ‖ hash)`, promoted-odd Merkle |
| R10 | `seal_hash = SHA-256(JCS(core envelope))` |
| R12 | `schema` + `schema_digest` present and matching |

Anything that deviates — even if functionally similar — fails. **Only schema-conformant seals are PSI-compliant.**

## Licensing model

- **This verifier: MIT.** Check seals forever, at no cost, with no permission.
- **The generator (sealing engine): proprietary.** Free for personal / non-commercial use; commercial and institutional sealing is licensed under PSI-05 royalty terms. See <https://ai-governance-standard.com/license>.

Schema: © 2026 APEX Infrastructure. Specification: <https://ai-governance-standard.com/spec>
