import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERVICES = {
  conformityReceipt: { serviceKey: "conformity_receipt", priceId: "price_1U0KNS1dcr4wA5TxmP1x1nze", mode: "payment" },
  prover: { serviceKey: "prover", priceId: "price_1TxFJ01dcr4wA5TxKE8GIUb4", mode: "subscription" },
  registryListing: { serviceKey: "registry_listing", priceId: "price_1U0KPp1dcr4wA5Tx68sJ4Jfs", mode: "subscription" },
} as const;

const BodySchema = z.object({
  service: z.enum(["conformityReceipt", "prover", "registryListing"]),
});

const ALLOWED_ORIGINS = new Set([
  "https://ai-governance-standard.com",
  "https://www.ai-governance-standard.com",
  "https://apex-psi.lovable.app",
  "http://localhost:8080",
]);

function safeOrigin(value: string | null): string {
  if (!value) return "https://ai-governance-standard.com";
  try {
    const origin = new URL(value).origin;
    return ALLOWED_ORIGINS.has(origin) || origin.endsWith(".lovable.app")
      ? origin
      : "https://ai-governance-standard.com";
  } catch {
    return "https://ai-governance-standard.com";
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid service" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const product = SERVICES[parsed.data.service];

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = safeOrigin(req.headers.get("origin"));

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      line_items: [{ price: product.priceId, quantity: 1 }],
      mode: product.mode,
      success_url: `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/products?checkout=cancelled`,
      metadata: { user_id: user.id, service_key: product.serviceKey },
      subscription_data: product.mode === "subscription"
        ? { metadata: { user_id: user.id, service_key: product.serviceKey } }
        : undefined,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
