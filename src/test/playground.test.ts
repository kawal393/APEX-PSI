import { describe, it, expect } from "vitest";
import { sealInBrowser, verifyPlaygroundSeal, buildIncidentBundle } from "@/lib/playground";
import { verifyIncidentBundle } from "../../packages/psi-verifier/src/incident";

describe("playground sealing", () => {
  it("genuine seal verifies", async () => {
    const s = await sealInBrowser("pay 500");
    expect(await verifyPlaygroundSeal(s, "pay 500")).toBe(true);
  });
  it("one-character change fails", async () => {
    const s = await sealInBrowser("pay 500");
    expect(await verifyPlaygroundSeal(s, "pay 500 ")).toBe(false);
  });
  it("swapped signature fails", async () => {
    const s = await sealInBrowser("a"), t = await sealInBrowser("a");
    expect(await verifyPlaygroundSeal({ ...s, signature: t.signature }, "a")).toBe(false);
  });
  it("browser-built incident bundle passes the shared verifier", async () => {
    const b = await buildIncidentBundle([["a", "1"], ["b", "2"]]);
    expect((await verifyIncidentBundle(b)).valid).toBe(true);
    (b.entries[0] as Record<string, unknown>).kind = "x";
    expect((await verifyIncidentBundle(b)).valid).toBe(false);
  });
});
