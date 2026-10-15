# APEX Full Automation: Self-Serve Funnel + Founding Members + Safety Walls

Goal: the business runs itself. A stranger can discover the site, sign up, get an API key, seal receipts, hit limits, upgrade, and pay — with zero emails to you. A Founding Member can apply, accept the charter, get a seat, a referral code, and the approved script — automatically. Safety walls enforce themselves and alert you only when something needs a human.

## 1. Self-serve signup → paid plan (zero-touch revenue)

- **Instant API key on signup**: after email confirmation, auto-provision a free-tier notary API key (`apex_ntry_...`) and show it once on the Dashboard with a copy-paste curl command. No manual key creation.
- **Automatic limit enforcement** (already live): 20 receipts/min, 100/day via the atomic quota counter. Extend the rejection response to include an upgrade link so a blocked user lands directly on checkout.
- **Upgrade prompt automation**: when a key hits 80% and 100% of its daily limit, send one automatic email (Resend) with the upgrade link — no manual follow-up.
- **Stripe self-serve checkout** (already built: create-checkout, check-subscription, webhooks): verify the full loop end-to-end — pay → webhook → `notary_subscriptions` tier upgrade → key limits raised automatically → welcome email sent (`welcome_sent_at`). Fix any gap found.
- **Auto-downgrade on cancellation**: webhook on subscription cancel/payment failure → tier back to free, limits reduced, polite email. Currently partially manual.

## 2. Founding Member onboarding (automatic, but operator-gated)

Keep one human gate (your approval) but automate everything around it:

- **Application → auto-verification**: applicant submits on `/founding`, confirms email, status flips to VERIFIED automatically (already works).
- **Auto-approve option**: add a config flag in `src/config/founding.ts` — when ON, verified applications are auto-reserved to the lowest free seat without you clicking approve. Default OFF (you keep the gate); you can flip it later.
- **Automatic welcome kit**: on seat reservation, auto-email the member their seat number, referral code, the approved outreach script, and the "what you may / may not say" rules (the §6 acknowledgement they signed).
- **Referral tracking** (already idempotent per paid invoice): add an automatic monthly summary email to you listing pending commissions to settle — payout stays manual by design.

## 3. Safety walls (automatic defense layer)

- **Partner false-claims wall**: 
  - A single approved script + banned-claims list stored in the database (not scattered in code).
  - Partner-facing pages/emails render only from that script — partners cannot edit it.
  - The public wall shows only name + seat + receipt; no partner can publish custom claims anywhere on the site.
- **Abuse wall**: auto-revoke API keys after sustained limit violations (e.g. 3 consecutive days at hard limit with 429-storm behavior), with an alert email to you.
- **Access control audit**: verify RLS on `partners`, `partner_referrals`, `founding_applications`, `notary_api_keys` — partners see only their own row; admin functions require the `admin` role; no partner path reaches operator surfaces.
- **Honesty wall**: automated check that public pages render only live data (existing rule) — any new automated email/page copy goes through the same banned-vocabulary list (no "sovereign", no legal/compliance promises, no invented traction).

## 4. What stays manual (deliberately)

- Seat approval (unless you flip the auto-approve flag), commission payouts, enterprise "Contact Sales" deals, and the 14 intentional linter warnings. These are judgment calls, not automation gaps.

## Technical details

- Edge functions touched: `founding-registry` (auto-approve flag + welcome kit email), `stripe-webhook` (downgrade path), `notarize`/`notarize-batch` (upgrade link in 429 responses), new small `limit-alert` logic in the quota path, monthly commission digest via scheduled function.
- New DB: `partner_script` config table (GRANT + RLS per standard block), auto-approve flag in founding config.
- Emails via existing Resend secret. No new secrets needed.
- Verification: full signup→key→seal→limit→upgrade test in the preview with a test account; founding apply→verify→reserve→welcome-email flow; abuse-revoke unit test; `bunx vitest run` must stay green (73 tests).
