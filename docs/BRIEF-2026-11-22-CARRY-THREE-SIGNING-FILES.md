# BRIEF 2026-11-22 — carry three signing files into the Lovable project, then publish

Two-end contract. The laptop side is already done and proven; the cloud side is one paste by
apexmuse plus Master's publish click. Nothing in this brief changes a price, a claim or a key.

## What is true on each side right now (measured 22 Nov 2026, UTC)

- GitHub `kawal393/APEX-PSI` main = `0eb7212`. The three files below are in that commit.
- The live site serves byte-identical output to before: bundle `assets/index-Bq8zN87Z.js`, and
  `/.well-known/apex-psi-trust-anchor.json` still answers `active_key_id = apex-psi-2026`
  (apex-psi-2026-11 still `pending`). Lovable publishes its own copy; a publish does not pull GitHub.
- `https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/signing-identity` answers
  `404 {"code":"NOT_FOUND"}` — the instrument does not exist in the runtime.
- The sealing door itself works: receipts 6022, 6023, 6024 (21 Nov 23:24–23:47 UTC) all answer
  `verified: true` from `verify-hash`, signed under apex-psi-2026-11.
- The till is live and delivers: Pro `price_1ULXon1dcr4wA5Txw8CHbAXf` ($11 USD/mo) and Ultra
  `price_1ULXpN1dcr4wA5TxSIq8htAN` ($55 USD/mo), both active on `acct_1Surmi1dcr4wA5Tx`, both
  charged by the two links the served page carries, both mapped to a raised hosted tier
  (2,000/day and 20,000/day against the free 100/day). `create-checkout`, `sync-subscription` and
  `create-api-key` answer 401; `stripe-webhook` answers 400 missing signature, which also proves
  `STRIPE_SECRET_KEY` is configured in the runtime.

## What goes into the Lovable project (three paths, no others)

1. `supabase/functions/signing-identity/index.ts` — new file. Read-only: reports whether
   `APEX_PSI_ED25519_SEED` is configured, the PUBLIC half of the identity it derives, and how that
   key is declared in the published anchor. Signs nothing, reads no table, returns no secret value.
2. `supabase/functions/notarize/index.ts` — changed region is the final `catch` only: it returns
   `{"error":"seal_refused","reason":<the exception's own message, 300 chars>,"help":<this
   project>/functions/v1/signing-identity}` instead of `{"error":"Internal server error"}`, and
   429 `daily_allowance_exceeded` when the reason names a quota. Messages from the signing path
   name the environment variable, never its contents.
3. `public/.well-known/apex-psi-trust-anchor.json` — declares the completed rotation:
   `active_key_id = apex-psi-2026-11`; apex-psi-2026 → `status: "rotated"` (never revoked, so
   every receipt already issued still verifies); apex-psi-2026-11 → `status: "active"`; the `note`
   records the first receipt signed under it.

Source of truth for all three: `git show 0eb7212 --stat`, then take the files at that commit.
Do not retype them, and do not carry any other path from that commit.

## Acceptance — eyeball these five, in this order, after Master publishes

1. `curl https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/signing-identity` → 200 JSON with
   `"verdict": "SIGNS_AND_IS_PUBLISHED"` and `"anchor_key_id": "apex-psi-2026-11"`.
2. `curl https://www.ai-governance-standard.com/.well-known/apex-psi-trust-anchor.json` →
   `"active_key_id": "apex-psi-2026-11"` and apex-psi-2026 listed as `rotated`.
3. The served bundle name is no longer `index-Bq8zN87Z.js` (proof the publish carried source).
4. On the laptop: `npm run check:notary-canary` → `PASS` on all three rules (R1 identity,
   R2 binding, R3 flow). Before the carry it reads FAIL on two of three, so a PASS is the proof.
5. `npm run check:commerce` → `PASS — site money claims match what the account sells`, including
   the two new lines `pay delivers` and `doors alive`.

If (1) or (2) is not true, the carry did not land — say so rather than retrying a publish.

## Ownership boundary

- Laptop (qoder): the three files, the canary, the two guards, this brief. Pushed as `0eb7212`.
- Lovable (apexmuse): putting those three paths into the project and nothing else. No new key, no
  secret edit, no schema, no copy change, no price change.
- Master: the publish click, and only the publish click.

## What this brief does NOT fix

- `npm run check:notary-canary` R3 counts on someone sealing. The daily watchman is a separate
  automation, created on the laptop; it reads these gates every morning and stays quiet while they
  are green.
- The public ledger copy in git still starts at sequence 5320 and its newest row is the one the
  06:40 AEST refresh last saw. Fresh receipts are on the website immediately and in git the next
  morning; sequences 1–5319 need one dashboard export from Master and are not fixed here.
- Nothing about marketplaces, directory listings or the x402 machine-money door.
