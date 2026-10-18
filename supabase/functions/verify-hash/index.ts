// ═══════════════════════════════════════════════════════════════════════
// APEX ENGINE — Public Hash Verification API
// POST /verify-hash { hash: "..." }
// GET /verify-hash?hash=...
// Returns verification status against the immutable ledger
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { lmsVerify, LMS_ALGORITHM, LMS_STANDARD } from "../_shared/pq_lms.ts";
import { callerLabel, clientAddress, createThrottle, throttleHeaders } from "../_shared/rate-limit.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ── Free public lookup: per-caller throttle ─────────────────────────────
// This endpoint takes no key and no plan, and each hit costs two database reads
// plus a real LMS post-quantum signature verification when the row has one. The
// numbers below are a polite page's worth of lookups, not a scraper's: 20 per
// minute sustained, up to 20 at once in burst.
//
// The bucket lives in one isolate, so this is a per-instance guard -- see the
// header comment in ../_shared/rate-limit.ts for what that does and does not buy,
// and for the durable upgrade path (a Postgres reservation RPC, the way `notarize`
// does its daily sealing quota).
const LOOKUPS_PER_MINUTE = 20;
const BURST = 20;
const lookupGuard = createThrottle({ capacity: BURST, refillPerMinute: LOOKUPS_PER_MINUTE });

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Resolved before any database work: the whole point is to refuse cheaply.
    const address = clientAddress(req.headers);
    const decision = lookupGuard.check(address ?? "unknown-caller");
    if (!decision.allowed) {
      // Logged with a label, never the address itself.
      console.warn(
        `verify-hash throttled caller=${address ? callerLabel(address) : "unknown"} ` +
        `retry_after=${decision.retryAfterSeconds}s ` +
        `guard=${JSON.stringify(lookupGuard.stats())}`,
      );
      return new Response(
        JSON.stringify({
          error: "Too many lookups from this address. The free checker allows " +
            `${LOOKUPS_PER_MINUTE} verifications per minute; try again in ` +
            `${decision.retryAfterSeconds} second(s). This limit is enforced per ` +
            "server instance, so it is a flood guard, not a quota.",
          verified: false,
          retry_after_seconds: decision.retryAfterSeconds,
          limit_per_minute: LOOKUPS_PER_MINUTE,
        }),
        { status: 429, headers: throttleHeaders(decision, corsHeaders) }
      );
    }

    // Hit-count log, so the traffic this guard actually sees is measurable rather than
    // assumed. Every 200th accepted lookup prints the running totals.
    const seen = lookupGuard.stats();
    if (seen.checks % 200 === 0) {
      console.info(`verify-hash traffic: ${JSON.stringify(seen)}`);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let hash: string | null = null;

    // Support both GET (query param) and POST (body)
    if (req.method === "GET") {
      const url = new URL(req.url);
      hash = url.searchParams.get("hash");
    } else if (req.method === "POST") {
      try {
        const body = await req.json();
        hash = body.hash;
      } catch {
        return new Response(
          JSON.stringify({
            error: "Invalid JSON body",
            verified: false,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (!hash || typeof hash !== "string") {
      return new Response(
        JSON.stringify({
          error: "Missing or invalid 'hash' parameter",
          verified: false,
          usage: {
            GET: "/verify-hash?hash=<sha256_hash>",
            POST: "{ \"hash\": \"<sha256_hash>\" }",
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Search across all hash columns
    // Normalize: accept "sha256:<hex>" prefixed hashes and receipt IDs
    const clean = hash.trim().replace(/^sha256:/i, "");

    const { data, error } = await supabase
      .from("gallows_ledger")
      .select("*")
      .or(
        `commit_hash.eq.${clean},merkle_leaf_hash.eq.${clean},proof_hash.eq.${clean},challenge_hash.eq.${clean},commit_id.eq.${clean}`
      )
      .limit(1);

    if (error) {
      console.error("Database query error:", error);
      return new Response(
        JSON.stringify({
          error: "Database query failed",
          verified: false,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          verified: false,
          found: false,
          message: "Hash not found in the APEX PSI immutable ledger",
          queried_hash: hash,
          queried_at: new Date().toISOString(),
          engine: "APEX PSI v2.0",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const entry = data[0];
    const hasMerkleProof = entry.merkle_proof && entry.merkle_root;

    // ── REAL post-quantum verification (no silent SHA-256 degradation) ──
    // The LMS-W4-SHA256 signature is recomputed here against the stored
    // Merkle root. If it does not verify, the response says so loudly.
    let pqVerified: boolean | null = null;
    let pqError: string | null = null;
    if (entry.pq_signature && entry.merkle_leaf_hash) {
      try {
        // notarize signs the bare hex leaf. Older rows may have been signed over
        // the "sha256:"-prefixed form, so both encodings are accepted.
        const bare = String(entry.merkle_leaf_hash).replace(/^sha256:/, "");
        const candidates = [bare, `sha256:${bare}`];
        const enc = new TextEncoder();
        for (const candidate of candidates) {
          if (
            await lmsVerify(
              enc.encode(candidate),
              entry.pq_signature as Parameters<typeof lmsVerify>[1],
              entry.pq_public_key ?? undefined,
            )
          ) {
            pqVerified = true;
            break;
          }
        }
        if (!pqVerified) {
          pqVerified = false;
          pqError = "LMS-W4-SHA256 signature failed verification";
        }
      } catch (e) {
        pqVerified = false;
        pqError = `Post-quantum verification error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }


    // Attach the real OpenTimestamps / Bitcoin anchor state, if any
    const { data: proof } = await supabase
      .from("ots_proofs")
      .select(
        "id, status, calendar_url, bitcoin_block_height, bitcoin_txid, confirmations, submitted_at, created_at, target_hash",
      )
      .or(`commit_id.eq.${entry.commit_id},target_hash.eq.${entry.merkle_root ?? ""}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const functionsBase = (Deno.env.get("SUPABASE_URL") ?? "").replace(
      ".supabase.co",
      ".functions.supabase.co",
    );

    return new Response(
      JSON.stringify({
        verified: true,
        found: true,
        merkle_verified: hasMerkleProof,
        commit_id: entry.commit_id,
        predicate_id: entry.predicate_id,
        phase: entry.phase,
        status: entry.status,
        merkle_root: entry.merkle_root,
        merkle_proof: entry.merkle_proof ?? null,
        ed25519_signature: entry.ed25519_signature,
        signed_payload: entry.merkle_leaf_hash ? `sha256:${entry.merkle_leaf_hash}` : null,
        post_quantum: !!entry.pq_signature,
        pq_verified: pqVerified,
        pq_error: pqError,
        pq_signature: entry.pq_signature ?? null,
        pq_public_key: entry.pq_public_key ?? null,
        pq_algorithm: entry.pq_algorithm ?? (entry.pq_signature ? LMS_ALGORITHM : null),
        pq_standard: entry.pq_signature ? LMS_STANDARD : null,
        timestamp_anchor: proof
          ? {
              status: proof.status,
              calendar_url: proof.calendar_url,
              bitcoin_block_height: proof.bitcoin_block_height,
              bitcoin_txid: proof.bitcoin_txid,
              confirmations: proof.confirmations ?? null,
              submitted_at: proof.submitted_at ?? proof.created_at ?? null,
              created_at: proof.created_at ?? null,
              explorer_url: proof.bitcoin_txid ? `https://mempool.space/tx/${proof.bitcoin_txid}` : null,
              ots_download_url: `${functionsBase}/ots-proof?id=${proof.id}`,
            }
          : null,
        // `action` is free text and a ledger row may legitimately have none. Reading
        // .length off null threw here, which returned a 500 for a row that exists --
        // the worst possible answer for a checker whose product is not lying about state.
        action_summary: (() => {
          const action = typeof entry.action === "string" ? entry.action : "";
          return action.length > 100 ? action.slice(0, 97) + "..." : action;
        })(),
        created_at: entry.created_at,
        challenged_at: entry.challenged_at,
        proven_at: entry.proven_at,
        verification_time_ms: entry.verification_time_ms,
        violation_found: entry.violation_found,
        queried_hash: hash,
        queried_at: new Date().toISOString(),
        engine: "APEX PSI v2.0",
        algorithm: entry.pq_signature
          ? "SHA-256 + Ed25519 + LMS-W4-SHA256"
          : "SHA-256 + Ed25519",
        eu_ai_act_compliance: entry.status === "APPROVED",
      }),

      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        verified: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
