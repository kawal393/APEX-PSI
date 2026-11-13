# apex-psi-verifier

> Apex PSI is not a tool and not a product. It is the verification substrate — the layer beneath proof. It does not judge. It does not certify. It only remembers.

**MIT. Free forever.** Verify any APEX PSI seal, anywhere — browser, Node, Deno, Bun, workers, CI. Zero dependencies.

```ts
import { verifySeal } from "apex-psi-verifier";

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
| R11 | Ed25519 over the ASCII `seal_hash`, against public keys the caller supplies |
| R11.7 | A declared post-quantum signature must itself be verified — unchecked is `unverifiable`, never `verified` |
| R12 | `schema` + `schema_digest` present and matching |
| R13.1 | An inclusion proof is recomputed from the leaf, its index, the tree size and the audit path |
| R13.2 | A consistency proof is recomputed from both tree heads it claims to relate |

Anything that deviates — even if functionally similar — fails. **Only schema-conformant seals are PSI-compliant.**

## Post-quantum signatures (R11.7)

R10 hashes the envelope without the signature member, so the Ed25519 half of a
hybrid seal never covers `signature.pq_value`. A seal may therefore *declare* a
post-quantum signature that the Ed25519 half says nothing about. The verifier
refuses to call such a seal verified: the declared half must be checked too.

The package ships no post-quantum algorithm — it stays dependency-free — so the
caller hands over a checker for the algorithm the seal declares:

```ts
import { verifySeal, type PsiPostQuantumChecker } from "apex-psi-verifier";

const checker: PsiPostQuantumChecker = {
  alg: "ML-DSA-65",                                   // matched case-insensitively
  public_key: mldsa65PublicKeyHex,
  verify: (message, signature, publicKey) => mldsa65Verify(message, signature, publicKey),
};

const result = await verifySeal(seal, { trustRoots, postQuantum: [checker] });
// result.post_quantum_status === "verified" | "invalid" | "unverifiable" | "absent"
```

No checker for the declared algorithm → `unverifiable`. A checker that ran and
said no → `invalid`. Either way the seal is not reported as verified, and under
the default `requireValidSignature` it is not conformant.

## Consistency proofs (R13.2)

An inclusion proof says a leaf is in a tree. Only a consistency proof says the
tree never forgot — it is what stops one operator from showing two different
histories of the same log, each with its own valid inclusion proofs.

`psiVerifyConsistency()` walks RFC 9162 sec 2.1.4.2 step for step and reports
`consistent` only when the head of **both** trees is recomputed from the
supplied path and matches the head that was supplied:

```ts
import { psiVerifyConsistency, psiConsistencyPath, psiTreeHead } from "apex-psi-verifier";

const path = await psiConsistencyPath(oldLeaves, newLeaves);

const result = await psiVerifyConsistency({
  first_size: oldLeaves.length,
  second_size: newLeaves.length,
  first_root: await psiTreeHead(oldLeaves),
  second_root: await psiTreeHead(newLeaves),
  consistency_path: path,
});
// result.status === "consistent" | "mismatch" | "malformed"
```

`malformed` means the proof could not be checked at all. `mismatch` means the
check ran and said no. Only `consistent` is a pass.

## Licensing model

- **This verifier: MIT.** Check seals forever, at no cost, with no permission.
- **The generator (sealing engine): proprietary.** Free for personal / non-commercial use; commercial and institutional sealing is also free of charge in perpetuity (royalty tiers withdrawn 4 September 2026). See <https://ai-governance-standard.com/license>.

Schema: © 2026 APEX Infrastructure. Specification: <https://ai-governance-standard.com/spec>

## v1.2.0 — enforcement by default, byte-identical across languages

`verify()` **rejects** non-conformant seals instead of merely reporting them, so
no pipeline accepts malformed evidence by accident:

```ts
import { verify, PsiSealInvalidError } from "apex-psi-verifier";

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
