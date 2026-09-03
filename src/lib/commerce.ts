// APEX PSI — commercial surfaces.
// The protocol is free. These are the paid, countersigned artefacts:
// Product display metadata. Checkout sessions are created server-side and
// bound to the authenticated customer so purchases can activate immediately.

export const CHECKOUT = {
  /** One-off Article 50 Conformity Receipt — countersigned by the APEX trust anchor. */
  conformityReceipt: {
    price: "$29",
    cadence: "one-off",
    label: "Article 50 Conformity Receipt",
  },
  /** PSI Prover — managed notary API subscription. */
  prover: {
    price: "$49",
    cadence: "per month",
    label: "PSI Prover",
  },
  /** Supplier Registry listing — public procurement console entry. */
  registryListing: {
    price: "$199",
    cadence: "per month",
    label: "Supplier Registry Listing",
  },
} as const;

export type CheckoutKey = keyof typeof CHECKOUT;

// ── Self-custody crypto payments ────────────────────────────────────────────
// One-off purchases and prepaid packs only. On-chain recurring billing cannot be
// enforced honestly, so subscriptions stay on cards.

export const CRYPTO_ASSETS = [
  { id: "BTC", label: "Bitcoin", note: "3 confirmations", chain: "Bitcoin L1" },
  { id: "ETH", label: "Ethereum", note: "12 confirmations", chain: "Ethereum mainnet" },
  { id: "USDC", label: "USDC", note: "12 confirmations", chain: "Ethereum mainnet" },
] as const;

export type CryptoAssetId = (typeof CRYPTO_ASSETS)[number]["id"];

export const CRYPTO_ITEMS = [
  {
    key: "receipt_1",
    label: "Article 50 Conformity Receipt",
    price: "$29",
    delivers: "1 countersigned receipt credit",
  },
  {
    key: "receipt_10",
    label: "Receipt pack — 10",
    price: "$249",
    delivers: "10 countersigned receipt credits",
  },
  {
    key: "api_credits_10k",
    label: "API credits — 10,000 calls",
    price: "$199",
    delivers: "10,000 API calls of quota",
  },
  {
    key: "registry_12mo",
    label: "Registry listing — 12 months",
    price: "$1,990",
    delivers: "Supplier Registry listing for 12 months",
  },
] as const;

export type CryptoItemKey = (typeof CRYPTO_ITEMS)[number]["key"];

