// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — Challenge & Economic-Bond Scaffold
//
// POST /psi-challenge
//   { receipt_id, challenger_pubkey, bond_hash, bond_amount_wei, claim, window_hours }
//   Files a challenge against a receipt. Bond is committed by hash;
//   settlement layer (on-chain slashing) is left as an external adapter.
//
// GET /psi-challenge?receipt_id=…    → list open challenges for a receipt
// GET /psi-challenge?id=…            → fetch one challenge
// ═══════════════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256Hex(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const url = new URL(req.url);

  if (req.method === "GET") {
    const receiptId = url.searchParams.get("receipt_id");
    const id = url.searchParams.get("id");
    let q = supabase.from("psi_challenges").select("*").order("created_at", { ascending: false }).limit(50);
    if (receiptId) q = q.eq("receipt_id", receiptId);
    if (id) q = q.eq("challenge_id", id);
    const { data, error } = await q;
    if (error) return json({ error: "query_failed", detail: error.message }, 500);
    return json({ challenges: data ?? [], count: data?.length ?? 0 });
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json();
    const {
      receipt_id, challenger_pubkey, bond_hash,
      bond_amount_wei, claim, window_hours,
    } = body ?? {};

    if (!receipt_id || typeof receipt_id !== "string") return json({ error: "receipt_id required" }, 400);
    if (!challenger_pubkey || typeof challenger_pubkey !== "string") return json({ error: "challenger_pubkey required" }, 400);
    if (!bond_hash || !/^[a-f0-9]{64}$/i.test(bond_hash.replace(/^sha256:/, ""))) return json({ error: "bond_hash must be SHA-256 hex" }, 400);
    if (!claim || typeof claim !== "string" || claim.length > 2000) return json({ error: "claim required (≤2000 chars)" }, 400);

    const cleanBond = bond_hash.replace(/^sha256:/, "");
    const amount = String(bond_amount_wei ?? "0");
    if (!/^\d+$/.test(amount)) return json({ error: "bond_amount_wei must be a non-negative integer string" }, 400);

    // Verify the receipt exists
    const { data: receipt } = await supabase
      .from("gallows_ledger")
      .select("commit_id, predicate_id, created_at")
      .eq("commit_id", receipt_id)
      .maybeSingle();
    if (!receipt) return json({ error: "receipt_not_found", receipt_id }, 404);

    const hours = Math.min(Math.max(Number(window_hours ?? 168), 1), 720); // 1h..30d
    const windowExpiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

    const challengeId = `APEX-CHL-${Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;

    const { data, error } = await supabase.from("psi_challenges").insert({
      challenge_id: challengeId,
      receipt_id,
      challenger_pubkey,
      bond_hash: cleanBond,
      bond_amount_wei: amount,
      claim: claim.trim(),
      status: "OPEN",
      window_expires_at: windowExpiresAt,
    }).select().single();
    if (error) return json({ error: "persist_failed", detail: error.message }, 500);

    // Attempt auto-resolution: if a predicate_proof already contradicts the claim,
    // mark the challenge as RESOLVED_INVALID (receipt stands); if it confirms,
    // RESOLVED_VALID (challenger wins the bond).
    const { data: proofs } = await supabase
      .from("predicate_proofs")
      .select("verdict, predicate_id")
      .eq("receipt_id", receipt_id);
    let autoResolution: string | null = null;
    if (proofs && proofs.length > 0) {
      const anyViolated = proofs.some((p: any) => p.verdict === "VIOLATED");
      const allSatisfied = proofs.every((p: any) => p.verdict === "SATISFIED");
      if (anyViolated) autoResolution = "RESOLVED_VALID";
      else if (allSatisfied) autoResolution = "RESOLVED_INVALID";
    }
    if (autoResolution) {
      await supabase.from("psi_challenges")
        .update({
          status: autoResolution,
          resolution: `auto-resolved from ${proofs?.length ?? 0} predicate proof(s)`,
          resolved_at: new Date().toISOString(),
        })
        .eq("challenge_id", challengeId);
    }

    return json({
      challenge_id: challengeId,
      receipt_id,
      status: autoResolution ?? "OPEN",
      auto_resolved: !!autoResolution,
      window_expires_at: windowExpiresAt,
      bond_hash: `sha256:${cleanBond}`,
      bond_amount_wei: amount,
      created_at: data.created_at,
      settlement: "external",
      note: "Bond settlement (slashing) is executed by the challenger's on-chain adapter using bond_hash as the reveal commitment.",
      engine: "APEX PSI Challenge v1",
    }, 201);
  } catch (e: any) {
    return json({ error: "internal_error", detail: e?.message }, 500);
  }
});
