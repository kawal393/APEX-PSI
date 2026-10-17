# Security policy — APEX PSI

A verification protocol is only worth as much as the honesty of what it claims.
For this repository, "security" therefore covers two things: cryptographic
correctness, and the gap between what a page says and what the code does.

## Where the code lives

| Component | Location | Licence |
| --- | --- | --- |
| Verifier (TypeScript, npm `apex-psi-verifier`) | `packages/psi-verifier` | MIT |
| Verifier (Python, `psi-verifier`) | `packages/psi-verifier-py` | MIT |
| Protocol specification | `public/ietf/`, `specs/` | — |
| Conformance vectors | `psi-conformance/` | — |
| Hosted notary (edge functions) | `supabase/functions` | proprietary |

`packages/psi-verifier` is the verifier this website runs in the browser. The
separate `kawal393/apex-psi-verify` repository is an Apache-2.0 post-quantum
demo and is **not** the PSI-SEAL/1 verifier.

## Known version caveat, stated plainly

`apex-psi-verifier@1.2.0` and earlier report whether a seal is *well formed*;
they do not verify the Ed25519 signature in rule R11. A forged seal passes
them. Use **1.3.0 or later**, which checks the signature against public keys you
supply and never treats an unverifiable signature as a pass. If you built
tooling against 1.2.0, that is our fault, not yours.

## Reporting a vulnerability

Use **private vulnerability reporting** on this repository:
Security → "Report a vulnerability". That form reaches the owner directly and
keeps the issue private until a fix exists. Do not open a public issue for a
live flaw.

There is deliberately no security email address published here yet. A mailbox
that cannot receive mail is worse than no mailbox, and the previous address used
in this estate was on a reserved domain.

Please include, in any order that is convenient:

1. Which component and version, and the commit if you know it.
2. The exact input — a seal, a hash, a request — that behaves wrongly.
3. What you expected, and what happened instead.
4. Whether the flaw lets a bad seal verify, or makes a good seal fail.

A reproduction we can run is worth more than a description. A failing test
applied directly is worth more still.

## What counts as a finding here

- A seal that verifies when it should not (signature, digest, canonicalisation,
  Merkle path, or sequence/ordering).
- A seal that fails when it should verify, including any divergence between the
  TypeScript and Python verifiers — they are required to produce byte-identical
  verdicts.
- Any statement in this repository's code, documentation or website that the
  code does not actually implement. These are treated as defects, not marketing.
- Trust-anchor and key-handling weaknesses, including a published key that does
  not correspond to what the notary signs.

Out of scope: volumetric testing of the hosted service, and requests to alter
what a specific verification says about a specific record. Money buys process,
never outcome — a finding is credited and fixed on its technical merit, and no
payment changes a verdict.

## Recognition

Reporters who are first to demonstrate a real flaw are credited by the name you
give us — nothing else is published, and no personal detail is required to
report. The correction itself goes into the public record with the date it was
made, because a verification protocol hides nothing about its own history.

## Response expectations

We aim to acknowledge within 7 days. We will tell you what we are doing and when
it ships. We will not promise a fix date before we have reproduced the problem.
