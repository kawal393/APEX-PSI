// Audit-Mirror — public JSONL stream of recent ledger entries with a signed manifest.
// GET /audit-mirror              -> JSONL of the last 500 ledger entries
// GET /audit-mirror?manifest=1   -> JSON manifest (count, latest sequence, sha256 of body, issuer key id)
//
// Every published row names its own Merkle construction. Where the construction
// is a real RFC 9162 tree head, the mirror recomputes it from the published
// leaves and reports the match instead of asserting it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  classifyLedger,
  LEDGER_SIGNATURE_BINDING,
  MERKLE_HARDENED_FROM,
  MERKLE_WINDOW_LEAVES,
} from "../_shared/merkle_profile.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const ISSUER_KEY_ID = "apex-psi-2026";

async function sha256Hex(data: string): Promise<string> {
  const bytes = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const wantManifest = url.searchParams.get("manifest") === "1";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "500", 10) || 500, 2000);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // The rolling window is the 255 leaves before a row plus the row's own,
    // so the mirror needs those priors in hand to rebuild it.
    const fetchLimit = limit + (MERKLE_WINDOW_LEAVES - 1);
    const { data, error } = await supabase
      .from("gallows_ledger")
      .select("sequence_number, commit_id, action, predicate_id, phase, commit_hash, merkle_leaf_hash, merkle_root, merkle_proof, ed25519_signature, created_at")
      .order("sequence_number", { ascending: false })
      .limit(fetchLimit);

    if (error) throw error;

    const fetched = (data ?? []) as Record<string, unknown>[];
    const oldestFirst = [...fetched].reverse();
    const fromLedgerStart = fetched.length < fetchLimit;
    const classified = classifyLedger(oldestFirst, { fromLedgerStart });

    // The newest `limit` rows are what this endpoint publishes; the older rows
    // were fetched only to rebuild the rolling window.
    const published = classified.slice(-limit).reverse();

    // Every row names its own Merkle construction. The sealed fields are
    // published byte for byte as stored; the profile labels are appended.
    const rows = published.map((r) => ({
      ...r,
      signature_binds: LEDGER_SIGNATURE_BINDING,
    }));
    const lines = rows.map((r) => JSON.stringify(r)).join("\n");
    const bodyHash = await sha256Hex(lines);
    const latestSeq = rows[0]?.sequence_number ?? null;

    if (wantManifest) {
      const manifest = {
        protocol: "apex-psi/audit-mirror",
        version: "1.1",
        issuer_key_id: ISSUER_KEY_ID,
        generated_at: new Date().toISOString(),
        count: rows.length,
        latest_sequence: latestSeq,
        body_sha256: bodyHash,
        format: "application/jsonl",
        verify_via: "https://ai-governance-standard.com/verify",
        well_known: "https://ai-governance-standard.com/.well-known/compliance-receipt",
        signature_binds: LEDGER_SIGNATURE_BINDING,
        merkle_profiles: {
          "PSI-W1": "RFC 9162 head over the rolling 256-leaf ledger window ending at this row",
          "PSI-B1": "RFC 9162 head over the batch's own leaves (contiguous published run ending at this row)",
          "PSI-C1": "SHA-256(merkle_leaf_hash | commit timestamp) — a salted leaf digest, not a tree head",
          "PSI-P1": "canonical-ordered hex concatenation without domain separation; the stored audit path is replayed against the stored root",
          "PSI-L0": "issued before " + MERKLE_HARDENED_FROM + "; construction not classified",
          "PSI-UNK": "construction not classified; do not assume a tree head",
        },
        profile_note:
          "merkle_reproducible says whether a third party can recompute this row's merkle_root from published data alone. merkle_reproduction says how. A PSI-W1 or PSI-B1 row marked reproducible has had its root recomputed over the published leaves and matched.",
      };
      return new Response(JSON.stringify(manifest, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
      });
    }

    return new Response(lines, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "public, max-age=30",
        "X-Apex-Body-SHA256": bodyHash,
        "X-Apex-Latest-Sequence": String(latestSeq ?? ""),
        "X-Apex-Issuer-Key": ISSUER_KEY_ID,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
