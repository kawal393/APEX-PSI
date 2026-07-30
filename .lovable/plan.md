
# Institutional Signing Identity for In-Band Manifests

## Why

In-band manifests are currently signed with a fresh random keypair per file (`src/lib/c2pa-inband.ts:371` → `hybridSignEphemeral()`). This proves the bytes are unmodified, but proves nothing about **who** sealed them. Section 1 of the EU Code of Practice expects marking that is reliable and interoperable, which in C2PA terms means the manifest chains to a published, stable trust anchor.

This is the one gap a C2PA-literate reviewer at the AI Office would find. Everything else in the marking stack is verified working.

## What to build

### 1. Stable institutional keypair
Derive a long-lived Ed25519 + ML-DSA-65 keypair from a dedicated secret (not the service-role key, which `pqc-sign` currently falls back to). Private keys stay server-side only.

### 2. Published trust anchor
Serve the public half at a well-known location alongside the existing `compliance-receipt` file:

```text
/.well-known/apex-psi-trust-anchor.json
  { issuer, ed25519_pub, mldsa65_pub, suite, valid_from, spec_url }
```

Anyone — including an offline verifier — can fetch this once and check every APEX-sealed file forever.

### 3. Server signing endpoint
Harden `pqc-sign` into the single institutional signer: accepts a canonical claim (RFC 8785), returns the hybrid signature plus an issuer reference pointing at the trust anchor.

### 4. Two signature modes in the manifest
Keep both, labelled honestly in the UI and in the manifest itself:

- **Institutional seal** — signed by the APEX identity, attributable, chains to the trust anchor. Default for `/forge` and `/inband`.
- **Self seal** — the current ephemeral mode, integrity only, no attribution. Stays available for offline and privacy use, but is explicitly labelled as non-attributable rather than presented as equivalent.

### 5. Verifier updates
The detector on `/inband` reports three separate facts instead of one verdict: signatures valid, bytes unmodified, and **issuer identified / not identified**. A self-sealed file should read as "integrity verified, issuer not attributable" — not as a failure, and not as a full pass.

### 6. Documentation
Add the trust anchor and the two-mode distinction to `/eu-ai-act` Section A and `/inband`, since the AI Office is the intended reader of both.

## Technical notes

- New secret for the signing seed; never exposed client-side.
- Manifest gains `claim.issuer` and `claim.trust_anchor` fields; keep the existing box format and magic so already-sealed files still parse.
- Verification must stay offline-capable: the anchor is fetched and cacheable, never a required live call to APEX.

## Explicitly out of scope

No new pages, no new features, no redesign. This closes one gap and stops.
