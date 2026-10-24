# Brand update

# Phone launch recovery (18 Oct 2026)
- [x] Redirect legacy `/index` and `/index.html` launches while preserving query parameters and the selected home view.
- [x] Verify both launch paths on a phone-sized browser (no runtime errors); public site confirmed blank with `supabaseUrl is required`.
- [x] Load and validate managed public Cloud settings explicitly during bundling to prevent silent blank-screen releases.
- [ ] Update the published site and recheck the installed phone app — requires publishing; existing installed shortcuts on the drifted legacy domain may need reinstalling from the live domain.

# Website / coder alignment (17 Oct 2026)
- [x] Align public verification verdicts with cryptographic checks and distinguish online ledger lookups.
- [x] Correct audited Notary, SDK, MCP, draft metadata and parity-display mismatches without changing the frozen seal grammar.
- [x] Resolve the generated-file lint failure without editing managed connectors.
- [x] Run website, verifier and cross-language tests; check the public verification flow in the browser (94 passed, 5 intentional live-test skips; offline signature acceptance/rejection verified).

## Release dependencies
- [ ] Confirm external verifier package releases — requires registry publisher access.
- [ ] Confirm payment-key rotation — requires account owner confirmation; current source scan is clean.
- [ ] Confirm control-plane custodian fix — requires the separate laptop repository and its test results.

- [x] Rename current website brand descriptors and metadata.
- [x] Update sharing artwork.
- [x] Verify branding and existing tests (34 passed; homepage title and artwork checked).

# Hosted product model
- [x] Restore the limited public hosted allowance: 20 receipts per minute and 100 per day.
- [x] Distinguish unlimited independent verification from paid operated capacity.
- [x] List Builder, Scale and Institutional hosted products without publishing exact prices.

# Evidence interoperability (SCITT bridge)
- [x] `format: psi | scitt | both` on the sealing service.
- [x] Interop note updated with the live bridge output.
- [x] API page documents the bridge.
- [x] Deployed and tested live.

# Product surfaces
- [x] Agent receipts (/agent)
- [x] Evidence console (/console)
- [x] Media provenance bridge (/media)
- [x] Developer launch kit (README quick start, llms.txt, sitemap)

# Four-view homepage
- [x] Preserve the existing APEX visual identity and keep the company logo visible in navigation.
- [x] Divide the homepage into What is APEX, Why APEX, Explore APEX, and Live Seal views.
- [x] Keep every existing deep page and route available through the Explore view.
- [x] Add a real local-file fingerprinting and public-receipt workflow with media preview.

# Technical 10/10
- [x] Python add-on (decorator + LangChain handler), live-tested
- [x] ML-DSA-65 on every new receipt, verified against trust anchor
- [x] Public inclusion-proof lookup, verified live
- [x] One-command conformance check (npm run test:conformance)
- [x] IETF merkle-01, agent-01, http-00 uploaded (awaiting user email confirmation); 05/06 left to lapse
- [x] ML-DSA-65 on batch and API sealing too

## Automation (Oct 2026)
- [x] Free API key issued automatically on first visit to /upgrade after sign-in
- [x] Upgrade link in every limit-reached response (already live)
- [x] Automatic emails on plan cancellation / failed payment
- [x] Founding: welcome kit email with seat, approved script, may/may-not-say rules
- [x] Founding: optional auto-approve flag (off by default)
- [x] Safety wall: banned claims blocked on Founding applications
- Deferred outside this website alignment pass: abusive-key revocation alerts, monthly referral digest, and usage-warning emails. These are not implemented or verified here.

# Strict signature enforcement (24 Oct 2026)
- [x] Proof bundles: missing signature, unpinned key, forged payload, altered leaf/root all fail.
- [x] Receipt ID lookup: signature checked locally before "verified".
- [x] In-band media: VALID only under the pinned APEX anchor; otherwise INTEGRITY ONLY.
- [x] Engine export includes the ledger signature and commit timestamp; odd-tree inclusion proofs fixed.
- [x] Commit service fails closed instead of issuing a pseudo-signature (deployed, live-tested).
- [ ] Publish the site so the live checker uses the strict rules.
