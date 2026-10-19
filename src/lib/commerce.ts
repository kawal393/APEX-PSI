// APEX PSI — access model and hosted product ladder.
//
// The commons are free forever: the specification, independent verification,
// local proof creation and self-hosting are never metered.
// The APEX-hosted service has a free public allowance (20 receipts per minute,
// 100 per day) and two self-serve paid tiers, plus Institutional by agreement.
//
// The identical ladder is offered on every channel — direct card checkout on
// this site and the same products on external marketplaces — so a buyer can
// purchase wherever they already have billing.
//
// Doctrine: money buys process, never outcome. A higher tier changes no finding.

/** Plain statement rendered wherever a price or plan appears. */
export const FREE_ACCESS_STATEMENT =
  "Independent verification is free forever. The public hosted service includes up to 20 receipts per minute and 100 per day without an account; Pro and Ultra raise hosted capacity. A higher tier buys capacity, never a finding.";

export const HOSTED_FREE_LIMIT = 100;
export const HOSTED_RATE_LIMIT = 20;

/** Public listing of the same product on the RapidAPI marketplace. */
export const RAPIDAPI_URL = "https://rapidapi.com/apex-psi-apex-psi-default/api/apex-psi/pricing";

/** Direct contact used for Institutional agreements. */
export const SALES_EMAIL = "business@apex-infrastructure.com";

export const salesMailto = (tier: string) =>
  `mailto:${SALES_EMAIL}?subject=APEX%20PSI%20${encodeURIComponent(tier)}`;

export type HostedTier = {
  /** Internal tier id used by the hosted service. */
  id: "free" | "pro" | "ultra" | "institutional";
  name: string;
  price: string;
  cadence: string;
  audience: string;
  capacity: string;
  access: string;
  /** True when the user can buy it themselves by card. */
  selfServe: boolean;
};

export const HOSTED_TIERS: HostedTier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    audience: "Individuals, evaluators and small integrations",
    capacity: "20 receipts / minute · 100 / day",
    access: "No account or API key required",
    selfServe: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$11",
    cadence: "per month",
    audience: "Applications moving beyond the public allowance",
    capacity: "Up to 2,000 hosted receipts / day",
    access: "Managed API key",
    selfServe: true,
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "$55",
    cadence: "per month",
    audience: "Production services with sustained volume",
    capacity: "Up to 20,000 hosted receipts / day",
    access: "Managed API key",
    selfServe: true,
  },
  {
    id: "institutional",
    name: "Institutional",
    price: "Custom",
    cadence: "by agreement",
    audience: "Regulated operators requiring service commitments",
    capacity: "Custom volume and operating terms",
    access: "Direct agreement",
    selfServe: false,
  },
];

/** Name of the one-off receipt artefact, kept for display and reference only. */
export const TRANSPARENCY_RECEIPT_LABEL = "Article 50 Transparency Receipt";

/**
 * Card checkout that needs no account and no human.
 *
 * These are Stripe-hosted payment links on the APEX PSI store, wrapping the
 * same recurring prices the site sells through the signed-in flow
 * (supabase/functions/_shared/tiers.ts). Two doors, one product: a visitor can
 * pay here with no sign-in, or subscribe on /upgrade and get a managed key in
 * the same session.
 *
 * Provisioning after a direct payment is by email: /upgrade calls
 * sync-subscription, which looks the Stripe customer up by the signed-in
 * user's email and maps the price id back to the tier. So the buyer must
 * create the account with the same address they paid with — the copy says so.
 */
export type DirectCheckout = {
  tier: "pro" | "ultra";
  name: string;
  price: string;
  cadence: string;
  url: string;
};

export const DIRECT_CHECKOUT: DirectCheckout[] = [
  {
    tier: "pro",
    name: "Pro",
    price: "$11",
    cadence: "per month",
    url: "https://buy.stripe.com/cNidR10VP26seQEbswb7y0d",
  },
  {
    tier: "ultra",
    name: "Ultra",
    price: "$55",
    cadence: "per month",
    url: "https://buy.stripe.com/4gM28jbAteTe5g4fIMb7y0c",
  },
];

/** Where a direct-payer goes to turn a receipt into a working key. */
export const POST_PAYMENT_PATH = "/upgrade";
