// APEX PSI — public RFC 6962 inclusion proof for a receipt.
// GET ?receipt_id=APEX-NTR-... → leaf, index, tree_size, audit_path, root.
// The tree is the window the receipt's root was computed over: up to 255
// prior ledger leaves (by sequence) plus the receipt's own leaf, last.
// `root_matches_receipt` is computed, never assumed: pre-hardening receipts
// used an earlier profile and will honestly report false.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rfc6962Root, rfc6962AuditPath, MERKLE_PROFILE } from "../_shared/psi_core.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b, null, 2), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const id = new URL(req.url).searchParams.get("receipt_id")?.trim();
  if (!id || !/^[A-Z0-9-]{6,64}$/.test(id)) return json({ error: "receipt_id required" }, 400);
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row } = await db.from("gallows_ledger")
      .select("sequence_number, merkle_leaf_hash, merkle_root, created_at")
      .eq("commit_id", id).maybeSingle();
    if (!row) return json({ error: "receipt not found" }, 404);
    const { data: prior } = await db.from("gallows_ledger")
      .select("merkle_leaf_hash").lt("sequence_number", row.sequence_number)
      .order("sequence_number", { ascending: false }).limit(255);
    const leaves = [...(prior ?? []).map((r) => r.merkle_leaf_hash).reverse(), row.merkle_leaf_hash];
    const index = leaves.length - 1;
    const root = await rfc6962Root(leaves);
    return json({
      receipt_id: id,
      merkle_profile: MERKLE_PROFILE,
      leaf: row.merkle_leaf_hash,
      leaf_index: index,
      tree_size: leaves.length,
      audit_path: await rfc6962AuditPath(leaves, index),
      root,
      receipt_root: row.merkle_root,
      root_matches_receipt: root === row.merkle_root,
      verify: "leaf_hash = SHA-256(0x00||leaf); node = SHA-256(0x01||L||R); recompute per RFC 9162 §2.1.3.2",
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
