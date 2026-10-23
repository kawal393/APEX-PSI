import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function freshModule(country: string | null) {
  vi.resetModules();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      country === null
        ? new Response("", { status: 404 })
        : new Response(`fl=1\nloc=${country}\n`, { status: 200 }),
    ),
  );
  return import("@/lib/ads-consent");
}

describe("Google Ads consent gate", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("blocks ad tracking for UK visitors who have not chosen", async () => {
    const m = await freshModule("GB");
    expect(await m.canTrackAds()).toBe(false);
  });

  it("blocks ad tracking for Irish visitors who have not chosen", async () => {
    const m = await freshModule("IE");
    expect(await m.canTrackAds()).toBe(false);
  });

  it("allows ad tracking for US visitors who have not chosen", async () => {
    const m = await freshModule("US");
    expect(await m.canTrackAds()).toBe(true);
  });

  it("blocks when the visitor's region cannot be determined", async () => {
    const m = await freshModule(null);
    expect(await m.canTrackAds()).toBe(false);
  });

  it("allows a UK visitor after they accept", async () => {
    const m = await freshModule("GB");
    m.saveChoice("granted");
    expect(await m.canTrackAds()).toBe(true);
  });

  it("keeps a US visitor's refusal", async () => {
    const m = await freshModule("US");
    m.saveChoice("denied");
    expect(await m.canTrackAds()).toBe(false);
  });

  it("keeps earlier acceptance evidence after a withdrawal", async () => {
    const m = await freshModule("GB");
    m.saveChoice("granted");
    m.saveChoice("denied");
    const history = JSON.parse(localStorage.getItem(m.RECORD_KEY) || "[]");
    expect(history.map((h: { choice: string }) => h.choice)).toEqual(["granted", "denied"]);
  });
});
