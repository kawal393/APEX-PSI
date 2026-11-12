import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user is authenticated
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // Create client with user's token to verify auth
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized. Please sign in." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Admin only: these records contain every visitor conversation and lead.
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get conversations summary
    const { data: conversations, count: totalConversations } = await supabase
      .from("chat_conversations")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false })
      .limit(50);

    // Get total messages
    const { count: totalMessages } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true });

    // Get leads (conversations with email)
    const { data: leads } = await supabase
      .from("chat_conversations")
      .select("id, lead_name, lead_email, lead_company, created_at")
      .not("lead_email", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    // Get knowledge gaps
    const { data: gaps } = await supabase
      .from("chat_knowledge_gaps")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    // Get feedback summary
    const { data: feedbackData } = await supabase
      .from("chat_feedback")
      .select("rating");

    const feedbackSummary = {
      total: feedbackData?.length || 0,
      positive: feedbackData?.filter(f => f.rating === "up").length || 0,
      negative: feedbackData?.filter(f => f.rating === "down").length || 0,
    };

    // Drip queue stats
    const { count: dripPending } = await supabase
      .from("drip_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: dripSent } = await supabase
      .from("drip_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent");

    const recentConversations = (conversations || []).map(c => ({
      id: c.id,
      visitor_id: c.visitor_id,
      message_count: c.message_count,
      lead_email: c.lead_email,
      lead_name: c.lead_name,
      lead_company: c.lead_company,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));

    return new Response(JSON.stringify({
      totalConversations: totalConversations || 0,
      totalMessages: totalMessages || 0,
      leads: leads || [],
      knowledgeGaps: gaps || [],
      feedback: feedbackSummary,
      recentConversations,
      drip: { pending: dripPending || 0, sent: dripSent || 0 },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-analytics error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
