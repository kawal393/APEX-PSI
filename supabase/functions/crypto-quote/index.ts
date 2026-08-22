import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { z } from "npm:zod@3.25.76";
import { CRYPTO_ITEMS, REQUIRED_CONFIRMATIONS, type CryptoAsset } from "../_shared/cryptoCatalog.ts";
import {
  atomicAmount,
  deriveBtcAddress,
  formatAtomic,
  getRate,
  paymentUri,
} from "../_shared/cryptoChain.ts";

const BodySchema = z.object({
  item: z.enum(["receipt_1", "receipt_10", "api_credits_10k", "registry_12mo"]),
  asset: z.enum(["BTC", "ETH", "USDC"]),
});

const QUOTE_TTL_MS = 20 * 60 * 1000;

function invoiceRef(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `psi-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

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
      return Response.json({ error: "Unknown item or asset" }, { status: 400, headers: corsHeaders });
    }
    const item = CRYPTO_ITEMS[parsed.data.item];
    const asset = parsed.data.asset as CryptoAsset;

    const backend = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    let address: string;
    let derivationIndex: number | null = null;
    if (asset === "BTC") {
      const xpub = Deno.env.get("BTC_XPUB");
      const fixed = Deno.env.get("BTC_RECEIVE_ADDRESS");
      if (xpub) {
        const { data: last } = await backend
          .from("crypto_invoices")
          .select("derivation_index")
          .eq("asset", "BTC")
          .not("derivation_index", "is", null)
          .order("derivation_index", { ascending: false })
          .limit(1)
          .maybeSingle();
        derivationIndex = (last?.derivation_index ?? -1) + 1;
        address = deriveBtcAddress(xpub, derivationIndex);
      } else if (fixed) {
        address = fixed;
      } else {
        return Response.json(
          { error: "Bitcoin payments are not configured yet" },
          { status: 503, headers: corsHeaders },
        );
      }
    } else {
      const eth = Deno.env.get("ETH_RECEIVE_ADDRESS");
      if (!eth) {
        return Response.json(
          { error: `${asset} payments are not configured yet` },
          { status: 503, headers: corsHeaders },
        );
      }
      address = eth;
    }

    const rate = await getRate(backend, asset);

    // Unique amount per open invoice on the same address, so a payment can never
    // be attributed to the wrong buyer.
    const { data: openRows } = await backend
      .from("crypto_invoices")
      .select("amount_atomic")
      .eq("asset", asset)
      .eq("address", address)
      .in("status", ["awaiting", "seen", "confirming"]);
    const taken = new Set((openRows ?? []).map((r: { amount_atomic: string }) => r.amount_atomic));

    let atomic = atomicAmount(item.usdCents, rate.usd, asset);
    for (let i = 0; i < 25 && taken.has(atomic.toString()); i += 1) {
      atomic = atomicAmount(item.usdCents, rate.usd, asset);
    }
    if (taken.has(atomic.toString())) {
      return Response.json(
        { error: "Too many open invoices for this asset — try again in a minute" },
        { status: 409, headers: corsHeaders },
      );
    }

    const ref = invoiceRef();
    const expiresAt = new Date(Date.now() + QUOTE_TTL_MS).toISOString();
    const { error: insertError } = await backend.from("crypto_invoices").insert({
      invoice_ref: ref,
      user_id: user.id,
      item_key: item.key,
      asset,
      address,
      derivation_index: derivationIndex,
      amount_asset: Number(formatAtomic(atomic, asset)),
      amount_atomic: atomic.toString(),
      fiat_amount_cents: item.usdCents,
      rate_usd: rate.usd,
      rate_source: rate.source,
      expires_at: expiresAt,
    });
    if (insertError) throw insertError;

    return Response.json({
      invoice_ref: ref,
      asset,
      address,
      amount: formatAtomic(atomic, asset),
      amount_atomic: atomic.toString(),
      uri: paymentUri(asset, address, atomic),
      fiat_amount_cents: item.usdCents,
      rate_usd: rate.usd,
      rate_source: rate.source,
      expires_at: expiresAt,
      required_confirmations: REQUIRED_CONFIRMATIONS[asset],
      item: { key: item.key, label: item.label, delivers: item.delivers },
    }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create a crypto invoice";
    console.error("crypto-quote:", message);
    return Response.json({ error: message }, { status: 400, headers: corsHeaders });
  }
});
