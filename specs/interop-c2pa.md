# Interop Note — C2PA and PSI

- note id: `PSI-INTOP-C2PA-1`
- published: **2026-09-28**
- counterpart: C2PA (Content Provenance and Accessibility) — the open media
  provenance specification behind Content Credentials, with major creator and
  AI-platform tooling shipping through 2025–2026
- posture: **complementary layers**. C2PA answers *who created and edited this
  asset*; PSI answers *which bytes, at what provable time*.

## What each layer is for

| Concern | C2PA | PSI |
|---|---|---|
| Unit of proof | manifest embedded in/alongside the asset (assertions, hashed resources, signatures, claims) | receipt envelope over any byte-subject |
| Edit history | assertion chain inside the manifest | Merkle assembly over per-version leaves |
| Trust model | issuer certificates, signing time-stamps | recomputation + Bitcoin-anchored existence |
| Primary domain | photos, video, audio, generative media | anything: media, decisions, records, claims, payments |
| Offline check | validate manifest signatures | recompute under published rules, no service needed |

## The bridge — one receipt inside one manifest

1. seal the asset (or the finished C2PA manifest itself) under
   `PSI-SEAL/1.0.0`, producing `seal_hash`;
2. add the seal as a **dry-run assertion** on the asset: a
   `c2pa.dry_run_assertion`-style entry, or a user-manifest assertion whose
   `data` carries the PSI envelope or its `seal_hash` plus a resolvable
   receipt reference;
3. anchor the seal's Merkle root to Bitcoin.

The asset now carries its media provenance *and* a chain-anchored existence
proof. Either can be verified alone.

## Verification order when both are present

1. C2PA layer: signature chain and manifest integrity (who, with which edits).
2. PSI layer: digest recomputation of the asserted subject (exact bytes).
3. Bitcoin anchor: earliest-time proof (when those bytes existed).
Divergence between layers is reported, never reconciled silently:
`variance detected`.

## Boundaries kept honest

- A PSI receipt does **not** certify authorship, consent, or truth of any
  assertion made inside a C2PA manifest.
- A C2PA manifest does **not** inherit PSI's anchoring unless the bridge is
  actually built for that asset.
- Conformance to one specification says nothing about conformance to the other.

## Why sit inside rather than compete

Media provenance is an installed base of tools, formats, and player support.
The evidence layer does not replace that base; it makes the base's own claims
checkable later — including after every issuer certificate in the chain has
expired or been rotated.
