// APEX PSI — post-quantum backfill.
//
// Every ledger row created before the LMS upgrade carries only SHA-256 + Ed25519.
// This function retro-signs those rows with the institutional LMS-W4-SHA256
// (NIST SP 800-208) one-time key so the published "post-quantum" claim is true
// for the entire ledger rather than only for new entries.
//
// Safety properties:
//  - It only ever writes rows where pq_signature IS NULL. Once the ledger is
//    fully signed every call is a no-op, so repeated invocation is harmless.
//  - One-time leaf indices are allocated strictly monotonically from the
//    current count of PQ-signed rows, so no LMS leaf is ever reused.
//  - It returns counts only. No private key material is ever emitted.

import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  lmsSignInstitutional,
  lmsInstitutionalPublicKey,
  LMS_ALGORITHM,
} from "../_shared/pq_lms.ts";

const MAX_BATCH = 120;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    let requested = 60;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (Number.isFinite(body?.batch)) requested = Number(body.batch);
    } else {
      const q = new URL(req.url).searchParams.get("batch");
      if (q && Number.isFinite(Number(q))) requested = Number(q);
    }
    const batch = Math.min(Math.max(1, Math.floor(requested)), MAX_BATCH);

    // Current monotonic LMS counter = number of rows already PQ-signed.
    const { count: signedCount } = await supabase
      .from("gallows_ledger")
      .select("id", { count: "exact", head: true })
      .not("pq_signature", "is", null);

    const { count: pendingCount } = await supabase
      .from("gallows_ledger")
      .select("id", { count: "exact", head: true })
      .is("pq_signature", null);

    const { data: rows, error } = await supabase
      .from("gallows_ledger")
      .select("id, merkle_leaf_hash")
      .is("pq_signature", null)
      .order("created_at", { ascending: true })
      .limit(batch);

    if (error) return json({ error: error.message }, 500);

    let counter = signedCount ?? 0;
    let signed = 0;
    const failures: string[] = [];

    for (const row of rows ?? []) {
      if (!row.merkle_leaf_hash) continue;
      try {
        const sig = await lmsSignInstitutional(
          new TextEncoder().encode(row.merkle_leaf_hash),
          counter,
        );
        const pub = await lmsInstitutionalPublicKey(counter);
        const { error: upErr } = await supabase
          .from("gallows_ledger")
          .update({
            pq_signature: sig,
            pq_public_key: pub,
            pq_algorithm: LMS_ALGORITHM,
          })
          .eq("id", row.id)
          .is("pq_signature", null);
        if (upErr) {
          failures.push(`${row.id}: ${upErr.message}`);
          continue;
        }
        counter += 1;
        signed += 1;
      } catch (e) {
        failures.push(`${row.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return json({
      ok: true,
      algorithm: LMS_ALGORITHM,
      standard: "NIST SP 800-208",
      signed_this_call: signed,
      already_signed: signedCount ?? 0,
      remaining_before: pendingCount ?? 0,
      remaining_after: Math.max(0, (pendingCount ?? 0) - signed),
      complete: Math.max(0, (pendingCount ?? 0) - signed) === 0,
      failures: failures.slice(0, 5),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
