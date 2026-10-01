// create-checkout — starts a Stripe Checkout (subscription) for a self-serve
// hosted tier (Pro or Ultra). The signed-in user pays by card and is redirected
// back; /upgrade then calls sync-subscription to provision the higher daily cap.
// The same products are also sold on external marketplaces; this is the direct
// channel on apex's own site.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { SELF_SERVE_TIERS, TIER_PRICE_ID, TIER_LABEL } from "../_shared/tiers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader) return json({ error: "Authentication required" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user?.email) return json({ error: "Invalid session" }, 401);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const tier = String(body?.tier ?? "");
    if (!(SELF_SERVE_TIERS as readonly string[]).includes(tier)) {
      return json({ error: `Unknown self-serve tier: ${tier}` }, 400);
    }

    const priceId = TIER_PRICE_ID[tier];
    if (!priceId) return json({ error: `Price not configured for tier ${tier}` }, 500);

    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://ai-governance-standard.com";
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      metadata: { user_id: user.id, tier },
      subscription_data: { metadata: { user_id: user.id, tier } },
      success_url: `${origin}/upgrade?status=success&tier=${tier}`,
      cancel_url: `${origin}/upgrade?status=cancelled`,
      allow_promotion_codes: true,
    });

    return json({ url: session.url, tier, label: TIER_LABEL[tier] });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
