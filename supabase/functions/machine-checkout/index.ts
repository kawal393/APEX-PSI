// machine-checkout — the PSI-ACT/1 receiver gate (draft-singh-psi-agent-03).
// The gate code is vendored unchanged from apex-psi-mcp-server (_shared/psi-agent).
// No checkout is connected: this door never moves money. It answers whether a
// request carries a valid permission record.
//   ?conformance=agent-03  -> public test keyring from the signed example, enforce verdicts
//   live (default)         -> keyring from PSI_GATE_KEYRING (server secret), shadow mode only;
//                             dormant (503) until that secret exists. Enforce is refused until a
//                             durable replay store exists, because a per-instance store can be replayed.
import { createPublicKey, type KeyObject } from "node:crypto";
import { Buffer } from "node:buffer";
import { createReceiverGate, type ReceiverGate } from "../_shared/psi-agent/receiver.ts";
// The vendored code uses Node's global Buffer at call time; provide it without editing that code.
(globalThis as { Buffer?: typeof Buffer }).Buffer ??= Buffer;
import example from "./agent-03-example.json" with { type: "json" };
import { createClient } from "npm:@supabase/supabase-js@2";

// Durable replay store for the CONFORMANCE door. The key carries the session:
// `conformance:${session}:${pid}`. The session is required, so the published
// example stays runnable by anyone forever, and nobody can read "posted with
// no session, always allowed" as the guarantee. This door moves no money; the
// money door is agent-checkout, whose key is the proposal id alone.
function durableReplay(session: string) {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  return {
    async consume(pid: string) {
      const { error } = await db.from("gate_replay").insert({
        replay_key: `conformance:${session}:${pid}`,
        scope: "conformance",
      });
      if (!error) return true;
      if (error.code === "23505") return false;
      throw new Error("replay_store_unavailable");
    },
  };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const MAX_BODY = 256 * 1024;
const NO_SIDE_EFFECT = "none: no checkout is connected to this door; nothing was charged or ordered";

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

let liveGate: ReceiverGate | null = null;

const conformanceKeys = keyringFrom((example as { keyring: Record<string, string> }).keyring);

// The conformance gate is session-scoped: the session is required, and the
// replay key carries it. Without a session there would be no replay memory at
// all, and a request posted twice would be allowed twice.
function getConformanceGate(session: string) {
  return createReceiverGate({
    resolveKey: conformanceKeys,
    mode: "enforce",
    replayStore: durableReplay(session),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url);
  const conformance = url.searchParams.get("conformance") === "agent-03";

  if (req.method === "GET") {
    return json({
      profile: "PSI-ACT/1",
      source: "draft-singh-psi-agent-03",
      side_effect: NO_SIDE_EFFECT,
      live_mode: Deno.env.get("PSI_GATE_KEYRING") ? "shadow" : "dormant",
      conformance: "POST ?conformance=agent-03&session=<8-64 chars> with any request from /conformance/agent-03-example.json; the session is required and scopes the replay memory, so the example stays runnable and a replay is refused inside a session",
      note: "A permit proves a signed, permitted decision existed for this exact action. It does not prove the action is right or true.",
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

  let gate: ReceiverGate;
  let mode: "conformance" | "shadow";
  if (conformance) {
    const session = url.searchParams.get("session");
    if (session === null) {
      return json(
        {
          ok: false,
          error: "session_required",
          detail:
            "The conformance door needs a session id: add &session=<8-64 chars of A-Z a-z 0-9 _ ->. The session scopes the replay memory, so the published example stays runnable and a replay is refused inside a session.",
        },
        400,
      );
    }
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(session)) {
      return json({ ok: false, error: "invalid_session" }, 400);
    }
    gate = getConformanceGate(session);
    mode = "conformance";
  } else {
    const ringRaw = Deno.env.get("PSI_GATE_KEYRING");
    if (!ringRaw) {
      return json({ ok: false, dormant: true, reason: "gate_dormant", detail: "No receiver keyring is configured yet. Use ?conformance=agent-03 to test against the signed example." }, 503);
    }
    if ((Deno.env.get("PSI_GATE_MODE") ?? "shadow") !== "shadow") {
      return json({ ok: false, reason: "enforce_unavailable", detail: "Enforce mode needs a durable replay store, which is not built yet." }, 503);
    }
    try {
      liveGate ??= createReceiverGate({ resolveKey: keyringFrom(JSON.parse(ringRaw)), mode: "shadow" });
    } catch {
      return json({ ok: false, reason: "keyring_misconfigured" }, 500);
    }
    gate = liveGate;
    mode = "shadow";
  }

  let result;
  try {
    // deno-lint-ignore no-explicit-any
    result = await gate.authorize({ ...(body as any), actions: (body.actions as unknown[]) ?? [] });
  } catch {
    result = null;
  }
  if (!result) return json({ ok: false, refused: true, reason: "malformed_request", mode, side_effect: NO_SIDE_EFFECT }, 400);

  if (!result.wouldAllow) {
    console.log(JSON.stringify({ gate: "machine-checkout", mode, refused: result.reason }));
  }
  const payload = {
    ok: result.wouldAllow,
    mode,
    refused: !result.wouldAllow,
    reason: result.reason,
    permit: result.permit,
    report: result.report,
    side_effect: NO_SIDE_EFFECT,
  };
  // Shadow reports the refusal but lets the (absent) action through: 200.
  return json(payload, result.wouldAllow || mode === "shadow" ? 200 : 403);
});
