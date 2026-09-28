# APEX PSI — Specification Shelf

This directory holds the dated, public, machine-readable specifications of the
Apex PSI verification protocol. Every document here is prior art: it is
published under its own date, its bytes are committed to version control, and
its digest is recorded in [`anchored-releases.md`](anchored-releases.md).

## What is on the shelf

| Document | What it defines |
|---|---|
| [`psi-seal-1.md`](psi-seal-1.md) | PSI-SEAL/1 — the frozen seal-formation rules R1–R12 and the five protocol verbs |
| [`article50-profile-v2.md`](article50-profile-v2.md) | PSI conformance profile for EU AI Act Article 50 transparency obligations |
| [`interop-scitt.md`](interop-scitt.md) | How SCITT COSE receipts and PSI receipts relate, and how to anchor one inside the other |
| [`interop-c2pa.md`](interop-c2pa.md) | How a C2PA manifest can carry a PSI receipt |
| [`agent-envelope-v1.md`](agent-envelope-v1.md) | The machine-to-machine obligation/fulfilment envelope, including x402 payment mapping |
| [`discrepancy-score-v1.md`](discrepancy-score-v1.md) | The claim-vs-recomputation divergence score and its public endpoint |
| [`evidence-package-v1.md`](evidence-package-v1.md) | The sealed chain-of-custody evidence package format |
| [`truth-commons-charter-v1.md`](truth-commons-charter-v1.md) | How predicates are defined, reviewed, and changed without a hidden authority |
| [`anchored-releases.md`](anchored-releases.md) | The release register: artifact, digest, date, anchor status |

## Licence posture of this shelf

- Verification code and these published rules: **MIT** — free, forever, no
  account required.
- Seal-formation rules (PSI-SEAL/1): **published** — anyone may implement them
  independently, without permission.
- The APEX PSI Sealing Engine (the service that creates seals and anchors
  them): **free for all use, including commercial and institutional use**
  (per the repo's own schema header); reserved: the APEX marks, and building
  a competing seal generator. See `src/lib/psi-schema.ts` and `/license`.
- The APEX Verified / PSI-SEAL COMPLIANT marks: **reserved** — commercial use
  requires a written mark licence.

> Open item, deliberately not papered over: the engine licence wording above
> (free-use) and the `/license` page wording (proprietary licence required)
> do not yet match. The ledger records this as an unresolved licence
> inconsistency pending the owner's single decision. Until then, the code
> header is the source of truth for engine terms.

## What this shelf is, and is not

This is an evidence and specification layer. It publishes integrity and
existence proofs. It does not adjudicate truth, liability, or legal outcome,
and nothing here should be read as legal advice or as a claim about how any
court, regulator, or party will treat any document.

## Stability rule

These rules are frozen. Changing any normative rule in `psi-seal-1.md` is a
versioned event: it requires a new schema id (PSI-SEAL/2), a lockstep change
in every implementation (TypeScript, Python), a conformance-vector update, and
an explicit migration note for sealed history. The digest of the published
rules is itself part of every seal (rule R12); silence is not an option.
