// Integration tests for the PSI Protocol cryptographic pipeline
// Tests: commit -> challenge -> prove -> verify flow
//
// 18 Oct 2026 - these calls are NOT hermetic: `commit-action` writes a real row
// to the production ledger and gets it signed by the live key. Running them on
// every CI push meant test noise was being sealed into the public audit trail,
// and any network hiccup turned the `test` job red - which, because
// `supabase-deploy` needs [lint, typecheck, test], silently blocked deploys.
// They now run only when someone asks for them:  APEX_LIVE=1 npm run test
// The pure-crypto assertions at the bottom stay always-on.
//
// The publishable/anon key is read from the environment. It is no longer
// hard-coded here: a literal token in a public repository is an invitation for
// someone to mint ledger rows under our name, and `git grep` finds it forever.

import { describe, it, expect } from "vitest";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://qhtntebpcribjiwrdtdd.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const RUNS_LIVE = process.env.APEX_LIVE === "1" && SUPABASE_ANON_KEY.length > 0;
const live = RUNS_LIVE ? describe : describe.skip;

const PSI_PUBLIC_KEY = "59304685328b3cfa6ec712d66250d0f964bb9f92161e65e2e5835a873f104724";

async function callEdgeFunction(name: string, body?: object) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

// A live run must never write an unlabeled row: every action string below is
// prefixed so the ledger shows, inside the sealed record itself, that this is
// test data and not a claim about a real file.
const LIVE_TEST_PREFIX = "[INTEGRATION TEST - not a production record] ";

live("PSI Protocol Pipeline (live ledger)", () => {
  it("commit-action should accept valid commits and return hashes", async () => {
    const { status, data } = await callEdgeFunction("commit-action", {
      action: LIVE_TEST_PREFIX + "Integration test: Article 12 Record-Keeping compliance verified",
      predicate_id: "EU-AI-ACT-ART-12",
    });

    expect(status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.commit_id).toMatch(/^APEX-[A-F0-9]{8}-[A-F0-9]{4}$/);
    expect(data.commit_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(data.merkle_leaf_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(data.hash_verified_server_side).toBe(true);
    // Signature may use Ed25519 or HMAC fallback depending on runtime
    expect(data.ed25519_signature).toBeTruthy();
  });

  it("commit-action should reject empty action", async () => {
    const { status } = await callEdgeFunction("commit-action", {
      action: "",
      predicate_id: "EU-AI-ACT-ART-12",
    });
    expect(status).toBe(400);
  });

  it("commit-action should reject missing predicate_id", async () => {
    const { status } = await callEdgeFunction("commit-action", {
      action: LIVE_TEST_PREFIX + "Test action",
    });
    expect(status).toBe(400);
  });

  it("verify-hash should check hashes against the ledger", async () => {
    // First commit something
    const { data: commitData } = await callEdgeFunction("commit-action", {
      action: LIVE_TEST_PREFIX + "Verify-hash integration test",
      predicate_id: "EU-AI-ACT-ART-15",
    });

    // Then verify it
    const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-hash`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ hash: commitData.commit_hash }),
    });

    const verifyData = await res.json();
    expect(res.status).toBe(200);
    expect(verifyData.found).toBe(true);
  });

  it("verify-status should respond to registry action", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-status?action=stats`, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("total_entities");
  });
});

describe("PSI Cryptographic Primitives", () => {
  it("published verification key is 32 raw bytes, hex encoded", () => {
    expect(PSI_PUBLIC_KEY).toMatch(/^[0-9a-f]{64}$/);
    expect(PSI_PUBLIC_KEY).not.toBe("PENDING_DEPLOYMENT");
  });

  it("SHA-256 should produce deterministic 64-char hex hashes", async () => {
    const data = new TextEncoder().encode("APEX-PSI-TEST");
    const hash = await crypto.subtle.digest("SHA-256", data);
    const hex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");

    expect(hex).toHaveLength(64);

    // Same input should produce same output (deterministic)
    const hash2 = await crypto.subtle.digest("SHA-256", data);
    const hex2 = Array.from(new Uint8Array(hash2)).map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(hex).toBe(hex2);
  });

  it("PSI_PUBLIC_KEY should be a real deployed key", () => {
    expect(PSI_PUBLIC_KEY).not.toBe("PENDING_DEPLOYMENT");
    expect(PSI_PUBLIC_KEY).toHaveLength(64);
    // Should not be all zeros
    expect(PSI_PUBLIC_KEY).not.toMatch(/^0+$/);
  });
});
