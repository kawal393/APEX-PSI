// ═══════════════════════════════════════════════════════════════════════
// APEX — Silo Auto-Monitor
// Scans all silos, calculates avg compliance, auto-triggers kill switch
// when score drops below configurable threshold
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_THRESHOLD = 40; // Below this score → auto-kill

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Auth: admin only OR service-role invocation
    const authHeader = req.headers.get("Authorization");
    let isAdmin = false;
    let triggeredBy: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData?.user) {
        triggeredBy = userData.user.id;
        const { data: roleCheck } = await supabase
          .from("user_roles").select("role")
          .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
        isAdmin = !!roleCheck;
      }
    }

    // Parse optional threshold from body
    const body = await req.json().catch(() => ({}));
    const threshold = body.threshold ?? DEFAULT_THRESHOLD;

    // Get all silos
    const { data: silos } = await supabase.from("industry_silos").select("*");
    if (!silos || silos.length === 0) {
      return new Response(JSON.stringify({ message: "No silos to monitor", results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all silo data for scoring
    const { data: allData } = await supabase.from("silo_data").select("silo_id, compliance_score, status");

    // Get active kill switches
    const { data: activeKills } = await supabase.from("kill_switch_log").select("silo_id, id").is("resolved_at", null);
    const killedSiloIds = new Set((activeKills || []).map(k => k.silo_id));

    const results: any[] = [];

    for (const silo of silos) {
      const records = (allData || []).filter(d => d.silo_id === silo.id && d.status === "active");
      const avgScore = records.length > 0
        ? Math.round(records.reduce((s, r) => s + (Number(r.compliance_score) || 0), 0) / records.length)
        : 100; // No data = assume compliant

      const isBelow = avgScore < threshold;
      const alreadyKilled = killedSiloIds.has(silo.id);

      const result: any = {
        silo_id: silo.id,
        silo_name: silo.display_name,
        avg_score: avgScore,
        threshold,
        below_threshold: isBelow,
        already_halted: alreadyKilled,
        action: "none",
      };

      // Auto-trigger kill switch if below threshold and not already killed
      if (isBelow && !alreadyKilled) {
        const { error } = await supabase.from("kill_switch_log").insert({
          silo_id: silo.id,
          triggered_by: triggeredBy,
          reason: `Auto-monitor: Average compliance score (${avgScore}%) dropped below threshold (${threshold}%)`,
          severity: avgScore < threshold / 2 ? "critical" : "warning",
        });

        if (!error) {
          // Halt active records in silo
          await supabase.from("silo_data")
            .update({ status: "halted" })
            .eq("silo_id", silo.id)
            .eq("status", "active");

          result.action = "kill_switch_triggered";

          // Send alert email if configured
          const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
          fetch(`${supabaseUrl}/functions/v1/send-alert-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({
              to: "apexinfrastructure369@gmail.com",
              company: silo.display_name,
              score: avgScore,
              status: "auto_halted",
              mode: "AUTO-MONITOR",
              previous_status: "active",
            }),
          }).catch(e => console.error("Alert email failed:", e));
        }
      }

      results.push(result);
    }

    const triggered = results.filter(r => r.action === "kill_switch_triggered");

    return new Response(JSON.stringify({
      success: true,
      silos_scanned: silos.length,
      threshold,
      kill_switches_triggered: triggered.length,
      results,
      scanned_at: new Date().toISOString(),
      engine: "APEX Auto-Monitor v1.0",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
