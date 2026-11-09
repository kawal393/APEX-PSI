// Hosted allowance meter for the seal endpoints.
//
// Every hosted receipt tells the caller how much of today's hosted allowance
// is left and where to raise it. This file has no Deno-only API so the website's
// vitest suite covers it. It only describes capacity: verification and local
// sealing are never metered, and a paid plan never changes a verification result.

import { TIER_DAILY_LIMIT, TIER_LABEL } from "./tiers.ts";

export const DEFAULT_SITE = "https://ai-governance-standard.com";

/** Direct card checkout links (same products as the signed-in flow). */
export const PLAN_CHECKOUT: Record<"pro" | "ultra", string> = {
  pro: "https://buy.stripe.com/cNidR10VP26seQEbswb7y0d",
  ultra: "https://buy.stripe.com/4gM28jbAteTe5g4fIMb7y0c",
};

export type UpgradePlan = {
  tier: "pro" | "ultra";
  name: string;
  daily_limit: number;
  checkout_url: string;
};

export function upgradePlans(): UpgradePlan[] {
  return (["pro", "ultra"] as const).map((tier) => ({
    tier,
    name: TIER_LABEL[tier],
    daily_limit: TIER_DAILY_LIMIT[tier],
    checkout_url: PLAN_CHECKOUT[tier],
  }));
}

/** Seconds until the next UTC midnight, when daily counters reset. */
export function secondsUntilUtcMidnight(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

export type Allowance = {
  tier: string;
  used_today: number;
  daily_limit: number | null;
  remaining_today: number | null;
  resets_at: string;
  upgrade_url: string;
  next_step: string | null;
  plans?: UpgradePlan[];
};

/**
 * Build the allowance block returned with a successful hosted receipt.
 * `dailyLimit` of -1 means unlimited (Institutional agreements).
 */
export function buildAllowance(opts: {
  tier: string;
  used: number;
  dailyLimit: number;
  now: Date;
  site?: string;
}): Allowance {
  const site = opts.site || DEFAULT_SITE;
  const unlimited = opts.dailyLimit === -1;
  const used = Math.max(0, Math.floor(opts.used));
  const remaining = unlimited ? null : Math.max(0, opts.dailyLimit - used);
  const resetsAt = new Date(opts.now.getTime() + secondsUntilUtcMidnight(opts.now) * 1000).toISOString();
  const isFree = opts.tier === "free";
  const nextStep = isFree
    ? `Free public allowance: ${used} of ${opts.dailyLimit} hosted receipts used today. Moving to production? Pro raises hosted capacity to ${TIER_DAILY_LIMIT.pro.toLocaleString("en-US")}/day and Ultra to ${TIER_DAILY_LIMIT.ultra.toLocaleString("en-US")}/day — send your key as the x-apex-api-key header. Verification stays free.`
    : !unlimited && remaining !== null && remaining <= Math.ceil(opts.dailyLimit * 0.1)
      ? `${remaining} hosted receipts left today on your plan. Raise capacity at ${site}/upgrade.`
      : null;
  return {
    tier: opts.tier,
    used_today: used,
    daily_limit: unlimited ? null : opts.dailyLimit,
    remaining_today: remaining,
    resets_at: resetsAt,
    upgrade_url: `${site}/upgrade`,
    next_step: nextStep,
    ...(isFree ? { plans: upgradePlans() } : {}),
  };
}

/** Rate headers mirroring the allowance block, for clients that read headers. */
export function allowanceHeaders(a: Allowance): Record<string, string> {
  if (a.daily_limit === null) return {};
  return {
    "X-RateLimit-Limit": String(a.daily_limit),
    "X-RateLimit-Remaining": String(a.remaining_today ?? 0),
  };
}
