// Crypto-payable catalogue. One-off purchases and prepaid credit packs only —
// on-chain recurring billing is not reliable, so subscriptions stay on cards.

export type CryptoAsset = "BTC" | "ETH" | "USDC";

export const REQUIRED_CONFIRMATIONS: Record<CryptoAsset, number> = {
  BTC: 3,
  ETH: 12,
  USDC: 12,
};

export type CryptoItem = {
  key: string;
  label: string;
  usdCents: number;
  serviceKey: string;
  quantity: number;
  /** Months of access granted, when the entitlement is time-bounded. */
  months?: number;
  delivers: string;
};

export const CRYPTO_ITEMS: Record<string, CryptoItem> = {
  receipt_1: {
    key: "receipt_1",
    label: "Article 50 Conformity Receipt",
    usdCents: 2900,
    serviceKey: "conformity_receipt",
    quantity: 1,
    delivers: "1 countersigned receipt credit",
  },
  receipt_10: {
    key: "receipt_10",
    label: "Receipt pack — 10",
    usdCents: 24900,
    serviceKey: "conformity_receipt",
    quantity: 10,
    delivers: "10 countersigned receipt credits",
  },
  api_credits_10k: {
    key: "api_credits_10k",
    label: "API credits — 10,000 calls",
    usdCents: 19900,
    serviceKey: "api_credits",
    quantity: 10000,
    delivers: "10,000 API calls of quota",
  },
  registry_12mo: {
    key: "registry_12mo",
    label: "Registry listing — 12 months prepaid",
    usdCents: 199000,
    serviceKey: "registry_listing",
    quantity: 1,
    months: 12,
    delivers: "Verified Supplier Registry listing for 12 months",
  },
};

export function isCryptoItemKey(value: unknown): value is keyof typeof CRYPTO_ITEMS {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(CRYPTO_ITEMS, value);
}

export function isCryptoAsset(value: unknown): value is CryptoAsset {
  return value === "BTC" || value === "ETH" || value === "USDC";
}
