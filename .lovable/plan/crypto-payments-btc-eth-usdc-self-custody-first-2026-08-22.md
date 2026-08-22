# Crypto Payments — BTC, ETH, USDC (self-custody first)

## The honest read

Crypto payments will not, on their own, change adoption. What they do change is
two specific things that matter for this project:

1. **Narrative coherence.** A protocol that anchors proofs in Bitcoin and then
   only accepts Visa looks borrowed. Accepting BTC closes that loop.
2. **Reach without permission.** Buyers in jurisdictions where card checkout
   fails (sanctions friction, no card, corporate procurement blocks) can still
   pay. That is the same "no permission required" logic as the free verifier.

What it does not do: it does not remove the need for invoices, and it is a poor
fit for recurring billing. So Stripe stays for subscriptions; crypto covers
one-off purchases and prepaid credit packs.

## What gets built

**Self-custody, no processor.** You publish receive addresses; the site watches
the chain and activates the purchase when payment confirms. No middleman, no
percentage cut, no account to claim, nothing to freeze. This is the "greatest
path" — it also means you hold the keys and the volatility.

Assets: **BTC (L1)**, **ETH (L1)**, **USDC (ERC-20 on Ethereum L1)**.

### What can be bought with crypto

| Item | Price | Delivered |
|---|---|---|
| Article 50 Conformity Receipt | $29 equivalent | 1 countersigned receipt credit |
| Receipt pack — 10 | $249 equivalent | 10 credits |
| API credits — 10,000 calls | $199 equivalent | quota added to your API key |
| Registry listing — 12 months prepaid | $1,990 equivalent | listing active for a year |

Subscriptions ($49/mo Prover, $199/mo listing) stay card-only. Crypto buyers get
the prepaid annual equivalent instead.

### The payment flow

```text
1. Buyer picks an item, picks BTC / ETH / USDC
2. Site quotes: exact asset amount, locked for 20 minutes, from a live rate feed
3. Site shows a unique address + QR + exact amount + memo-free reference
4. Buyer pays from any wallet
5. Watcher (runs every 2 min) sees the payment on-chain
6. 1 confirmation  -> "SEEN, awaiting confirmations"
   3 confirmations -> credits activate, receipt emailed
7. Underpaid / late / overpaid cases handled explicitly, never silently
```

Every state is real. Nothing shows "confirmed" before the chain says so — the
same rule already applied to the Bitcoin anchor display.

### Address strategy

- **BTC:** you provide an account **xpub** (watch-only, never a private key).
  The site derives a fresh unused address per invoice, so payments are
  unambiguous and privacy is preserved.
- **ETH / USDC:** a single receive address you provide. Because one address
  serves all invoices, matching is done on **exact amount + time window**, and
  quotes are given with unique trailing decimals so two invoices can never
  collide.

### Honesty and legal wording

- A crypto payment is a payment, not a proof. The receipt page states clearly
  that the on-chain payment tx is separate from the anchoring tx.
- Refunds: stated up front as manual, on-chain, at the paid amount in the same
  asset, minus network fee. No fiat refunds for crypto payments.
- Rates: the quote page names the rate source and the lock expiry. No hidden
  spread. Tax handling remains the buyer's and your responsibility — no claim
  otherwise appears anywhere.

## Pages and surfaces

- `/products` — each eligible item gains a second button: "Pay with crypto".
- `/pay/:invoice` — new page: amount, address, QR, countdown, live state
  (AWAITING / SEEN / CONFIRMING n/3 / PAID / EXPIRED / UNDERPAID), explorer link.
- `/dashboard` — crypto purchases listed beside card purchases; credits shown
  in the existing entitlements strip.
- `/crypto` — short public page: which assets, why self-custody, refund policy,
  and the receive-address disclosure with links to public explorers so anyone
  can audit the flow. Fits the "audit everything yourself" posture.

## Technical notes

- New tables `crypto_invoices` (asset, address, derivation index, quoted amount,
  fiat amount, rate + source, status, expiry, txid, confirmations, user_id,
  service_key) and `crypto_rate_cache`. RLS: buyer reads own invoices; writes
  are service-role only, so no client can mark itself paid. GRANTs written with
  the table.
- Edge functions:
  - `crypto-quote` — creates an invoice, derives/assigns an address, locks a rate.
  - `crypto-watcher` — cron every 2 minutes. BTC via mempool.space address API;
    ETH via a public JSON-RPC; USDC via ERC-20 Transfer log scan. Any API failure
    is logged and skipped — never flips an invoice to a false state (same rule as
    `btc-anchor-poller`).
  - On confirmation it calls the existing `provisionCheckout`-equivalent path so
    crypto and Stripe activate entitlements through one shared code path.
- BTC address derivation from xpub uses a small audited BIP32/BIP84 dependency;
  no private key ever touches the server.
- Rates from a public price API with a cached fallback; if no rate is available
  the crypto button is disabled with an honest message rather than guessing.

## Secrets you will need to provide

- `BTC_XPUB` — watch-only account xpub (zpub/xpub) for receiving.
- `ETH_RECEIVE_ADDRESS` — one address for ETH and USDC.
- Optionally `ETH_RPC_URL` if you want a dedicated node instead of a public one.

Never a private key or seed phrase — the site cannot spend, only watch.

## Build order

1. Tables + RLS + grants, `crypto-quote`, `/pay/:invoice` with live states.
2. `crypto-watcher` on cron, BTC first (best public API), then ETH, then USDC.
3. Shared provisioning so crypto and card purchases grant identical credits.
4. `/crypto` policy page, `/products` buttons, dashboard rows.
5. Tests: quote math, underpay/overpay/expiry handling, watcher state machine.
   All existing tests stay green.

## What I would not do

- No processor auto-converting to fiat: it reintroduces the middleman you are
  trying to remove, and it can freeze funds.
- No new token, no payments in a coin you issue. That would undermine the
  neutrality claim the whole protocol rests on.
- No on-chain subscriptions. The tooling is not reliable enough; prepaid packs
  achieve the same revenue with none of the failure modes.
