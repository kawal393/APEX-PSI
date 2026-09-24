// Shared tier definitions for the quiet metered door.
// Free commons stay free forever (100/day). Paid tiers raise the daily cap.
// Government / enterprise is NOT self-serve: it is provisioned on demand
// (unlimited, daily_limit = -1) by direct agreement, so it has no Stripe price.

export const FREE_DAILY_LIMIT = 100;

export const TIER_DAILY_LIMIT: Record<string, number> = {
  free: FREE_DAILY_LIMIT,
  builder: 2000,
  scale: 20000,
  government: -1,
};

// Tiers a signed-in user can buy themselves with no human contact.
export const SELF_SERVE_TIERS = ["builder", "scale"] as const;

// Stripe Price (subscription) env var per self-serve tier.
export const TIER_PRICE_ENV: Record<string, string> = {
  builder: "STRIPE_PRICE_BUILDER",
  scale: "STRIPE_PRICE_SCALE",
};

export const TIER_LABEL: Record<string, string> = {
  free: "Free",
  builder: "Builder",
  scale: "Scale",
  government: "Government / Enterprise",
};
