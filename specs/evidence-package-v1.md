# PSI Evidence Package — v1

- spec id: `PSI-EVIDPKG-1`
- published: **2026-09-28**
- purpose: a single portable package that carries a set of sealed items, their
  receipts, their anchors, and a printed-readable report — so a third party
  can verify a whole story from one file, offline
- consumers: legal teams, auditors, insurers, journalists, anyone who must
  hand someone else provable bytes

## Package layout

```
<name>.evidence-package/
  manifest.json      # the package seal subject — canonical, JCS-serialised
  items/             # the payload bytes exactly as sealed (octet-for-octet)
  receipts/          # one PSI receipt envelope per item
  anchors.json       # Merkle roots -> txid + block height, per root
  custody.json       # ordered custody log (append-only; see below)
  report.pdf         # human-readable rendering; its own digest in manifest
```

`manifest.json` fields: `kind: "apex.evidence.package.v1"`, `created_at`,
`item_count`, `merkle_root`, `receipt_set_digest`, `anchors_digest`,
`custody_digest`, `report_digest`, `generator` (name+version), `licence`.
The manifest itself is sealed, so the package seals its own contents.

## Verification, one command

```
python -m apex_psi_verify package <name>.evidence-package/
```

Checks, in order: (1) every item digest recomputes against `items/`;
(2) every receipt envelope conforms to PSI-SEAL/1.0.0 and its `seal_hash`
recomputes; (3) the item Merkle root matches `anchors.json` and the anchor
inclusion proof resolves to a Bitcoin transaction; (4) `report.pdf` digest
matches the manifest. Any failure prints the failing check and nothing else —
a broken package never partially verifies.

## Custody log

Each entry: `{ at, actor, action, evidence_digest }`. Actions are observational
records made by the holder's systems (`sealed`, `exported`, `received`,
`printed`, `annexed`); they are **claims by the log author, sealed so they
cannot be quietly edited later** — the seal proves the record's age and
integrity, not the truth of what it describes. The package separates these two
kinds of proof visibly, on the report's face.

## What the package does not claim

- It does not adjudicate. It presents provable bytes and provable times and
  stops there.
- It does not certify admissibility in any forum. Admissibility is a decision
  of the receiving forum under its own rules; a package is a package.
- It does not warrant the contents were lawfully obtained or are complete —
  it states what it holds and proves it hasn't changed.

## Free and paid

Building, verifying, and reading a package: free forever, offline, no account.
The commercial edge is the **certified** variant: priority anchoring,
conformance listing, and the `Apex Verified` mark on the report face, per
`/license`. PDF is the required delivery format for human-facing reports.
