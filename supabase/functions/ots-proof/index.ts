// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — .ots proof download endpoint
//
// Serves the raw OpenTimestamps proof bytes exactly as returned by the
// Bitcoin calendars, so anyone can verify offline with the reference client:
//     ots verify apex-<hash>.ots
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { base64ToBytes, extractBitcoinBlockHeight } from "../_shared/ots.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const hash = url.searchParams.get("hash");
  const commitId = url.searchParams.get("commit_id");
  const asJson = url.searchParams.get("format") === "json";

  if (!id && !hash && !commitId) {
    return new Response(
      JSON.stringify({ error: "Provide id, hash or commit_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let query = supabase.from("ots_proofs").select("*").order("created_at", { ascending: false }).limit(1);
  if (id) query = query.eq("id", id);
  else if (hash) query = query.eq("target_hash", hash.replace(/^0x/i, "").toLowerCase());
  else query = query.eq("commit_id", commitId!);

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return new Response(
      JSON.stringify({ error: "No OpenTimestamps proof found for that reference" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const bytes = base64ToBytes(data.ots_base64);

  if (asJson) {
    return new Response(
      JSON.stringify({
        id: data.id,
        commit_id: data.commit_id,
        target_hash: data.target_hash,
        calendar_url: data.calendar_url,
        status: data.status,
        bitcoin_block_height: data.bitcoin_block_height ?? extractBitcoinBlockHeight(bytes),
        bitcoin_txid: data.bitcoin_txid,
        explorer_url: data.bitcoin_txid ? `https://mempool.space/tx/${data.bitcoin_txid}` : null,
        ots_bytes: bytes.length,
        ots_base64: data.ots_base64,
        created_at: data.created_at,
        verify_command: `ots verify apex-${data.target_hash.slice(0, 16)}.ots`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(bytes, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="apex-${data.target_hash.slice(0, 16)}.ots"`,
    },
  });
});
