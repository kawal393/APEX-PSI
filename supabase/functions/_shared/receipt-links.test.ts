import { describe, it, expect } from "vitest";
import { buildReceiptLinks, resolveNotaryKey, isNotaryKeyBearer } from "./receipt-links";

const headers = (h: Record<string, string>) => (n: string) => h[n.toLowerCase()] ?? null;

describe("receipt share links", () => {
  const links = buildReceiptLinks({
    receiptId: "APEX-NTR-ABC",
    merkleLeaf: "sha256:" + "a".repeat(64),
    apiBase: "https://x.supabase.co/functions/v1/",
  });

  it("points the public page at the www site by Merkle leaf", () => {
    expect(links.receipt_page_url).toBe(`https://www.ai-governance-standard.com/r/${"a".repeat(64)}`);
  });

  it("gives a verify command against the public verify-hash endpoint", () => {
    expect(links.verify_command).toBe(`curl -s "https://x.supabase.co/functions/v1/verify-hash?hash=${"a".repeat(64)}"`);
  });

  it("gives an inclusion-proof command by receipt id", () => {
    expect(links.proof_command).toBe(`curl -s "https://x.supabase.co/functions/v1/merkle-proof?receipt_id=APEX-NTR-ABC"`);
  });
});

describe("notary key resolution", () => {
  it("prefers the documented x-apex-api-key header", () => {
    expect(resolveNotaryKey(headers({ "x-apex-api-key": "apex_ntry_one", authorization: "Bearer apex_ntry_two" }))).toBe("apex_ntry_one");
  });

  it("accepts a notary key sent as a bearer token (MCP ≤1.1.2)", () => {
    expect(resolveNotaryKey(headers({ authorization: "Bearer apex_ntry_abc123" }))).toBe("apex_ntry_abc123");
    expect(isNotaryKeyBearer(headers({ authorization: "Bearer apex_ntry_abc123" }))).toBe(true);
  });

  it("treats any other bearer value as a sign-in token, not a key", () => {
    expect(resolveNotaryKey(headers({ authorization: "Bearer eyJhbGciOi.x.y" }))).toBeNull();
    expect(isNotaryKeyBearer(headers({ authorization: "Bearer eyJhbGciOi.x.y" }))).toBe(false);
  });
});
