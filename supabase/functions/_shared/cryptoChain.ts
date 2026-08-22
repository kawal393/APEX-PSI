// Self-custody crypto receiving helpers.
// The server only ever holds watch-only material: a BTC account xpub/zpub and a
// public Ethereum address. It can observe payments; it can never spend.

import { HDKey } from "npm:@scure/bip32@1.4.0";
import { base58check, bech32 } from "npm:@scure/base@1.1.6";
import { sha256 } from "npm:@noble/hashes@1.4.0/sha256";
import { ripemd160 } from "npm:@noble/hashes@1.4.0/ripemd160";
import type { CryptoAsset } from "./cryptoCatalog.ts";

export const DECIMALS: Record<CryptoAsset, number> = { BTC: 8, ETH: 18, USDC: 6 };
/** Atomic jitter window used to make each invoice amount unique per address. */
export const JITTER: Record<CryptoAsset, number> = { BTC: 100, ETH: 1_000_000_000_000, USDC: 100 };
export const USDC_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

const COINGECKO_IDS: Record<CryptoAsset, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDC: "usd-coin",
};

const b58 = base58check(sha256);

/** Re-encode a zpub/ypub as an xpub so BIP32 parsing accepts it. */
function normaliseExtendedKey(key: string): string {
  if (key.startsWith("xpub")) return key;
  const raw = b58.decode(key);
  const body = raw.slice(4);
  const xpubVersion = new Uint8Array([0x04, 0x88, 0xb2, 0x1e]);
  const out = new Uint8Array(4 + body.length);
  out.set(xpubVersion, 0);
  out.set(body, 4);
  return b58.encode(out);
}

function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}

/**
 * Derives the native-segwit (P2WPKH, bc1…) receive address at `index` from the
 * configured account xpub, using the standard external chain path `.../0/index`.
 */
export function deriveBtcAddress(accountXpub: string, index: number): string {
  const node = HDKey.fromExtendedKey(normaliseExtendedKey(accountXpub.trim()));
  const child = node.deriveChild(0).deriveChild(index);
  if (!child.publicKey) throw new Error("Could not derive a receive address");
  const words = bech32.toWords(hash160(child.publicKey));
  return bech32.encode("bc", [0, ...words]);
}

export type Rate = { usd: number; source: string };

/** Live USD rate with a cached fallback. Never guesses a price. */
export async function getRate(
  backend: { from: (t: string) => any },
  asset: CryptoAsset,
): Promise<Rate> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS[asset]}&vs_currencies=usd`,
      { headers: { accept: "application/json" } },
    );
    if (res.ok) {
      const body = await res.json();
      const usd = Number(body?.[COINGECKO_IDS[asset]]?.usd);
      if (Number.isFinite(usd) && usd > 0) {
        await backend.from("crypto_rate_cache").upsert(
          { asset, usd, source: "coingecko", fetched_at: new Date().toISOString() },
          { onConflict: "asset" },
        );
        return { usd, source: "coingecko" };
      }
    }
  } catch (error) {
    console.error("rate fetch failed:", error instanceof Error ? error.message : error);
  }

  const { data } = await backend
    .from("crypto_rate_cache")
    .select("usd, fetched_at")
    .eq("asset", asset)
    .maybeSingle();
  const cachedAt = data?.fetched_at ? Date.parse(data.fetched_at) : 0;
  if (data?.usd && Date.now() - cachedAt < 6 * 60 * 60 * 1000) {
    return { usd: Number(data.usd), source: "coingecko (cached)" };
  }
  throw new Error("No verifiable exchange rate is available right now");
}

/** Atomic amount for a fiat total, plus a small unique jitter. */
export function atomicAmount(usdCents: number, rateUsd: number, asset: CryptoAsset): bigint {
  const decimals = DECIMALS[asset];
  const scaled = (usdCents / 100 / rateUsd) * Math.pow(10, decimals);
  if (!Number.isFinite(scaled) || scaled <= 0) throw new Error("Invalid amount");
  const base = BigInt(Math.round(scaled));
  const jitter = BigInt(Math.floor(Math.random() * JITTER[asset]));
  return base + jitter;
}

export function formatAtomic(atomic: bigint, asset: CryptoAsset): string {
  const decimals = DECIMALS[asset];
  const s = atomic.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

/** Wallet deep-link URI for the invoice. */
export function paymentUri(asset: CryptoAsset, address: string, atomic: bigint): string {
  if (asset === "BTC") return `bitcoin:${address}?amount=${formatAtomic(atomic, "BTC")}`;
  if (asset === "ETH") return `ethereum:${address}@1?value=${atomic.toString()}`;
  return `ethereum:${USDC_CONTRACT}@1/transfer?address=${address}&uint256=${atomic.toString()}`;
}

export function explorerTx(asset: CryptoAsset, txid: string): string {
  return asset === "BTC" ? `https://mempool.space/tx/${txid}` : `https://etherscan.io/tx/${txid}`;
}

export function explorerAddress(asset: CryptoAsset, address: string): string {
  return asset === "BTC"
    ? `https://mempool.space/address/${address}`
    : `https://etherscan.io/address/${address}`;
}
