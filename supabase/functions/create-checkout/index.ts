// create-checkout — starts a Stripe Checkout (subscription) for a self-serve
// tier. No human, no email: the signed-in user pays and is redirected back.
// Provisioning of the higher daily limit happens in stripe-webhook.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { SELF_SERVE_TIERS, TIER_PRICE_ENV, TIER_LABEL } from "../_shared/tiers.ts";

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
    if (userErr || !user) return json({ error: "Invalid session" }, 401);

    const { tier } = await req.json();
    if (!SELF_SERVE_TIERS.includes(tier)) return json({ error: `Unknown self-serve tier: ${tier}` }, 400);

    const priceId = Deno.env.get(TIER_PRICE_ENV[tier]);
    if (!priceId) return json({ error: `Price not configured for tier ${tier}` }, 500);

    const siteUrl = Deno.env.get("SITE_URL") || "https://ai-governance-standard.com";
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      metadata: { user_id: user.id, tier },
      subscription_data: { metadata: { user_id: user.id, tier } },
      success_url: `${siteUrl}/upgrade?status=success&tier=${tier}`,
      cancel_url: `${siteUrl}/upgrade?status=cancelled`,
      allow_promotion_codes: true,
    });

    return json({ url: session.url, tier, label: TIER_LABEL[tier] });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
