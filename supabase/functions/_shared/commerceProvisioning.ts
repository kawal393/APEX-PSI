import type Stripe from "https://esm.sh/stripe@18.5.0";

type BackendClient = {
  from: (table: string) => any;
};

const SERVICE_KEYS = ["conformity_receipt", "prover", "registry_listing"] as const;
export type ServiceKey = (typeof SERVICE_KEYS)[number];

export function isServiceKey(value: unknown): value is ServiceKey {
  return typeof value === "string" && SERVICE_KEYS.includes(value as ServiceKey);
}

export async function provisionCheckout(
  backend: BackendClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.user_id;
  const serviceKey = session.metadata?.service_key;
  if (!userId || !isServiceKey(serviceKey)) {
    throw new Error("Checkout session is missing valid provisioning metadata");
  }

  if (session.payment_status !== "paid" && session.status !== "complete") {
    throw new Error("Checkout is not complete");
  }

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;

  const { data: order, error: orderError } = await backend
    .from("service_orders")
    .upsert({
      user_id: userId,
      service_key: serviceKey,
      stripe_checkout_session_id: session.id,
      stripe_customer_id: customerId,
      stripe_payment_intent_id: paymentIntentId,
      amount_total: session.amount_total,
      currency: session.currency,
      status: "active",
    }, { onConflict: "stripe_checkout_session_id" })
    .select("id")
    .single();
  if (orderError) throw orderError;

  if (serviceKey === "conformity_receipt") {
    const { data: existing, error: readError } = await backend
      .from("service_entitlements")
      .select("quantity")
      .eq("user_id", userId)
      .eq("service_key", serviceKey)
      .maybeSingle();
    if (readError) throw readError;
    const { error } = await backend.from("service_entitlements").upsert({
      user_id: userId,
      service_key: serviceKey,
      status: "active",
      quantity: (existing?.quantity ?? 0) + 1,
      source_order_id: order.id,
    }, { onConflict: "user_id,service_key" });
    if (error) throw error;
    return;
  }

  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id ?? null;
  const { error: entitlementError } = await backend.from("service_entitlements").upsert({
    user_id: userId,
    service_key: serviceKey,
    status: "active",
    quantity: 1,
    stripe_subscription_id: subscriptionId,
    source_order_id: order.id,
  }, { onConflict: "user_id,service_key" });
  if (entitlementError) throw entitlementError;

  if (serviceKey === "prover") {
    const { error } = await backend.from("subscriptions").upsert({
      user_id: userId,
      tier: "prover",
      status: "active",
      stripe_customer_id: customerId,
      stripe_session_id: session.id,
      verifications_limit: -1,
      verifications_used: 0,
      current_period_start: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) throw error;
  }
}

/**
 * Grants an entitlement for a purchase that did not come through Stripe (today:
 * confirmed on-chain crypto payments). Crypto and card purchases converge here so
 * both deliver byte-identical credits.
 */
export async function grantEntitlement(
  backend: BackendClient,
  params: {
    userId: string;
    serviceKey: string;
    quantity: number;
    months?: number;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { data: existing, error: readError } = await backend
    .from("service_entitlements")
    .select("quantity, ends_at")
    .eq("user_id", params.userId)
    .eq("service_key", params.serviceKey)
    .maybeSingle();
  if (readError) throw readError;

  let endsAt: string | null = existing?.ends_at ?? null;
  if (params.months) {
    const from = endsAt && Date.parse(endsAt) > Date.now() ? new Date(endsAt) : new Date();
    from.setMonth(from.getMonth() + params.months);
    endsAt = from.toISOString();
  }

  const { error } = await backend.from("service_entitlements").upsert({
    user_id: params.userId,
    service_key: params.serviceKey,
    status: "active",
    quantity: (existing?.quantity ?? 0) + params.quantity,
    ends_at: endsAt,
    metadata: params.metadata ?? {},
  }, { onConflict: "user_id,service_key" });
  if (error) throw error;
}
