import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "npm:zod@3.25.76";
import { provisionCheckout } from "../_shared/commerceProvisioning.ts";

const BodySchema = z.object({ session_id: z.string().regex(/^cs_(test_|live_)?[A-Za-z0-9]+$/).max(255) });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Sign in required" }, { status: 401, headers: corsHeaders });
    }

    const auth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data: { user }, error: userError } = await auth.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: "Sign in required" }, { status: 401, headers: corsHeaders });
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid checkout session" }, { status: 400, headers: corsHeaders });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Payments are not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(parsed.data.session_id);
    if (session.metadata?.user_id !== user.id) {
      return Response.json({ error: "Checkout does not belong to this account" }, { status: 403, headers: corsHeaders });
    }

    const backend = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    await provisionCheckout(backend, session);
    return Response.json({ activated: true, service_key: session.metadata?.service_key }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not activate purchase";
    console.error("finalize-checkout:", message);
    return Response.json({ error: message }, { status: 400, headers: corsHeaders });
  }
});