# Interop Note — SCITT and PSI

- note id: `PSI-INTOP-SCITT-1`
- published: **2026-09-28**
- counterpart: IETF SCITT (Supply Chain Integrity, Transparency and Trust) —
  architecture `draft-ietf-scitt-architecture`, COSE receipts, SCRAPI
  registration API, and its May 2026 EU AI Act Article 50 receipts profile
- posture: **compatible, not subordinate**. Neither system judges the other.

## What each layer actually does

| Concern | SCITT | PSI |
|---|---|---|
| Receipt container | COSE Signatures / countersignatures | JSON envelope under RFC 8785 JCS |
| Trust anchor | transparency services (append-only logs, service-operated) | Bitcoin transactions (chain nobody operates) |
| Signature suite | COSE/JOSE suites (ECDSA, EdDSA) | Ed25519, optional hybrid post-quantum LMS-W4-SHA256 |
| Primary scope | supply-chain statements, AI attestations | any byte-subject: files, decisions, model outputs, claims |
| Independent check | verify COSE signature + log inclusion | recompute digests offline; anchor inclusion proof against Bitcoin |
| Canonicalisation | COSE deterministic encoding | RFC 8785 JCS, vectors published |

These are different roots, not rival products. A system may use both at once.

## The two-way bridge

**Anchoring a SCITT receipt through PSI (recommended pattern):**

1. take the finished SCITT COSE receipt bytes;
2. compute `SHA-256` over the raw octets (PSI R5);
3. seal that digest as a PSI subject (R8/R9 leaf derivation) and anchor the
   Merkle root to Bitcoin (ANCHOR).
   The COSE receipt is now provably present at the anchored block height —
   without asking any transparency service.

**Carrying a PSI receipt inside a SCITT statement:** a SCITT statement may
embed the PSI envelope's `seal_hash` as an assertion claim; PSI verifies its
own envelope independently, so the claim remains checkable if SCITT services
are unreachable.

## Verification order, when both are present

1. SCITT layer: signature and log inclusion (who attested, in which log).
2. PSI layer: digest recomputation under the published rules (what changed).
3. Bitcoin anchor: earliest-time proof (when it existed).
A disagreement between any two layers is reported as `variance detected` —
never smoothed over.

## Neutrality clause

This note describes interoperability, not endorsement. PSI does not claim
SCITT conformance implies PSI conformance or vice versa; each check has its
own result. The specification texts of both efforts remain independently
implementable.
