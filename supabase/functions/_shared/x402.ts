// x402 v2 machine-payable door, `exact` scheme only.
//
// Wire format taken from the protocol specification (specs/x402-specification-v2.md,
// specs/transports-v2/http.md, specs/schemes/exact/scheme_exact_evm.md):
//   402 + base64 `PAYMENT-REQUIRED`  ->  client signs  ->  base64 `PAYMENT-SIGNATURE`
//   -> facilitator POST /verify (read-only) -> resource executes -> POST /settle
//   -> base64 `PAYMENT-RESPONSE`.
// Networks are CAIP-2 (`eip155:8453` Base mainnet, `eip155:84532` Base Sepolia).
//
// Why `exact` and nothing else: the CSA research note of 25 October 2026 found the
// x402 agent-payment SDKs shipped with no default spending limit and patched the
// flaw silently, so `npm audit` cannot see it. `upto` authorises a ceiling and then
// charges whatever the server asks for; `exact` makes the payer sign one number, and
// this module refuses any payload whose signed number is not precisely our price.
//
// Every check here is local and cheap. The facilitator is only contacted once the
// payload already satisfies all of them, so a flood of bad payloads costs us no
// facilitator calls and no ledger rows.
//
// Reason codes: the ones spelled `invalid_*`, `unsupported_scheme`,
// `insufficient_funds` and `settlement_pending` are the protocol's own codes.
// Anything prefixed `apex_` is ours and is not part of the protocol.

export const X402_VERSION = 2;
export const SUPPORTED_SCHEME = "exact";
export const MAX_AUTHORIZATION_WINDOW_SECONDS = 300;

export type X402Config = {
  facilitatorUrl: string;
  network: string;
  asset: string;
  payTo: string;
  amountAtomic: string;
  assetName: string;
  assetVersion: string;
  maxTimeoutSeconds: number;
};

export type PaymentAuthorization = {
  from?: string;
  to?: string;
  value?: string;
  validAfter?: string;
  validBefore?: string;
  nonce?: string;
};

export type PaymentPayload = {
  x402Version?: number;
  resource?: { url?: string };
  accepted?: Record<string, unknown>;
  payload?: { signature?: string; authorization?: PaymentAuthorization };
};

export type ConfigResult = { ok: true; config: X402Config } | { ok: false; missing: string[] };

export type CheckResult =
  | { ok: true; payer: string; nonceKey: string; paymentDigest: string; requirements: Requirements }
  | { ok: false; status: 400 | 402; reason: string; detail?: string };

export type Requirements = {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: Record<string, string>;
};

function normaliseHex(value: string): string {
  return value.toLowerCase();
}

function encodeUtf8Json(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return bytesToBase64(bytes);
}

const B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64_ALPHABET[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    out += i + 2 < bytes.length ? B64_ALPHABET[b2 & 63] : "=";
  }
  return out;
}

export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/-/g, "+").replace(/_/g, "/").replace(/[^A-Za-z0-9+/]/g, "");
  const bytes = new Uint8Array(Math.floor(clean.length * 3 / 4));
  let pointer = 0;
  const group = (i: number) =>
    (B64_ALPHABET.indexOf(clean[i]) << 18)
      | (B64_ALPHABET.indexOf(clean[i + 1]) << 12)
      | (B64_ALPHABET.indexOf(clean[i + 2]) << 6)
      | B64_ALPHABET.indexOf(clean[i + 3]);
  for (let i = 0; i + 4 <= clean.length; i += 4) {
    const n = group(i);
    bytes[pointer++] = (n >> 16) & 255;
    bytes[pointer++] = (n >> 8) & 255;
    bytes[pointer++] = n & 255;
  }
  const remainder = clean.length % 4;
  if (remainder === 2 || remainder === 3) {
    const i = clean.length - remainder;
    const n = (B64_ALPHABET.indexOf(clean[i]) << 18)
      | (B64_ALPHABET.indexOf(clean[i + 1]) << 12)
      | (remainder === 3 ? B64_ALPHABET.indexOf(clean[i + 2]) << 6 : 0);
    bytes[pointer++] = (n >> 16) & 255;
    if (remainder === 3) bytes[pointer++] = (n >> 8) & 255;
  }
  return bytes.subarray(0, pointer);
}

export function decodePaymentHeader(header: string): PaymentPayload | null {
  try {
    const text = new TextDecoder().decode(base64ToBytes(header.trim()));
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed as PaymentPayload : null;
  } catch {
    return null;
  }
}

// Reads the door from an environment-like getter so the same code path runs under
// Deno in production and under a plain Map in the self-test.
export function readX402Config(get: (name: string) => string | undefined): ConfigResult {
  const required = ["X402_PAY_TO", "X402_ASSET", "X402_FACILITATOR_URL"];
  const missing = required.filter((name) => !(get(name) || "").trim());
  if (missing.length > 0) return { ok: false, missing };
  const amountAtomic = (get("X402_AMOUNT_ATOMIC") || "").trim();
  if (!/^[1-9][0-9]{0,17}$/.test(amountAtomic)) {
    return { ok: false, missing: ["X402_AMOUNT_ATOMIC"] };
  }
  return {
    ok: true,
    config: {
      facilitatorUrl: (get("X402_FACILITATOR_URL") || "").replace(/\/+$/, ""),
      network: (get("X402_NETWORK") || "eip155:84532").trim(),
      asset: (get("X402_ASSET") || "").trim(),
      payTo: (get("X402_PAY_TO") || "").trim(),
      amountAtomic,
      assetName: (get("X402_ASSET_NAME") || "USDC").trim(),
      assetVersion: (get("X402_ASSET_VERSION") || "2").trim(),
      maxTimeoutSeconds: Number(get("X402_MAX_TIMEOUT_SECONDS") || 60),
    },
  };
}

export function paymentRequirements(config: X402Config): Requirements {
  return {
    scheme: SUPPORTED_SCHEME,
    network: config.network,
    amount: config.amountAtomic,
    asset: config.asset,
    payTo: config.payTo,
    maxTimeoutSeconds: config.maxTimeoutSeconds,
    extra: { name: config.assetName, version: config.assetVersion },
  };
}

export function buildPaymentRequired(config: X402Config, resourceUrl: string, description: string, error: string) {
  return {
    x402Version: X402_VERSION,
    error,
    resource: { url: resourceUrl, description, mimeType: "application/json" },
    accepts: [paymentRequirements(config)],
    extensions: {},
  };
}

export function encodePaymentRequiredHeader(config: X402Config, resourceUrl: string, description: string, error: string): string {
  return encodeUtf8Json(buildPaymentRequired(config, resourceUrl, description, error));
}

export function encodeSettlementHeader(value: unknown): string {
  return encodeUtf8Json(value);
}

// The replay key. One signed authorization is usable once, and we claim it before
// the work runs so a second delivery of the same bytes cannot buy a second receipt.
export function paymentNonceKey(config: X402Config, authorization: PaymentAuthorization): string {
  return [config.network, (authorization.from || "").toLowerCase(), (authorization.nonce || "").toLowerCase()].join(":");
}

const CANONICAL_PAYMENT_FIELDS = ["x402Version", "network", "from", "nonce", "value", "validAfter", "validBefore", "to", "asset"] as const;

export async function paymentDigest(config: X402Config, payload: PaymentPayload): Promise<string> {
  const authorization = payload.payload?.authorization || {};
  const tuple = [
    X402_VERSION,
    config.network,
    (authorization.from || "").toLowerCase(),
    (authorization.nonce || "").toLowerCase(),
    authorization.value || "",
    authorization.validAfter || "",
    authorization.validBefore || "",
    (authorization.to || "").toLowerCase(),
    config.asset.toLowerCase(),
  ];
  const bytes = new TextEncoder().encode(CANONICAL_PAYMENT_FIELDS.map((k, i) => `${k}=${tuple[i]}`).join("|"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function refuse(status: 400 | 402, reason: string, detail?: string): CheckResult {
  return { ok: false, status, reason, detail };
}

// Every local check that must hold before we spend a facilitator call. The rule is
// that the server never trusts a price the caller brought: our configuration is the
// only source of amount, asset, network and recipient.
export async function checkPaymentPayload(
  config: X402Config,
  payload: PaymentPayload | null,
  nowSeconds: number,
): Promise<CheckResult> {
  if (!payload) return refuse(400, "invalid_payload", "the PAYMENT-SIGNATURE header is not base64 JSON");
  if (payload.x402Version !== X402_VERSION) {
    return refuse(400, "invalid_x402_version", `this door speaks x402 version ${X402_VERSION}`);
  }
  const accepted = (payload.accepted || {}) as Record<string, unknown>;
  const scheme = String(accepted.scheme ?? "");
  const network = String(accepted.network ?? "");
  const asset = String(accepted.asset ?? "");
  const payTo = String(accepted.payTo ?? "");
  const amount = String(accepted.amount ?? "");
  const timeout = Number(accepted.maxTimeoutSeconds);
  if (scheme !== SUPPORTED_SCHEME) {
    return refuse(402, "unsupported_scheme", "only the exact scheme is accepted");
  }
  if (network !== config.network) return refuse(402, "invalid_network");
  if (normaliseHex(asset) !== normaliseHex(config.asset)) {
    return refuse(402, "invalid_payment_requirements", "asset is not the one we sell against");
  }
  if (normaliseHex(payTo) !== normaliseHex(config.payTo)) {
    return refuse(402, "invalid_payment_requirements", "payTo is not our receive address");
  }
  if (amount !== config.amountAtomic) {
    return refuse(402, "apex_amount_not_listed_price", `the listed price is ${config.amountAtomic} atomic units`);
  }
  if (!(timeout > 0) || timeout > config.maxTimeoutSeconds) {
    return refuse(402, "invalid_payment_requirements", "maxTimeoutSeconds missing or above ours");
  }

  const authorization = payload.payload?.authorization;
  const signature = payload.payload?.signature;
  if (!authorization) return refuse(400, "invalid_payload", "payload.authorization is required for exact/eip3009");
  if (!/^0x[0-9a-fA-F]{130}$/.test(signature || "")) return refuse(400, "invalid_exact_evm_payload_signature");
  if (!/^0x[0-9a-fA-F]{64}$/.test(authorization.nonce || "")) return refuse(400, "invalid_payload", "nonce must be 32 bytes");
  if (normaliseHex(String(authorization.to || "")) !== normaliseHex(config.payTo)) {
    return refuse(402, "invalid_exact_evm_payload_recipient_mismatch");
  }
  if (String(authorization.value) !== config.amountAtomic) {
    return refuse(402, "invalid_exact_evm_payload_authorization_value_mismatch");
  }

  const validAfter = Number(authorization.validAfter);
  const validBefore = Number(authorization.validBefore);
  if (!Number.isFinite(validAfter) || !Number.isFinite(validBefore)) {
    return refuse(400, "invalid_payload", "authorization window must be unix seconds");
  }
  const window = validBefore - validAfter;
  if (window <= 0 || window > MAX_AUTHORIZATION_WINDOW_SECONDS) {
    // An open-ended authorization is an uncapped spending instruction wearing the
    // exact scheme's clothes. The signed window must be short and it must be live.
    return refuse(402, "apex_authorization_window_unacceptable", `window must be 1-${MAX_AUTHORIZATION_WINDOW_SECONDS} seconds`);
  }
  if (validAfter > nowSeconds + 10) return refuse(402, "invalid_exact_evm_payload_authorization_valid_after");
  if (validBefore <= nowSeconds - 10) return refuse(402, "invalid_exact_evm_payload_authorization_valid_before");

  const nonceKey = paymentNonceKey(config, authorization);
  const requirements = paymentRequirements(config);
  return {
    ok: true,
    payer: String(authorization.from || ""),
    nonceKey,
    paymentDigest: await paymentDigest(config, payload),
    requirements,
  };
}

export type FacilitatorResult = {
  isValid?: boolean;
  invalidReason?: string;
  payer?: string;
  success?: boolean;
  errorReason?: string;
  transaction?: string;
  network?: string;
};

export async function callFacilitator(
  config: X402Config,
  path: "/verify" | "/settle",
  payload: PaymentPayload,
  requirements: Requirements,
  fetchImpl: typeof fetch,
): Promise<{ ok: boolean; result: FacilitatorResult; httpStatus: number }> {
  const response = await fetchImpl(config.facilitatorUrl + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x402Version: X402_VERSION, paymentPayload: payload, paymentRequirements: requirements }),
  });
  let result: FacilitatorResult = {};
  try {
    result = (await response.json()) as FacilitatorResult;
  } catch {
    result = {};
  }
  const ok = response.status === 200 && path === "/verify"
    ? result.isValid === true
    : response.status === 200 && result.success === true;
  return { ok, result, httpStatus: response.status };
}

export function settlementHeader(result: FacilitatorResult, config: X402Config, failed: boolean): string {
  return encodeSettlementHeader({
    success: !failed && result.success === true,
    ...(failed || result.errorReason ? { errorReason: result.errorReason || "unexpected_settle_error" } : {}),
    transaction: result.transaction || "",
    network: result.network || config.network,
    ...(result.payer || result.isValid ? { payer: result.payer } : {}),
  });
}
