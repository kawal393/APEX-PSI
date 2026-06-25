// Lattice Heartbeat — rolling 24h liveness + anomaly score for regulators / public consumers.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("gallows_ledger")
      .select("sequence_number, phase, violation_found, created_at")
      .gte("created_at", since)
      .order("sequence_number", { ascending: false });

    if (error) throw error;

    const rows = data ?? [];
    const total = rows.length;
    const violations = rows.filter((r) => r.violation_found && r.violation_found !== "none" && r.violation_found !== "").length;
    const committed = rows.filter((r) => r.phase === "COMMITTED" || r.phase === "PROVEN" || r.phase === "RATIFIED").length;
    const challenged = rows.filter((r) => r.phase === "CHALLENGED").length;

    // crude anomaly score: violation_ratio * 0.7 + challenge_ratio * 0.3
    const vr = total ? violations / total : 0;
    const cr = total ? challenged / total : 0;
    const anomaly = Math.min(1, vr * 0.7 + cr * 0.3);

    const latest = rows[0];
    const lastBeatMs = latest ? Date.now() - new Date(latest.created_at).getTime() : null;

    const status =
      lastBeatMs === null ? "idle"
      : lastBeatMs < 5 * 60_000 ? "live"
      : lastBeatMs < 60 * 60_000 ? "warm"
      : "stale";

    const body = {
      protocol: "apex-psi/lattice-heartbeat",
      version: "1.0",
      generated_at: new Date().toISOString(),
      window_hours: 24,
      status,
      last_beat_seconds: lastBeatMs !== null ? Math.round(lastBeatMs / 1000) : null,
      latest_sequence: latest?.sequence_number ?? null,
      totals: { entries: total, committed, challenged, violations },
      anomaly_score: Number(anomaly.toFixed(4)),
      verify_via: "https://apex-psi.lovable.app/verify",
    };

    return new Response(JSON.stringify(body, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=15" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
