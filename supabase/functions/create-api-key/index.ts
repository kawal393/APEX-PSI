// create-api-key — mints an APEX PSI API key for the signed-in user at the
// daily_limit of their active subscription tier. The raw key is shown ONCE and
// never stored (only its SHA-256 hash is kept, matching notarize's gate).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { FREE_DAILY_LIMIT } from "../_shared/tiers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function hashSHA256(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `apex_live_${hex}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Authentication required" }, 401);

    const supabase = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let tier = "free";
    let dailyLimit = FREE_DAILY_LIMIT;
    let subId: string | null = null;
    const { data: sub } = await supabase
      .from("notary_subscriptions")
      .select("tier,daily_limit,stripe_subscription_id,status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (sub && sub.status === "active") {
      tier = sub.tier;
      dailyLimit = sub.daily_limit;
      subId = sub.stripe_subscription_id;
    }

    const raw = randomKey();
    const api_key_hash = await hashSHA256(raw);
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const name = typeof body?.name === "string" ? body.name.slice(0, 80) : "Default";

    const { error: insErr } = await supabase.from("notary_api_keys").insert({
      user_id: user.id,
      api_key_hash,
      name,
      tier,
      daily_limit: dailyLimit,
      stripe_subscription_id: subId,
    });
    if (insErr) return json({ error: String(insErr.message || insErr) }, 500);

    return json({ apiKey: raw, tier, daily_limit: dailyLimit, note: "Store this key now — it is shown only once." });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
