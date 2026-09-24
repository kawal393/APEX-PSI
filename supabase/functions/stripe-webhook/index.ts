// stripe-webhook — the automated provisioning heart of the metered door.
// On a paid subscription it records the buyer's tier + daily_limit so a fresh
// API key can be minted at that limit. On cancellation it drops their keys back
// to the free commons limit. Runs with the service role; verified by signature.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { TIER_DAILY_LIMIT, FREE_DAILY_LIMIT } from "../_shared/tiers.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return json({ error: "unreadable body" }, 400);
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "missing signature" }, 400);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    return json({ error: `signature verification failed: ${String((err as Error)?.message || err)}` }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.metadata?.user_id) {
        const userId = session.metadata.user_id;
        const tier = session.metadata.tier || "builder";
        await supabase.from("notary_subscriptions").upsert({
          user_id: userId,
          tier,
          daily_limit: TIER_DAILY_LIMIT[tier] ?? FREE_DAILY_LIMIT,
          stripe_customer_id: String(session.customer ?? ""),
          stripe_subscription_id: String(session.subscription ?? ""),
          status: "active",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
    } else if (
      event.type === "customer.subscription.deleted" ||
      event.type === "invoice.payment_failed"
    ) {
      const sub = event.data.object as Stripe.Subscription | { subscription?: string; parent?: { subscription_details?: { subscription?: string } } };
      // Resolve the Stripe subscription id from either event shape.
      let subId = "";
      if (event.type === "customer.subscription.deleted") {
        subId = (event.data.object as Stripe.Subscription).id;
      } else {
        const inv = event.data.object as { parent?: { subscription_details?: { subscription?: string } } };
        subId = inv?.parent?.subscription_details?.subscription || "";
      }
      if (subId) {
        const { data: row } = await supabase
          .from("notary_subscriptions")
          .select("user_id,status")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();
        if (row) {
          const newStatus = event.type === "customer.subscription.deleted" ? "canceled" : "past_due";
          await supabase.from("notary_subscriptions")
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq("user_id", row.user_id);
          if (newStatus === "canceled") {
            // Paid keys lose their elevated limit; the commons stays free.
            await supabase.from("notary_api_keys")
              .update({ daily_limit: FREE_DAILY_LIMIT })
              .eq("stripe_subscription_id", subId);
          }
        }
      }
    }

    return json({ received: true });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
