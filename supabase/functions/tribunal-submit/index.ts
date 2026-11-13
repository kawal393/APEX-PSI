import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { commit_id, verdict, rationale, auditor_signature } = await req.json();

    if (!commit_id || !verdict || !rationale) {
      return new Response(JSON.stringify({ error: "Missing required fields: commit_id, verdict, rationale" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["approve", "reject", "abstain"].includes(verdict)) {
      return new Response(JSON.stringify({ error: "Verdict must be: approve, reject, or abstain" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is a registered auditor
    const { data: auditor, error: auditorError } = await serviceClient
      .from("tribunal_auditors")
      .select("id, status, auditor_name, organization")
      .eq("user_id", user.id)
      .single();

    if (auditorError || !auditor) {
      return new Response(JSON.stringify({ error: "Not a registered tribunal auditor" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (auditor.status !== "active") {
      return new Response(JSON.stringify({ error: "Auditor status is suspended" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the commit exists in the ledger
    const { data: commit, error: commitError } = await serviceClient
      .from("gallows_ledger")
      .select("commit_id, phase, status")
      .eq("commit_id", commit_id)
      .single();

    if (commitError || !commit) {
      return new Response(JSON.stringify({ error: "Commit not found in ledger" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert or update the review (upsert on commit_id + auditor_id)
    const { error: insertError } = await serviceClient
      .from("tribunal_reviews")
      .upsert({
        commit_id,
        auditor_id: auditor.id,
        verdict,
        rationale,
        auditor_signature: auditor_signature || null,
      }, { onConflict: "commit_id,auditor_id" });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to submit review" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if ratification threshold is met (3-of-5)
    const { data: reviews } = await serviceClient
      .from("tribunal_reviews")
      .select("verdict, auditor_signature, created_at")
      .eq("commit_id", commit_id);

    const approvals = (reviews || []).filter((r) => r.verdict === "approve");
    const rejections = (reviews || []).filter((r) => r.verdict === "reject");
    const totalVotes = (reviews || []).length;

    // ── SLA CHECK: 48h auto-escalation ──
    // If the commit has been in VERIFIED state for >48h without 3 votes,
    // the quorum verdict stands with a TRIBUNAL_TIMEOUT flag.
    let slaTimeout = false;
    if (commit) {
      const { data: ledgerEntry } = await serviceClient
        .from("gallows_ledger")
        .select("created_at, ratification_hash")
        .eq("commit_id", commit_id)
        .single();
      
      if (ledgerEntry && !ledgerEntry.ratification_hash) {
        const commitAge = Date.now() - new Date(ledgerEntry.created_at).getTime();
        const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
        if (commitAge > FORTY_EIGHT_HOURS && totalVotes < 3) {
          slaTimeout = true;
        }
      }
    }

    let ratified = false;
    let ratificationHash: string | null = null;

    if (approvals.length >= 3) {
      // Generate ratification hash = SHA-256 of concatenated approval signatures
      const sigConcat = approvals
        .map((a) => a.auditor_signature || "unsigned")
        .sort()
        .join("|");
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(sigConcat));
      ratificationHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Update ledger with ratification
      await serviceClient
        .from("gallows_ledger")
        .update({
          ratification_hash: ratificationHash,
          ratified_at: new Date().toISOString(),
          tribunal_votes_approve: approvals.length,
          tribunal_votes_reject: rejections.length,
        })
        .eq("commit_id", commit_id);

      ratified = true;
    } else if (slaTimeout) {
      // SLA TIMEOUT: quorum verdict stands, mark as auto-escalated
      const timeoutSig = `TRIBUNAL_TIMEOUT|${commit_id}|${new Date().toISOString()}`;
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(timeoutSig));
      ratificationHash = "TIMEOUT_" + Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      await serviceClient
        .from("gallows_ledger")
        .update({
          ratification_hash: ratificationHash,
          ratified_at: new Date().toISOString(),
          tribunal_votes_approve: approvals.length,
          tribunal_votes_reject: rejections.length,
        })
        .eq("commit_id", commit_id);

      ratified = true;
    } else {
      // Update vote counts
      await serviceClient
        .from("gallows_ledger")
        .update({
          tribunal_votes_approve: approvals.length,
          tribunal_votes_reject: rejections.length,
        })
        .eq("commit_id", commit_id);
    }

    return new Response(JSON.stringify({
      success: true,
      auditor: auditor.auditor_name,
      organization: auditor.organization,
      verdict,
      totalVotes,
      approvals: approvals.length,
      rejections: rejections.length,
      ratified,
      ratificationHash,
      slaTimeout,
      threshold: "3-of-5",
      slaPolicy: "48h auto-escalation: quorum verdict stands if <3 votes within 48 hours",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Tribunal submit error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
