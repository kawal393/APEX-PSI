import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-platform-key, x-node-id, x-request-source",
};

const NODE_CONFIG = {
  id: "apex-psi",
  name: "APEX PSI",
  role: "Compliance Engine & Zero-Knowledge Audit Layer",
  projectId: "qhtntebpcribjiwrdtdd",
};

const PEER_NODES = [
  {
    id: "apex-bounty",
    name: "APEX BOUNTY",
    role: "Intelligence Hub & Orchestrator",
    url: "https://uvhpmohzdwbbsldotszy.supabase.co/functions/v1/sovereign-lattice",
  },
  {
    id: "apex-infrastructure",
    name: "APEX INFRASTRUCTURE",
    role: "Operations & Infrastructure Management",
    url: "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/sovereign-lattice",
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "node-status";

  // ── ACTION: ping (unauthenticated) ──────────────────────────────────────
  if (action === "ping") {
    return json({
      status: "alive",
      node: NODE_CONFIG.id,
      name: NODE_CONFIG.name,
      role: NODE_CONFIG.role,
      timestamp: now(),
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  // ── Auth gate ─────────────────────────────────────────────────────────────
  const platformKey = req.headers.get("x-platform-key") || req.headers.get("X-Platform-Key");
  const latticeKey = Deno.env.get("APEX_LATTICE_KEY");
  const sourceNode = req.headers.get("x-node-id") || req.headers.get("X-Node-Id") || "unknown";

  let isAuthorized = false;

  if (platformKey && latticeKey && platformKey === latticeKey) {
    isAuthorized = true;
  }

  const authHeader = req.headers.get("Authorization");
  if (!isAuthorized && authHeader?.startsWith("Bearer ")) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await userClient.auth.getClaims(token);
    if (claimsData?.claims?.sub) {
      isAuthorized = true;
    }
  }

  // Read-only public transparency view: the lattice status board is a public
  // liveness dashboard, so it is readable without credentials.
  const isPublicRead = action === "lattice-status";

  if (!isAuthorized && !isPublicRead) {
    return json({ error: "Unauthorized — valid X-Platform-Key or Bearer token required" }, 401);
  }


  // ── ACTION: node-status ───────────────────────────────────────────────────
  if (action === "node-status") {
    let metrics: Record<string, unknown> = {};
    try {
      const [ledgerRes, verRes, complianceRes, provenRes] = await Promise.all([
        serviceClient.from("gallows_ledger").select("id", { count: "exact", head: true }),
        serviceClient.from("verification_history").select("id", { count: "exact", head: true }),
        serviceClient.from("compliance_results").select("id", { count: "exact", head: true }),
        serviceClient.from("gallows_ledger").select("id", { count: "exact", head: true }).eq("phase", "PROVEN"),
      ]);
      metrics = {
        totalLedgerEntries: ledgerRes.count ?? 0,
        totalVerifications: verRes.count ?? 0,
        totalComplianceRecords: complianceRes.count ?? 0,
        totalProvenEntries: provenRes.count ?? 0,
        source: "direct-db",
      };
    } catch {
      metrics = { note: "Metrics unavailable" };
    }

    return json({
      node: NODE_CONFIG.id,
      name: NODE_CONFIG.name,
      role: NODE_CONFIG.role,
      domain: "digital-gallows.apex-infrastructure.com",
      supabaseProjectId: NODE_CONFIG.projectId,
      status: "online",
      timestamp: now(),
      metrics,
      requestedBy: sourceNode,
    });
  }

  // ── ACTION: ingest-event ──────────────────────────────────────────────────
  if (action === "ingest-event" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const { source_node, event_type, title, description, severity, payload, timestamp } = body;

    try {
      await serviceClient.from("lattice_config").insert({
        key: `event:${source_node || sourceNode}:${Date.now()}`,
        value: JSON.stringify({
          source_node: source_node || sourceNode,
          event_type, title, description, severity, payload,
          timestamp: timestamp || now(),
          receivedAt: now(),
        }),
      });
    } catch { /* ignore */ }

    // If it's a verification-trigger event, handle it
    if (event_type === "verification-trigger" && payload?.user_id && payload?.article_number) {
      try {
        await serviceClient.from("verification_history").insert({
          user_id: payload.user_id,
          article_number: payload.article_number,
          article_title: payload.article_title || "Cross-Node Verification",
          status: "pending",
        });
      } catch { /* ignore */ }
    }

    return json({ success: true, message: "Event ingested", node: NODE_CONFIG.id, timestamp: now() });
  }

  // ── ACTION: lattice-heartbeat ─────────────────────────────────────────────
  if (action === "lattice-heartbeat") {
    const heartbeat = {
      node: NODE_CONFIG.id,
      name: NODE_CONFIG.name,
      role: NODE_CONFIG.role,
      status: "online",
      timestamp: now(),
      uptime: performance.now(),
    };

    // Store heartbeat locally
    try {
      await serviceClient.from("lattice_config").insert({
        key: `heartbeat:${NODE_CONFIG.id}`,
        value: JSON.stringify(heartbeat),
      });
    } catch { /* ignore */ }

    // If POST, broadcast to hub
    if (req.method === "POST") {
      const hubUrl = PEER_NODES.find(n => n.id === "apex-bounty")?.url;
      if (hubUrl && latticeKey) {
        fetch(`${hubUrl}?action=ingest-event`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Platform-Key": latticeKey,
            "X-Node-Id": NODE_CONFIG.id,
          },
          body: JSON.stringify({
            source_node: NODE_CONFIG.id,
            event_type: "heartbeat",
            title: `${NODE_CONFIG.name} heartbeat`,
            severity: "info",
            payload: heartbeat,
            timestamp: now(),
          }),
        }).catch(() => { /* ignore */ });
      }
    }

    return json(heartbeat);
  }

  // ── ACTION: cross-node-sync ───────────────────────────────────────────────
  if (action === "cross-node-sync") {
    const results: Record<string, unknown> = {};

    for (const peer of PEER_NODES) {
      if (peer.id === NODE_CONFIG.id) continue;
      try {
        const resp = await fetch(`${peer.url}?action=ping`, {
          headers: { "X-Node-Id": NODE_CONFIG.id },
          signal: AbortSignal.timeout(4000),
        });
        results[peer.id] = resp.ok ? await resp.json() : { status: "unreachable", httpStatus: resp.status };
      } catch {
        results[peer.id] = { status: "offline", error: "Connection failed" };
      }
    }

    // Store sync state
    try {
      await serviceClient.from("lattice_config").insert({
        key: `sync:${NODE_CONFIG.id}:latest`,
        value: JSON.stringify({ results, timestamp: now() }),
      });
    } catch { /* ignore */ }

    return json({
      node: NODE_CONFIG.id,
      syncResults: results,
      timestamp: now(),
    });
  }

  // ── ACTION: verification-trigger ──────────────────────────────────────────
  if (action === "verification-trigger" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const { user_id, article_number, article_title, compliance_result_id } = body;

    if (!user_id || !article_number) {
      return json({ error: "user_id and article_number required" }, 400);
    }

    const { data, error } = await serviceClient.from("verification_history").insert({
      user_id,
      article_number,
      article_title: article_title || "Cross-Node Triggered Verification",
      status: "pending",
      compliance_result_id: compliance_result_id || null,
    }).select().single();

    return json({
      success: !error,
      verification: data,
      error: error?.message,
      node: NODE_CONFIG.id,
      timestamp: now(),
    });
  }

  // ── ACTION: ledger-snapshot ───────────────────────────────────────────────
  if (action === "ledger-snapshot") {
    const { data } = await serviceClient
      .from("gallows_public_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    return json({ node: NODE_CONFIG.id, ledger: data ?? [], timestamp: now() });
  }

  // ── ACTION: lattice-status (full mesh status for dashboard) ───────────────
  if (action === "lattice-status") {
    const nodes: Record<string, unknown>[] = [];

    // Self status
    nodes.push({
      id: NODE_CONFIG.id,
      name: NODE_CONFIG.name,
      role: NODE_CONFIG.role,
      status: "online",
      timestamp: now(),
      isSelf: true,
    });

    // Ping peers
    for (const peer of PEER_NODES) {
      if (peer.id === NODE_CONFIG.id) {
        continue; // skip self
      }
      try {
        const resp = await fetch(`${peer.url}?action=ping`, {
          headers: { "X-Node-Id": NODE_CONFIG.id },
          signal: AbortSignal.timeout(4000),
        });
        if (resp.ok) {
          const data = await resp.json();
          nodes.push({ ...data, id: peer.id, name: peer.name, role: peer.role, status: "online" });
        } else {
          nodes.push({ id: peer.id, name: peer.name, role: peer.role, status: "degraded" });
        }
      } catch {
        nodes.push({ id: peer.id, name: peer.name, role: peer.role, status: "offline" });
      }
    }

    const allOnline = nodes.every((n) => n.status === "online");

    // Get recent events
    const { data: events } = await serviceClient
      .from("lattice_config")
      .select("*")
      .like("key", "event:%")
      .order("created_at", { ascending: false })
      .limit(20);

    return json({
      latticeHealth: allOnline ? "OPTIMAL" : "DEGRADED",
      triVerified: allOnline,
      nodes,
      recentEvents: events ?? [],
      timestamp: now(),
    });
  }

  return json({
    error: "Unknown action",
    availableActions: [
      "ping", "node-status", "ingest-event", "lattice-heartbeat",
      "cross-node-sync", "verification-trigger", "ledger-snapshot", "lattice-status",
    ],
    node: NODE_CONFIG.id,
  }, 400);
});

function now() {
  return new Date().toISOString();
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
