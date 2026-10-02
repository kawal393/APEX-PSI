import { describe, it, expect } from "vitest";
import { createMandate, checkIntent, checkSettlement, canonicalize } from "../../packages/psi-sdk/src/constellation";

describe("APEX-INTENT / APEX-SETTLE", () => {
  it("canonicalizes key order deterministically", () => {
    expect(canonicalize({ b: 1, a: [true, null] })).toBe('{"a":[true,null],"b":1}');
  });
  it("mandate hash is stable and refuses by default", async () => {
    const base = { issuer: "org", agent: "a1", allowed_actions: ["pay"], max_amount: 10, expires_at: "2999-01-01T00:00:00Z" };
    const a = await createMandate(base);
    const b = await createMandate({ ...base });
    expect(a.mandate_hash).toBe(b.mandate_hash);
    expect(checkIntent(a.mandate, "pay", 5)).toEqual({ allowed: true });
    expect(checkIntent(a.mandate, "delete")).toMatchObject({ allowed: false, reason: "ACTION_NOT_IN_MANDATE" });
    expect(checkIntent(a.mandate, "pay", 11)).toMatchObject({ allowed: false });
    expect(checkIntent({ ...a.mandate, expires_at: "2000-01-01T00:00:00Z" }, "pay")).toMatchObject({ reason: "EXPIRED" });
  });
  it("settlement releases only on matching digest", async () => {
    const p = { id: 1 };
    const ok = await checkSettlement(p, (await checkSettlement(p, "x")).digest);
    expect(ok.release).toBe(true);
    expect((await checkSettlement({ id: 2 }, ok.digest)).release).toBe(false);
  });
});
