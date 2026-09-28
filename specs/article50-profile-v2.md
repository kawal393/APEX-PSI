# PSI Article 50 Conformance Profile — v2

- profile id: `PSI-EUA50-2`
- published: **2026-09-28**
- status: public, free, machine-readable
- law: Regulation (EU) 2024/1689 (the AI Act), **Article 50** —
  transparency obligations for AI-generated and synthetic content
- obligations apply from: **2 August 2026** (in force)
- implementing guidance: the Commission's **Code of Practice on transparency
  of AI-generated content**, published **31 July 2026**
- penalty tier referenced: AI Act Art. 99(4) — up to **€15,000,000 or 3% of
  total worldwide annual turnover**, whichever is higher
- schema: `PSI-SEAL/1.0.0` (see [`psi-seal-1.md`](psi-seal-1.md))
- prior art: the PSI specification was first published publicly as an IETF
  Internet-Draft (`draft-singh-psi`, rev 00) in **March 2026**, predating the
  SCITT Article 50 receipts profile of **May 2026**. It was superseded by
  **rev 01, filed 29 August 2026**, which is active on the IETF datatracker
  with current expiry **2 March 2027**. The **March 2026** first-publication
  date is the priority date and stands as prior art.

## What this profile maps

| AI Act duty (Article 50, summary) | PSI operation |
|---|---|
| Machine-readable marking of synthetic content by providers | the marking event is sealed at generation: `SEAL(mark_digest)` via the SDK hook (`psi-openai`, `psi-anthropic`, `psi-vercel-ai`) |
| Disclosure of AI-generated / manipulated content (deepfake class) by deployers | the disclosure record is a receipt: origin + generation event + edit chain, digest verifiable offline |
| Provenance-preserving disclosure of edits | the edit chain is a Merkle assembly over per-version leaves (R8/R9) |
| Independently verifiable evidence of when a marking existed | the Merkle root is anchored to a Bitcoin transaction (`ANCHOR`) |
| Citation of the evidence by auditors, platforms, rights-holders | `CITE` — a resolvable receipt reference (`/r/<hash>`) |

Exact paragraph numbering must be verified against the official text of the
Regulation; this profile describes duties by content, not by quotation.

## What conformance means here, precisely

A system conforms to this profile when, for a marked or disclosed item:

1. the marking or disclosure event is sealed under `PSI-SEAL/1.0.0`;
2. the seal's Merkle root is anchored to a Bitcoin transaction;
3. the receipt verifies with the independent MIT verifier — TypeScript or
   Python — with no access to any APEX system;
4. the observable result is one of: `verified + anchored`, `verified +
   SEAL PENDING`, `variance detected`, `not found`. Nothing else.

## The claims fence (binding on every implementation of this profile)

PSI publishes **integrity and existence proofs**. It does not adjudicate
truth, liability, or legal outcome, and conformance to this profile is not a
claim that any court, regulator, or party must accept anything. A receipt
proves *the bytes and the time* — no more.

## Free and paid, stated once

- Verification, the keyless check, and the offline verifier: **free forever**.
- Sealing at scale, priority anchoring, conformance listing, and the
  `Apex Verified` mark: the commercial edge. See `/license`.

## Verify this profile yourself

The live keyless endpoint (no key, no account, no fee):

```
GET https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/verify-hash?hash=<64-hex>
```

Ledger state (receipts, anchors, latest block):

```
GET https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/ledger-stats
```

Cross-language conformance vectors: `psi-conformance/vectors/`.
