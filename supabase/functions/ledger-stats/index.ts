import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const FOUNDED_AT = "2026-08-22T10:43:09Z";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [receipts, confirmed, pending, latest] = await Promise.all([
      db.from("gallows_ledger").select("id", { count: "exact", head: true }),
      db.from("anchor_records").select("id", { count: "exact", head: true }).eq("status", "CONFIRMED"),
      db.from("anchor_records").select("id", { count: "exact", head: true }).neq("status", "CONFIRMED"),
      db
        .from("anchor_records")
        .select("block_height, bitcoin_txid, confirmed_at")
        .eq("status", "CONFIRMED")
        .not("block_height", "is", null)
        .order("block_height", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return new Response(
      JSON.stringify({
        total_receipts: receipts.count ?? 0,
        confirmed_anchors: confirmed.count ?? 0,
        pending_anchors: pending.count ?? 0,
        latest_block_height: latest.data?.block_height ?? null,
        latest_anchor_txid: latest.data?.bitcoin_txid ?? null,
        founded_at: FOUNDED_AT,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[ledger-stats]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
