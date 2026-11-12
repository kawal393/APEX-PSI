import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { isInternalCall, resolveCaller } from "../_shared/caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Only the scheduler, another backend function, or an admin may run due schedules.
  if (!isInternalCall(req)) {
    const caller = await resolveCaller(req);
    if (!caller.isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    // Find all schedules that are due
    const now = new Date().toISOString();
    const { data: schedules, error } = await supabase
      .from("monitoring_schedules")
      .select("*")
      .eq("enabled", true)
      .or(`next_run.is.null,next_run.lte.${now}`);

    if (error) throw error;
    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    for (const schedule of schedules) {
      try {
        // Call run-verification internally for this user
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const res = await fetch(`${supabaseUrl}/functions/v1/run-verification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Use service role to generate a token for the user
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
        });

        // Update schedule
        const nextRun = new Date();
        if (schedule.frequency === "daily") {
          nextRun.setDate(nextRun.getDate() + 1);
        } else {
          nextRun.setDate(nextRun.getDate() + 7);
        }

        await supabase
          .from("monitoring_schedules")
          .update({
            last_run: now,
            next_run: nextRun.toISOString(),
          })
          .eq("id", schedule.id);

        processed++;
      } catch (e) {
        console.error(`Failed to process schedule ${schedule.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ processed, total: schedules.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
