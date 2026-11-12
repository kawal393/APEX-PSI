// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — .ots proof download endpoint
//
// Serves the raw OpenTimestamps proof bytes exactly as returned by the
// Bitcoin calendars, so anyone can verify offline with the reference client:
//     ots verify apex-<hash>.ots
//
// A stored proof can be months behind the calendar: the calendar upgrades a
// pending timestamp to its Bitcoin attestation after the fact. So a stored
// proof with no Bitcoin attestation is upgraded AT READ TIME and the fresh
// bytes are served. Nothing is written to the database on this path; the row
// is corrected by the poller, which may also record the transaction.
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  base64ToBytes,
  buildDetachedProof,
  bytesToBase64,
  proofCoversDigest,
  readBitcoinAttestation,
  upgradeTimestamp,
} from "../_shared/ots.ts";

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

  // If the stored proof is still calendar-pending, ask the calendar for the
  // upgraded one now and serve that instead. A failure here is not an error:
  // the stored proof is still a valid pending proof and is served as it stands.
  let served = bytes;
  let upgraded = false;
  let upgradedError: string | undefined;
  if (readBitcoinAttestation(bytes).height === null) {
    try {
      const res = await upgradeTimestamp(
        data.calendar_url,
        bytes,
        data.target_hash,
      );
      if (res.ok && res.bytes && res.bytes.length > bytes.length) {
        served = res.bytes;
        upgraded = true;
      } else if (!res.ok) {
        upgradedError = res.error;
      }
    } catch (e) {
      upgradedError = e instanceof Error ? e.message : String(e);
    }
  }

  // The binding test: does this proof actually carry the digest it claims to
  // prove? A proof that does not is served as-is, and says so.
  const covers = proofCoversDigest(served, data.target_hash);
  const attestation = readBitcoinAttestation(served);

  // Serve a DETACHED proof — the OpenTimestamps reference client's `ots verify`
  // expects the magic header, the digest and the timestamp serialization.
  let download = served;
  let detached = false;
  try {
    download = base64ToBytes(buildDetachedProof(data.target_hash, served));
    detached = true;
  } catch {
    download = served;
  }

  if (asJson) {
    return new Response(
      JSON.stringify({
        id: data.id,
        commit_id: data.commit_id,
        target_hash: data.target_hash,
        calendar_url: data.calendar_url,
        status: data.status,
        bitcoin_block_height: data.bitcoin_block_height ?? attestation.height,
        bitcoin_txid: data.bitcoin_txid ?? attestation.txid,
        explorer_url: data.bitcoin_txid ? `https://mempool.space/tx/${data.bitcoin_txid}` : null,
        ots_bytes: served.length,
        ots_base64: bytesToBase64(served),
        ots_detached: detached,
        served_from_calendar_upgrade: upgraded,
        upgrade_error: upgradedError ?? null,
        ots_covers_digest: covers,
        ots_attested_height: attestation.height,
        ots_attested_txid: attestation.txid,
        created_at: data.created_at,
        verify_command: `ots verify apex-${data.target_hash.slice(0, 16)}.ots`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(download, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="apex-${data.target_hash.slice(0, 16)}.ots"`,
    },
  });
});
