// sync-subscription — reads the signed-in user's live subscription state from
// Stripe and records it, so a paid hosted tier is provisioned without relying
// on a webhook. Called by /upgrade on load and after a successful checkout.
// Returns only the user's own plan state; never any Stripe secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { TIER_DAILY_LIMIT, FREE_DAILY_LIMIT, TIER_PRICE_ID, TIER_LABEL } from "../_shared/tiers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Map a Stripe price id back to the hosted tier it grants. */
function tierForPrice(priceId: string | null | undefined): string | null {
  if (!priceId) return null;
  for (const [tier, id] of Object.entries(TIER_PRICE_ID)) {
    if (id === priceId) return tier;
  }
  return null;
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
    if (userErr || !user?.email) return json({ error: "Authentication required" }, 401);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Card checkout is not configured" }, 503);
    const stripe = new Stripe(stripeKey, { httpClient: Stripe.createFetchHttpClient() });
    const supabase = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    let tier = "free";
    let status = "canceled";
    let customerId = "";
    let subscriptionId = "";
    let currentPeriodEnd: string | null = null;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 5 });
      for (const sub of subs.data) {
        const mapped = tierForPrice(sub.items.data[0]?.price?.id);
        if (!mapped) continue;
        // If several are active, keep the highest capacity.
        if (tier === "free" || (TIER_DAILY_LIMIT[mapped] ?? 0) > (TIER_DAILY_LIMIT[tier] ?? 0)) {
          tier = mapped;
          status = "active";
          subscriptionId = sub.id;
          const end = (sub as unknown as { current_period_end?: number }).current_period_end;
          currentPeriodEnd = end ? new Date(end * 1000).toISOString() : null;
        }
      }
    }

    const dailyLimit = TIER_DAILY_LIMIT[tier] ?? FREE_DAILY_LIMIT;

    await supabase.from("notary_subscriptions").upsert({
      user_id: user.id,
      tier,
      daily_limit: dailyLimit,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status: tier === "free" ? "canceled" : status,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // Keep existing keys aligned with what the user is actually entitled to.
    await supabase.from("notary_api_keys")
      .update({ tier, daily_limit: dailyLimit, stripe_subscription_id: subscriptionId || null })
      .eq("user_id", user.id)
      .eq("revoked", false);

    return json({
      tier,
      label: TIER_LABEL[tier] ?? tier,
      daily_limit: dailyLimit,
      subscribed: tier !== "free",
      current_period_end: currentPeriodEnd,
    });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
