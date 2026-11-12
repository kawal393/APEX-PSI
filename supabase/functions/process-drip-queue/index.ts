import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isInternalCall } from "../_shared/caller.ts";

// This function processes pending drip emails from the drip_queue table.
// Call it periodically (e.g., via cron or manual trigger) to send scheduled emails.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Internal only: the hourly scheduler or another backend function.
  if (!isInternalCall(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pending drips that are due
    const { data: pendingDrips, error } = await supabase
      .from("drip_queue")
      .select("*")
      .eq("status", "pending")
      .lte("send_at", new Date().toISOString())
      .limit(50);

    if (error) throw error;
    if (!pendingDrips || pendingDrips.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const drip of pendingDrips) {
      try {
        // Call lead-drip to send the email
        const dripRes = await fetch(`${supabaseUrl}/functions/v1/lead-drip`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lead_email: drip.lead_email,
            lead_name: drip.lead_name,
            lead_company: drip.lead_company,
            conversation_id: drip.conversation_id,
            drip_index: drip.drip_index,
          }),
        });

        if (dripRes.ok) {
          await supabase.from("drip_queue")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", drip.id);
          processed++;
        } else {
          const errText = await dripRes.text();
          console.error(`Failed to send drip ${drip.id} (step ${drip.drip_index}):`, dripRes.status, errText.slice(0, 200));
          await supabase.from("drip_queue")
            .update({ status: "failed" })
            .eq("id", drip.id);
        }
      } catch (e) {
        console.error(`Error processing drip ${drip.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ processed, total: pendingDrips.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-drip-queue error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
