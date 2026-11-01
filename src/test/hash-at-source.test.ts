import { describe, it, expect, vi, afterEach } from "vitest";
import { buildPSIReceiptHeader } from "../../packages/psi-vercel-ai/src/index";

// Rule: developer add-ons send only a SHA-256 fingerprint to the hosted notary,
// never the raw model output or the prompt.
afterEach(() => vi.unstubAllGlobals());

describe("hash at source", () => {
  it("sends only a fingerprint, never the text or prompt", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const secret = "Confidential client contract clause 7";
    await buildPSIReceiptHeader({ text: secret, prompt: "private prompt", predicates: ["EU_ART_12"] } as never);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.decision).toMatch(/^sha256:[0-9a-f]{64}$/);
    const sent = JSON.stringify(body);
    expect(sent).not.toContain("Confidential");
    expect(sent).not.toContain("private prompt");
  });
});
