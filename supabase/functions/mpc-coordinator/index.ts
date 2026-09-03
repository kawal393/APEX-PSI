// ═══════════════════════════════════════════════════════════════════════
// APEX ENGINE — MPC Coordinator
// Orchestrates 3-node verification network with 2-of-3 threshold
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const THRESHOLD = 2; // 2-of-3 required for consensus

async function hashSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

interface NodeResult {
  node_id: string;
  commit_id: string;
  hash_valid: boolean;
  leaf_valid: boolean;
  compliant: boolean;
  violation_found: string | null;
  node_signature: string;
  verification_time_ms: number;
  timestamp: string;
  error?: string;
}

async function callNode(baseUrl: string, nodeName: string, payload: object): Promise<NodeResult> {
  try {
    const response = await fetch(`${baseUrl}/functions/v1/mpc-node-${nodeName.toLowerCase()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        node_id: nodeName.toUpperCase(),
        commit_id: "",
        hash_valid: false,
        leaf_valid: false,
        compliant: false,
        violation_found: null,
        node_signature: "",
        verification_time_ms: 0,
        timestamp: new Date().toISOString(),
        error: `HTTP ${response.status}`,
      };
    }

    return await response.json();
  } catch (e: any) {
    return {
      node_id: nodeName.toUpperCase(),
      commit_id: "",
      hash_valid: false,
      leaf_valid: false,
      compliant: false,
      violation_found: null,
      node_signature: "",
      verification_time_ms: 0,
      timestamp: new Date().toISOString(),
      error: e.message,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = performance.now();

  try {
    const body = await req.json();
    const { commit_id } = body;

    if (!commit_id) {
      return new Response(JSON.stringify({ error: "Missing commit_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch commit data
    const { data: commit, error: fetchError } = await supabase
      .from("gallows_ledger")
      .select("*")
      .eq("commit_id", commit_id)
      .single();

    if (fetchError || !commit) {
      return new Response(JSON.stringify({ error: `Commit ${commit_id} not found` }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nodePayload = {
      commit_id: commit.commit_id,
      action: commit.action,
      predicate_id: commit.predicate_id,
      commit_hash: commit.commit_hash,
      merkle_leaf_hash: commit.merkle_leaf_hash,
      created_at: commit.created_at,
    };

    // Call all 3 nodes in parallel
    const [alpha, beta, gamma] = await Promise.all([
      callNode(supabaseUrl, "alpha", nodePayload),
      callNode(supabaseUrl, "beta", nodePayload),
      callNode(supabaseUrl, "gamma", nodePayload),
    ]);

    const nodeResults = [alpha, beta, gamma];
    const validNodes = nodeResults.filter(n => !n.error);
    const hashConsensus = validNodes.filter(n => n.hash_valid).length;
    const leafConsensus = validNodes.filter(n => n.leaf_valid).length;
    const complianceVotes = validNodes.filter(n => n.compliant).length;
    const blockVotes = validNodes.filter(n => !n.compliant).length;

    // 2-of-3 threshold consensus
    const hashVerified = hashConsensus >= THRESHOLD;
    const leafVerified = leafConsensus >= THRESHOLD;
    const compliant = complianceVotes >= THRESHOLD;
    const consensusReached = validNodes.length >= THRESHOLD;

    // Find violation (majority vote)
    const violations = validNodes.filter(n => n.violation_found).map(n => n.violation_found);
    const violationFound = violations.length > 0 ? violations[0] : null;

    // Generate consensus signature (hash of all node signatures)
    const consensusInput = nodeResults.map(n => n.node_signature || "FAILED").join("|");
    const consensusSignature = await hashSHA256(consensusInput);

    const mpcVotes = nodeResults.map(n => ({
      node_id: n.node_id,
      hash_valid: n.hash_valid,
      leaf_valid: n.leaf_valid,
      compliant: n.compliant,
      violation_found: n.violation_found,
      signature: n.node_signature,
      time_ms: n.verification_time_ms,
      error: n.error || null,
    }));

    const totalTimeMs = Math.round((performance.now() - t0) * 100) / 100;

    return new Response(JSON.stringify({
      success: true,
      commit_id,
      consensus_reached: consensusReached,
      threshold: `${THRESHOLD}-of-3`,
      hash_verified: hashVerified,
      leaf_verified: leafVerified,
      compliant,
      violation_found: violationFound,
      consensus_signature: consensusSignature,
      nodes_responded: validNodes.length,
      nodes_total: 3,
      mpc_votes: mpcVotes,
      total_time_ms: totalTimeMs,
      engine: "APEX MPC Coordinator v1.0",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Coordinator error: " + err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
