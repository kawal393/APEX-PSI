import { describe, expect, it, vi, beforeEach } from "vitest";

// Stub the wasm-backed C2PA reader: unit tests run in jsdom without a worker pool.
vi.mock("c2pa", () => ({
  createC2pa: vi.fn(),
}));

import { createC2pa } from "c2pa";
import { runVerifyAny, resetC2paCache } from "./verify-any";

// jsdom's File lacks arrayBuffer(); give it one so the real readers run.
if (typeof File.prototype.arrayBuffer !== "function") {
  Object.defineProperty(File.prototype, "arrayBuffer", {
    value: function (this: File) {
      return new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(this);
      });
    },
    writable: true,
  });
}

const textFile = () =>
  new File([new Uint8Array([1, 2, 3, 4, 5])], "sample.txt", {
    type: "text/plain",
  });

describe("runVerifyAny", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetC2paCache();
  });

  it("reports every reader as absent for an unmarked file", async () => {
    vi.mocked(createC2pa).mockResolvedValue({
      read: async () => ({ manifestStore: null }),
    } as never);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ verified: false }), { status: 200 }),
      ) as unknown as typeof fetch,
    );

    const report = await runVerifyAny(textFile());

    expect(report.sha256).toMatch(/^[0-9a-f]{64}$/);
    // No watermark row for a non-image file: c2pa + psi-inband + ledger.
    expect(report.rows.map((r) => r.id)).toEqual(["c2pa", "psi-inband", "ledger"]);
    expect(report.rows.every((r) => r.status === "absent")).toBe(true);
    expect(report.rows.every((r) => r.proves && r.cannotProve)).toBe(true);
  });

  it("reports verified rows when marks are found", async () => {
    vi.mocked(createC2pa).mockResolvedValue({
      read: async () => ({
        manifestStore: {
          activeManifest: {
            title: "test.jpg",
            claimGenerator: "test-app/1.0",
          },
          validationStatus: [],
        },
      }),
    } as never);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            verified: true,
            predicate_id: "TEST-1",
            phase: "II",
            commit_id: "abcdef1",
          }),
          { status: 200 },
        ),
      ) as unknown as typeof fetch,
    );

    const report = await runVerifyAny(textFile());
    const byId = Object.fromEntries(report.rows.map((r) => [r.id, r]));

    expect(byId["c2pa"].status).toBe("verified");
    expect(byId["c2pa"].detail).toContain("test-app/1.0");
    expect(byId["ledger"].status).toBe("verified");
    expect(byId["ledger"].detail).toContain("TEST-1");
    // PSI in-band: a random 5-byte file carries no APEXPSI manifest.
    expect(byId["psi-inband"].status).toBe("absent");
  });

  it("survives a broken C2PA reader and a broken ledger probe", async () => {
    vi.mocked(createC2pa).mockRejectedValue(new Error("wasm exploded"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }) as unknown as typeof fetch,
    );

    const report = await runVerifyAny(textFile());
    const byId = Object.fromEntries(report.rows.map((r) => [r.id, r]));

    expect(byId["c2pa"].status).toBe("error");
    expect(byId["ledger"].status).toBe("error");
    expect(report.rows).toHaveLength(3);
  });
});
