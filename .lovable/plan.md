# Three Ways to Make Revenue Inevitable

## Where we actually stand (verified, not guessed)

Queried live today:

- 3,310 visits from 1,567 unique visitors
- 1,649 seals, 106 published articles, 4 notary keys, 2 API keys
- 1 captured marketing lead
- 2 subscription rows, **0 paying**

So the machine works and traffic exists. The gap is not technology and not
awareness. The gap is that **nothing on this site has a price attached to a
moment of pain**. Every valuable action — seal, verify, receipt, badge, API
call — is currently free and unlimited, and the only paid surface is a
pricing section that talks about tiers instead of selling one.

Revenue does not flow from persuasion. It flows when three conditions meet:
someone has a deadline, we are the cheapest way to survive it, and paying
takes 30 seconds.

---

## Idea 1 — Sell the countersignature, not the software

The protocol stays free forever. What an enterprise cannot self-produce is
**our signature on their claim**.

Free: hash it, seal it, verify it, embed the badge.
Paid: an **Article 50 Conformity Receipt** — the same proof, but
countersigned by the APEX PSI trust anchor (Ed25519 + LMS), Bitcoin-anchored,
issued as a PDF with our seal, permanently resolvable at a public receipt URL,
and listed in the public registry.

Why this is inevitable: a self-signed proof is a claim; a countersigned proof
is evidence. Auditors, insurers and procurement reviewers only accept the
second kind. We are the only party that can issue it.

- $29 one-off per receipt (self-serve, no account friction)
- $99/mo Prover — 500 countersigned receipts, API access
- $2,400/yr Institutional — unlimited, SLA, white-label, named anchor
- Metered overage after quota

Nothing new needs inventing. `notarize`, `pqc-sign`, `blockchain-anchor` and
`generate-receipt-pdf` already exist. They just need a paywall and a price.

## Idea 2 — Charge the checkers, not the builders

Builders resist paying for compliance. The people who *verify* others pay
happily, because verification is their liability.

Build the **Verified Supplier Registry** as a two-sided market:

- Free side (demand): a procurement/audit console where any buyer, auditor or
  regulator can paste a vendor domain and see whether that vendor publishes
  PSI receipts, plus a downloadable vendor-risk report. Free forever, no
  login. This creates the demand that gives the badge value.
- Paid side (supply): vendors pay to be listed and continuously monitored —
  $199/mo per listed entity — because buyers are checking the registry.

This is how ISO, SOC 2 and Verisign all became money: the buyer's checklist
did the selling. Once one procurement team links to our console, every vendor
on their list has to pay.

## Idea 3 — Make every proof a billboard, then charge to remove our name

The compounding loop. Every free artifact we emit carries our mark and links
back:

- Public receipt page per proof (`/r/:hash`) — 1,649 indexable pages today,
  growing with every seal
- Embeddable badge that must backlink to the receipt
- `Compliance-Receipt` HTTP header on adopters' own traffic

Monetize the *removal* and the *permanence*, never the verification:

- White-label (our name off the badge and receipt): paid
- Custom receipt domain (`proof.theircompany.com`): paid
- Proof persistence beyond 90 days + Bitcoin anchoring: paid
- Bulk/CI-CD API volume: metered

Free users are the distribution channel; paying users are the ones who
outgrew being a billboard. This is exactly the Stripe/Cloudflare/Twilio
pattern, and it means marketing cost trends toward zero.

---

## Build order

**Phase 1 — Turn on the meter (revenue this week)**
- Wire the existing Stripe payment links to real tiers in `Pricing.tsx`
- Paywall the countersigned receipt: free proof always, payment required for
  the anchored + countersigned PDF
- Self-serve $29 one-off receipt checkout, no account required
- `check-subscription` gates API quota on `apex_api_keys.tier`

**Phase 2 — The checker console**
- Public `/registry/check` domain lookup with a free vendor-risk report
- Paid continuous listing + monitoring for vendors
- Email alerts when a listed vendor's proofs lapse

**Phase 3 — The billboard loop**
- Public receipt pages `/r/:hash` for all 1,649 proofs, indexable
- Embeddable badge with mandatory backlink
- White-label and custom-domain upgrades behind the paywall

**Phase 4 — Close the leak**
- Fix conversion: 1,567 visitors produced 1 lead. Add one clear paid CTA per
  high-intent page (`/verify`, `/seal`, `/pramaan`, `/spec`, `/api`)
- Post-seal upsell: after any free seal, offer the countersigned upgrade at
  the exact moment the user feels the proof matters

## Technical notes

- Payments: use the existing Stripe integration; add metered usage prices for
  API volume and a one-off price for single receipts. Products/prices created
  via the Stripe tools, price IDs hardcoded in source per convention.
- Gating lives server-side only — `psi-api`, `notarize`, `notarize-batch` and
  `generate-receipt-pdf` check tier and quota against `apex_api_keys` /
  `subscriptions` before doing paid work. No client-side entitlement checks.
- Free verification stays unauthenticated and unmetered, forever. That is the
  moat, not the product.
- Registry monitoring reuses `monitoring_schedules` +
  `run-scheduled-monitoring` and the existing Resend sender.

## The honest part

Only one of these three needs to work for revenue to start. Idea 1 is the
fastest to cash because the machinery already exists and the deadline (Article
50, live since Aug 2) is already causing the pain. Ideas 2 and 3 are what make
it compound instead of trickle.
