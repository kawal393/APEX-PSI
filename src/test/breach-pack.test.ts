import { describe, expect, it } from "vitest";
import { buildBreachPack, packFingerprint, parseGateAnswer } from "@/lib/breach-pack";

const refused = JSON.stringify({ ok: false, refused: true, reason: "signature_invalid", mode: "conformance",
  report: { ok: false, checks: { mandate: { status: "ok" }, decision: { status: "invalid", reason: "signature_invalid" } }, actions: [] } });

describe("breach pack", () => {
  it("a refused gate answer yields REFUSED with the gate's own reason", () => {
    const p = buildBreachPack(parseGateAnswer(refused));
    expect(p.verdict).toBe("REFUSED");
    expect(p.reason).toBe("signature_invalid");
    expect(p.failed_checks).toEqual(["decision"]);
  });
  it("rejects JSON that is not a gate answer", () => {
    expect(() => parseGateAnswer('{"hello":1}')).toThrow("not_gate_answer");
  });
  it("same answer gives the same fingerprint regardless of key order", async () => {
    const a = await packFingerprint(buildBreachPack(parseGateAnswer(refused)));
    const reordered = JSON.stringify({ report: JSON.parse(refused).report, mode: "conformance", reason: "signature_invalid", refused: true, ok: false });
    const b = await packFingerprint(buildBreachPack(parseGateAnswer(reordered)));
    expect(a.sha256).toBe(b.sha256);
  });
});
