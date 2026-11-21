// signing-identity — a read-only instrument for the sealing door.
//
// The failure this exists to catch: the runtime signing secret was changed on
// 19 Nov 2026 to a value whose public half the trust anchor did not list. The
// notary then refused every seal with a blank 500 and nothing said so for four
// days, because the only way to see which key the server would sign with was to
// attempt a real seal — and a seal writes a permanent public ledger row.
//
// This endpoint answers that question without signing anything and without
// touching a table. It reports the PUBLIC half of the identity the runtime
// secret derives, matches it against the published anchor, and says whether the
// door would sign, refuse, or sign under a key the anchor does not call active.
// Secrets are never returned: no seed, no length, no fingerprint of the secret.
import { institutionalSigningSeed, PUBLISHED_LEDGER_ED25519_KEYS } from "../_shared/psi_core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-store",
};

// The anchor is published at this address; the file itself names the same
// address in `trust_anchor_url`, and a difference between the two is reported.
const ANCHOR_URL = "https://www.ai-governance-standard.com/.well-known/apex-psi-trust-anchor.json";

function toHex(b: Uint8Array) {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** The public half of the ledger identity, derived the same way the notary derives its key. */
async function ledgerPublicKey(seed: string): Promise<string> {
  const km = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`APEX-SIGNING-KEY-${seed}`)));
  const pkcs8 = new Uint8Array(48);
  pkcs8.set([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20]);
  pkcs8.set(km, 16);
  const key = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "Ed25519" }, true, ["sign"]);
  const jwk = await crypto.subtle.exportKey("jwk", key);
  const x = (jwk.x ?? "").replace(/-/g, "+").replace(/_/g, "/");
  return toHex(Uint8Array.from(atob(x + "=".repeat((4 - (x.length % 4)) % 4)), (c) => c.charCodeAt(0)));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const out: Record<string, unknown> = {
    engine: "APEX PSI signing identity probe v1",
    read_only: true,
    writes: "none — nothing is signed and no row is read or written",
    anchor_url: ANCHOR_URL,
  };

  // 1. The runtime's own view of its secret: present or absent, nothing more.
  let seed = "";
  try {
    seed = institutionalSigningSeed();
    out.secret_env_var = "APEX_PSI_ED25519_SEED";
    out.secret_configured = true;
  } catch (e) {
    out.secret_env_var = "APEX_PSI_ED25519_SEED";
    out.secret_configured = false;
    out.would_sign = false;
    out.verdict = "REFUSES_ALL_SEALS";
    out.reason = String((e as Error)?.message || e);
    return json(out, 200);
  }

  // 2. What the published anchor says the identity is.
  let anchor: any = null;
  try {
    const r = await fetch(ANCHOR_URL, { headers: { "Cache-Control": "no-store" } });
    if (r.ok) anchor = await r.json();
    else out.anchor_fetch_status = r.status;
  } catch (e) {
    out.anchor_fetch_error = String((e as Error)?.message || e);
  }

  // 3. The public half of what this runtime would sign with.
  const pub = await ledgerPublicKey(seed);
  out.derived_ed25519_public_key = pub;
  out.listed_by_the_function_code = PUBLISHED_LEDGER_ED25519_KEYS.includes(pub);

  if (!anchor) {
    out.verdict = "UNVERIFIED";
    out.would_sign = out.listed_by_the_function_code;
    out.reason = "the published trust anchor could not be read, so the runtime identity is not compared to it";
    return json(out, 200);
  }

  const keys: any[] = Array.isArray(anchor.keys) ? anchor.keys : [];
  const mine = keys.find((k) => String(k.public_key || "").toLowerCase() === pub);
  const active = keys.find((k) => String(k.key_id) === String(anchor.active_key_id));

  out.anchor_lists_this_key = !!mine;
  out.anchor_key_id = mine ? String(mine.key_id) : null;
  out.anchor_key_status = mine ? String(mine.status ?? "(no status)") : null;
  out.anchor_active_key_id = String(anchor.active_key_id ?? "(unset)");
  out.anchor_self_named_url = String(anchor.trust_anchor_url ?? "(unset)");
  out.anchor_url_agrees_with_this_file = out.anchor_self_named_url === ANCHOR_URL;

  if (!mine) {
    out.would_sign = false;
    out.verdict = "REFUSES_ALL_SEALS";
    out.reason =
      `the runtime secret derives a key the published anchor does not list, so the notary refuses to sign every receipt`;
  } else if (!active) {
    out.would_sign = true;
    out.verdict = "ACTIVE_KEY_UNDECLARED";
    out.reason = `anchor active_key_id "${out.anchor_active_key_id}" names no key the anchor lists`;
  } else if (String(active.key_id) === String(mine.key_id)) {
    out.would_sign = true;
    out.verdict = String(active.status) === "active" ? "SIGNS_AND_IS_PUBLISHED" : "SIGNS_WITH_NON_ACTIVE_KEY";
    if (out.verdict !== "SIGNS_AND_IS_PUBLISHED") {
      out.reason = `the key the runtime signs with is published as "${active.status}", not "active"`;
    }
  } else {
    out.would_sign = true;
    out.verdict = String(mine.status) === "pending" ? "ROTATION_IN_PROGRESS" : "SIGNS_WITH_NON_ACTIVE_KEY";
    out.reason =
      `the runtime signs with ${mine.key_id} ("${mine.status}") while the anchor names ${active.key_id} active`;
  }

  return json(out, 200);
});
