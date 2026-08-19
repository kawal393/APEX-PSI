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

## v1.2.0 — enforcement by default, byte-identical across languages

`verify()` **rejects** non-conformant seals instead of merely reporting them, so
no pipeline accepts malformed evidence by accident:

```ts
import { verify, PsiSealInvalidError } from "@apex/psi-verifier";

try {
  await verify(seal);                    // enforce: true by default
} catch (e) {
  if (e instanceof PsiSealInvalidError) console.error(e.message);
}

await verify(seal, { enforce: false });  // legacy data only
```

The rejection prints the canonical schema digest, every failed normative rule,
the canonical schema URL, and where a conformant seal is produced. Report-only
APIs remain: `verifySeal()` (never throws), `isConformant()`.

Rejection text is byte-identical in TypeScript and Python, and every line cites a
rule: `PSI-SEAL v1.2.0 REJECT: schema_digest mismatch — rule 4.2`. Free forever.
MIT. No permission required.

A byte-identical Python distribution ships as `psi-verifier`
(`packages/psi-verifier-py`) and computes the same schema digest.
