# Emitter conformance — what every APEX PSI emitter must write

**Measured 15 Nov 2026 against the live hosted issuer.** This is the map from
what the estate's emitters write today to what the public verifier accepts.
Every line here was measured, not inferred.

**The one-line version.** A hosted receipt is a *ledger record* and it verifies
today under the R11.6 `merkle_leaf` binding. It is *not* a PSI-SEAL/1
envelope, and the public verifier rejects it as one with seven rule failures.
Both statements are true at the same time, and the second is not a bug in the
verifier.

---

## A. The hosted issuer (`/notarize`, behind `apex-psi-mcp@1.1.2`)

### What it writes today

| Field | Value | Notes |
|---|---|---|
| `receipt_id` | `APEX-NTR-…` | also the ledger's `commit_id` |
| `timestamp` | `2026-11-14T19:36:51.718Z` | already RFC 3339 with three fractional digits |
| `decision_hash` | `sha256:<64 hex>` | **SHA-256 of a canonical payload object**, not of the subject's raw octets |
| `commit_hash` | — | **not in the receipt**: `SHA-256(content \| predicate \| timestamp)` |
| `merkle_leaf` | `sha256:<64 hex>` | `SHA-256(receipt_id \| commit_hash)` — the R11.6 `leaf-v1` derivation |
| `merkle_root` | `sha256:<64 hex>` | RFC 6962 cumulative root over the live window |
| `ed25519_signature` | `<64 bytes hex>` | signs the ASCII `merkle_leaf` |
| `pq_signature`, `mldsa65_signature` | present | a declared post-quantum signature the public verifier cannot check without a checker |
| 21 more fields | links, allowance, engine, tier, commands | the field set is closed, so these cannot sit inside an envelope |

### What the public verifier says about it

```
PSI-SEAL v1.6.0 REJECT: schema identifier mismatch, expected PSI-SEAL/1.0.0 — rule 4.1
PSI-SEAL v1.6.0 REJECT: schema_digest mismatch — rule 4.2
PSI-SEAL v1.6.0 REJECT: unknown top-level fields: receipt_id, timestamp, … — rule 2.1
PSI-SEAL v1.6.0 REJECT: sealed_at is not RFC 3339 UTC with three fractional digits — rule 6.1
PSI-SEAL v1.6.0 REJECT: hash is not 64 lowercase hexadecimal characters — rule 5.1
PSI-SEAL v1.6.0 REJECT: subject.size_bytes is not a non-negative integer — rule 7.1
PSI-SEAL v1.6.0 REJECT: merkle.leaf missing — rule 8.1
```

### What it takes to close each gap

| Canonical field | Rule | The change in the emitter |
|---|---|---|
| `schema` | 4.1 | emit the literal `PSI-SEAL/1.0.0` |
| `schema_digest` | 4.2 | emit the frozen digest `6d8d65e5fec9f58d762058eb8d47308e33a9e67c396a96ee8bdd84b14f4e04b9` (also served at `/.well-known/psi-schema.json`) |
| `sealed_at` | 6.1 | rename `timestamp`. The value is already in the right shape — this is a rename, not a reformat |
| `subject` | 7.1 | emit `{name, size_bytes}`. **The emitter must start storing the octet length of the sealed content**; today it stores no length |
| `hash` | 5.1 | emit the SHA-256 of the subject's **raw octets**. `decision_hash` is not this value (measured: `decision_hash == SHA-256(raw subject octets)` is **false**) — it is a separate digest over a payload object, and a second digest must be computed |
| `merkle.leaf` | 8.1 | emit the R9 leaf `SHA-256(ASCII "PSI1:" \|\| hash)`. The ledger's `leaf-v1` derivation is a different value and the verifier recomputes R9 — a copied ledger leaf fails as `merkle.leaf mismatch` |
| `signature` | 11.6 | emit `{alg:"Ed25519", value, seal_hash}` and sign the **canonical seal_hash** (R10). The signature over the ledger leaf cannot be replayed into a canonical envelope |
| field set | 2.1 | the envelope's field set is closed. Links, allowance, proofs, predicates and the PDF URL belong in a wrapper object *beside* the envelope, not inside it |
| post-quantum | 11.7 | a declared PQ signature is reported `unverifiable` until a checker for that algorithm is supplied — never `verified` |

### What is verifiable today, with no emitter change

The ledger record behind the receipt verifies under R11.6 today:

```js
const verdict = await psiVerifyBinding(
  {
    commit_id: receipt.receipt_id,
    commit_hash: sha256(`${content.trim()}|${predicate}|${receipt.timestamp}`),
    merkle_leaf_hash: receipt.merkle_leaf.replace(/^sha256:/, ""),
    signature: { alg: "Ed25519", value: receipt.ed25519_signature, binds: "merkle_leaf" },
  },
  [{ public_key: ANCHOR_KEY, key_id: "apex-psi-2026" }],
);
// verdict.status === "verified"   — measured against a live receipt
```

The customer supplies `content`; the issuer is not consulted; the published
trust anchor is the only input. The same receipt with one character of the
content changed returns `invalid`; the same receipt checked against a stranger's
key returns `invalid`.

**Two conditions the estate controls.** The receipt does not carry the Ed25519
public key, and it does not carry `commit_hash`. The first means a customer
must already know the anchor key; the second means a customer who did not keep
their own content cannot re-derive the leaf. Neither blocks verification of
the record — both widen what the issuer must publish for the receipt to stand
on its own.

---

## B. The Article 50 transparency record

`src/lib/engine-certificate.ts` in this repository builds the printable
`EU AI ACT ARTICLE 50 TRANSPARENCY RECORD`. Its cryptographic evidence is the
ledger row's: `commitHash`, `merkleLeafHash`, `ed25519Signature` (over the
leaf), `merkleRoot`, `merkleProof`, `proofHash`, plus a QR code pointing at the
hosted verify endpoint and five per-article attestations.

That evidence is already the R11.6 `merkle_leaf` binding, so the record is
checkable offline by a holder who has the anchor key. Two upgrades make it a
*canonical* record rather than a ledger-backed one:

1. Embed the canonical envelope alongside the ledger row. It cannot be
   assembled from the row alone — the row's `hash` is the commit hash, not the
   subject hash, and the row's leaf is not the R9 leaf. The engine would have
   to compute and store the subject hash, the octet length and the R9 leaf at
   commit time, and sign the R10 seal_hash.
2. Carry the inclusion proof (R13.1) with the record so a holder can check
   that the receipt's leaf is in the published tree, not merely that a signature
   was valid.

**A seal is an audit trail.** It is evidence that a record was signed at a
time; it is not a legal conclusion, a statement that the content is true, or
evidence of regulatory compliance. Anything a holder relies on must be their
own determination, made with their own legal advice.

---

## C. Sovereign AI Filmverse (`sovereignfilmverse.tech`)

**The estate holds no source for this surface.** It is a third-party Lovable
deployment on the same vendor edge as the other two sites, and its code is not
in any repository we hold. Nothing in this section is a measurement of
Filmverse's internals — it is the specification that any emitter on that
surface must meet for the claims its interface makes to be checkable.

### At account creation

The event is a person joining a service. The only thing a receipt can add is
provenance of what was agreed. If the surface offers a "PSI Passport", the
passport is a document that a third party can check, so it must carry:

- the receipt (canonical envelope, or the ledger row plus the R11.6 binding);
- the trust-anchor key identifier the receipt is checked against;
- the article-50 transparency record, with the machine-readable fields the
  holder needs (what was generated, by what, under which human authorisation).

### At asset export

This is the event an Article 50 duty attaches to: the export is where a
generated output leaves the platform. The provenance bundle must carry:

| What | Why |
|---|---|
| the sealed content's hash and the canonical envelope | the output's identity |
| the machine-readable marking embedded in the asset | the marking is a property of the file, not of the receipt; the receipt points at it |
| the inclusion proof of the receipt's leaf (R13.1) | the receipt is in the published tree |
| the human authorisation, if a human authorised the export | the authorisation is a separate fact from the seal |
| the transparency fields: tool/actor identification, output category | so a downstream holder can make their own determination |

**The rule that governs all three surfaces:** a receipt the estate publishes
must be checkable with the estate's own published verifier, by a holder who
has nothing but the receipt and the trust anchor. Anything else is a link, not
evidence.

---

## Acceptance checklist — for a human, five minutes

- [ ] Run `node scripts/emit-conformance.mjs <receipt.json> --content "<the sealed content>"` and read the seven rule lines.
- [ ] Confirm the R11.6 line says `verified` against the published anchor key.
- [ ] Change one character of the content, re-run, and confirm it says `invalid`.
- [ ] Check the receipt's `pq_signature` is declared; confirm the verifier never calls that signature `verified` without a checker.
- [ ] Confirm the emitter stores the sealed content's octet length — until it does, no canonical envelope can be emitted.

## Where this is machine-checked

- `scripts/emit-conformance.mjs` — the map above, run against any receipt.
- `scripts/drop-in-check.mjs` — proves the published npm verifier, the
  published PyPI verifier and the published MCP door against the public
  registries.
- `packages/psi-verifier/test/fixtures/psi-seal-envelope.json` — one canonical
  signed envelope, with its published test key, that anyone can verify.
