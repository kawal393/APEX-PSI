// agent-checkout — the agent door. The receiver gate is consulted first, the
// door's own money rules second, and a Stripe session is created only if both
// permit the exact action.
//
// The human door (create-checkout) is untouched: a person's signed-in session
// is that permission. This door exists for agents, which must carry a signed
// mandate, a signed proposal and a signed decision.
// Agents call server-to-server; Stripe must return buyers to the website, never the functions host.
const SITE_URL = "https://www.ai-governance-standard.com";
import { createPublicKey, createHash, type KeyObject } from "node:crypto";
import { Buffer } from "node:buffer";
import { createReceiverGate, type ReceiverGate } from "../_shared/psi-agent/receiver.ts";
import { evaluatePayment, PAYMENT_TOOL } from "../_shared/psi-agent/payment.ts";
import type { Mandate } from "../_shared/psi-agent/agent.ts";
(globalThis as { Buffer?: typeof Buffer }).Buffer ??= Buffer;
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const MAX_BODY = 256 * 1024;

// One price per tier, on the server. The request never chooses a price.
const TIERS: Record<string, { priceId: string; label: string; currency: string; maxMinor: number }> = {
  pro: { priceId: Deno.env.get("STRIPE_PRICE_PRO") ?? "", label: "Pro", currency: "USD", maxMinor: 200000 },
  ultra: { priceId: Deno.env.get("STRIPE_PRICE_ULTRA") ?? "", label: "Ultra", currency: "USD", maxMinor: 2000000 },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function keyringFrom(map: Record<string, string>) {
  const ring: Record<string, KeyObject> = {};
  for (const [kid, spki] of Object.entries(map)) {
    ring[kid] = createPublicKey({ key: Buffer.from(spki, "base64"), format: "der", type: "spki" });
  }
  return (kid: string) => ring[kid] ?? null;
}

// The fingerprint of the keyring this door trusts. An operator compares it with
// the keyring_fingerprint in the published example file, so a mismatch is
// visible without printing a key.
function fingerprintOf(map: Record<string, string>) {
  const canonical = JSON.stringify(
    Object.fromEntries(Object.entries(map).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
  );
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

// Durable replay store for the MONEY door. The key is the PROPOSAL ID ALONE —
// no session, no scope prefix. A proposal is spent once, on every instance,
// forever. Prefixing the key lets the same signed proposal through again,
// which is the replay this store exists to refuse.
function durableReplay() {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  return {
    async consume(pid: string) {
      const { error } = await db.from("gate_replay").insert({ replay_key: pid, scope: "agent-checkout" });
      if (!error) return true;
      if (error.code === "23505") return false;
      throw new Error("replay_store_unavailable");
    },
  };
}

let gate: ReceiverGate | null = null;
let trustedFingerprint: string | null = null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (req.method === "GET") {
    const ringRaw = Deno.env.get("PSI_GATE_KEYRING");
    return json({
      profile: "PSI-ACT/1",
      door: "agent-checkout",
      live_mode: ringRaw ? (Deno.env.get("PSI_GATE_MODE") ?? "shadow") : "dormant",
      keyring_fingerprint: ringRaw ? fingerprintOf(JSON.parse(ringRaw)) : null,
      note: "An agent payment needs a signed mandate, proposal and decision. A refusal creates no Stripe session.",
    });
  }
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ ok: false, error: "body_too_large" }, 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const ringRaw = Deno.env.get("PSI_GATE_KEYRING");
  if (!ringRaw) {
    return json({ ok: false, dormant: true, reason: "gate_dormant", detail: "No receiver keyring is configured." }, 503);
  }
  try {
    const ring = JSON.parse(ringRaw) as Record<string, string>;
    trustedFingerprint = fingerprintOf(ring);
    gate ??= createReceiverGate({
      resolveKey: keyringFrom(ring),
      mode: (Deno.env.get("PSI_GATE_MODE") ?? "shadow") === "enforce" ? "enforce" : "shadow",
      replayStore: durableReplay(),
    });
  } catch {
    return json({ ok: false, reason: "keyring_misconfigured" }, 500);
  }

  // 1. the gate decides. Everything below it runs only on a permit.
  let result;
  try {
    // deno-lint-ignore no-explicit-any
    result = await gate.authorize({ ...(body as any), actions: (body.actions as unknown[]) ?? [] });
  } catch {
    return json({ ok: false, refused: true, reason: "malformed_request" }, 400);
  }
  if (!result) return json({ ok: false, refused: true, reason: "malformed_request" }, 400);
  if (!result.wouldAllow) {
    console.log(JSON.stringify({ gate: "agent-checkout", refused: result.reason }));
    return json({ ok: false, refused: true, reason: result.reason, mode: Deno.env.get("PSI_GATE_MODE") ?? "shadow" }, 403);
  }

  // 2. the door's money rules. The mandate is the one the gate just verified:
  // the gate refuses a proposal that names another mandate (proposal_mid_mismatch),
  // and it refuses args that are not the digest the proposal signed (args_mismatch).
  const verdict = evaluatePayment(
    {
      tool: body.tool as string | undefined,
      args: body.args as Record<string, unknown>,
      mandate: body.mandate as Mandate | undefined,
    },
    TIERS,
    { expectedTool: PAYMENT_TOOL },
  );
  if (!verdict.allowed) {
    console.log(JSON.stringify({ door: "agent-checkout", refused: verdict.reason }));
    return json({ ok: false, refused: true, reason: verdict.reason, mode: Deno.env.get("PSI_GATE_MODE") ?? "shadow" }, 403);
  }

  // 3. the amount and the tier are the signed ones, and the price is the server's.
  const tier = TIERS[verdict.tier as string];
  if (!tier.priceId) return json({ ok: false, refused: true, reason: "tier_not_permitted" }, 403);

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { httpClient: Stripe.createFetchHttpClient() });
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: tier.priceId, quantity: 1 }],
    success_url: `${SITE_URL}/upgrade?status=success&tier=${tier.label.toLowerCase()}`,
    cancel_url: `${SITE_URL}/upgrade?status=cancelled&tier=${tier.label.toLowerCase()}`,
  });
  return json({
    ok: true,
    url: session.url,
    tier: tier.label.toLowerCase(),
    amount_minor: verdict.amountMinor,
    currency: verdict.currency,
    permit: result.permit,
    header: result.permit?.header,
    keyring_fingerprint: trustedFingerprint,
  });
});
