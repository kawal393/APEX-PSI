import { describe, expect, it } from "vitest";
import { allowanceHeaders, buildAllowance, secondsUntilUtcMidnight, upgradePlans } from "./allowance.ts";

const NOW = new Date("2026-11-09T09:00:00.000Z");

describe("hosted allowance meter", () => {
  it("free tier reports used and remaining against the 100/day public allowance", () => {
    const a = buildAllowance({ tier: "free", used: 14, dailyLimit: 100, now: NOW });
    expect(a.used_today).toBe(14);
    expect(a.daily_limit).toBe(100);
    expect(a.remaining_today).toBe(86);
    expect(a.upgrade_url).toBe("https://ai-governance-standard.com/upgrade");
  });

  it("free tier offers Pro at 2,000/day and Ultra at 20,000/day", () => {
    const a = buildAllowance({ tier: "free", used: 1, dailyLimit: 100, now: NOW });
    expect(a.plans?.map((p) => [p.tier, p.daily_limit])).toEqual([["pro", 2000], ["ultra", 20000]]);
    expect(upgradePlans().every((p) => p.checkout_url.startsWith("https://buy.stripe.com/"))).toBe(true);
  });

  it("remaining never goes below zero", () => {
    expect(buildAllowance({ tier: "free", used: 140, dailyLimit: 100, now: NOW }).remaining_today).toBe(0);
  });

  it("paid tiers carry no plan list and no nudge while capacity is ample", () => {
    const a = buildAllowance({ tier: "pro", used: 10, dailyLimit: 2000, now: NOW });
    expect(a.plans).toBeUndefined();
    expect(a.next_step).toBeNull();
    expect(a.remaining_today).toBe(1990);
  });

  it("unlimited institutional keys report no limit and send no rate headers", () => {
    const a = buildAllowance({ tier: "institutional", used: 5000, dailyLimit: -1, now: NOW });
    expect(a.daily_limit).toBeNull();
    expect(a.remaining_today).toBeNull();
    expect(allowanceHeaders(a)).toEqual({});
  });

  it("daily counters reset at the next UTC midnight", () => {
    expect(secondsUntilUtcMidnight(NOW)).toBe(15 * 3600);
    expect(buildAllowance({ tier: "free", used: 0, dailyLimit: 100, now: NOW }).resets_at).toBe("2026-11-10T00:00:00.000Z");
  });

  it("rate headers mirror the body", () => {
    const a = buildAllowance({ tier: "free", used: 99, dailyLimit: 100, now: NOW });
    expect(allowanceHeaders(a)).toEqual({ "X-RateLimit-Limit": "100", "X-RateLimit-Remaining": "1" });
  });
});
