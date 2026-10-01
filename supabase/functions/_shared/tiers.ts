// Shared tier definitions for the APEX-hosted service.
// The commons stay free forever: offline verification, local proof creation and
// self-hosting are never metered. These limits apply only to APEX-operated
// hosted issuance. Public (keyless) use is 20/minute and 100/day.
// Pro and Ultra are self-serve. Institutional is provisioned by direct
// agreement (unlimited, daily_limit = -1) and has no public price.
//
// The same ladder is mirrored on external marketplaces (RapidAPI, AWS), so a
// buyer can purchase the identical product through whichever channel they use.

export const FREE_DAILY_LIMIT = 100;

export const TIER_DAILY_LIMIT: Record<string, number> = {
  free: FREE_DAILY_LIMIT,
  pro: 2000,
  ultra: 20000,
  institutional: -1,
  // Legacy identifiers kept so existing keys/subscriptions keep working.
  builder: 2000,
  scale: 20000,
  government: -1,
};

// Tiers a signed-in user can buy themselves with no human contact.
export const SELF_SERVE_TIERS = ["pro", "ultra"] as const;

// Stripe recurring Price for each self-serve tier (APEX Stripe account).
export const TIER_PRICE_ID: Record<string, string> = {
  pro: "price_1ULXon1dcr4wA5Txw8CHbAXf",
  ultra: "price_1ULXpN1dcr4wA5TxSIq8htAN",
};

export const TIER_LABEL: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  ultra: "Ultra",
  institutional: "Institutional",
  builder: "Pro",
  scale: "Ultra",
  government: "Institutional",
};
