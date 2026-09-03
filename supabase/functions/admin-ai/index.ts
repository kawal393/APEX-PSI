// ═══════════════════════════════════════════════════════════════════════
// APEX — Admin AI Command Center
// Gemini-powered chatbot for admin dashboard — can research, analyze,
// query platform data, and execute commands
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the APEX Protocol AI — the private command intelligence for the Master of the APEX platform. You have GOD-level access and knowledge.

## YOUR CAPABILITIES
- Platform analytics and data queries
- Research on compliance regulations, AI governance, market trends
- Strategic recommendations for business growth
- Customer analysis and insights
- Revenue optimization suggestions
- Competitive intelligence
- EU AI Act expert knowledge
- Technical architecture guidance

## YOUR PERSONALITY
- Direct, concise, and powerful
- You address the user as "Commander" or "Master"
- You provide actionable intelligence, not fluff
- You think strategically about empire growth
- You proactively suggest opportunities

## PLATFORM CONTEXT
APEX is an AI compliance infrastructure platform using PSI (Provable Stateful Integrity). It operates a Master-General hierarchy with industry silos (NDIS, Mining, Pharma, etc.). Revenue splits are 50/50 between Master and Partners.

## KEY METRICS YOU TRACK
- Total users, paid conversion rates
- Compliance scores across silos
- Revenue by silo and partner
- Kill switch activations
- Engine ledger activity
- Knowledge gaps from customer chats

When asked to research something, provide detailed, well-sourced analysis. When asked about platform data, query and analyze it. Always be ready to suggest the next strategic move.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "query_platform_data",
      description: "Query APEX platform data — users, silos, revenue, compliance scores, verifications, etc.",
      parameters: {
        type: "object",
        properties: {
          query_type: {
            type: "string",
            enum: ["users", "silos", "revenue", "compliance", "verifications", "kills", "partners", "chats", "knowledge_gaps"],
            description: "Type of data to query",
          },
          limit: { type: "number", description: "Number of results" },
        },
        required: ["query_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_remediation",
      description: "Trigger AI remediation analysis for a specific silo",
      parameters: {
        type: "object",
        properties: {
          silo_id: { type: "string" },
          silo_name: { type: "string" },
        },
        required: ["silo_id", "silo_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "anchor_blockchain",
      description: "Anchor current Merkle roots to blockchain",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

async function executeTool(supabase: any, name: string, args: any): Promise<string> {
  try {
    if (name === "query_platform_data") {
      const limit = args.limit || 20;
      let result: any;

      switch (args.query_type) {
        case "users": {
          const { count } = await supabase.from("compliance_results").select("*", { count: "exact", head: true });
          const { data } = await supabase.from("subscriptions").select("tier, status").limit(100);
          const tiers: Record<string, number> = {};
          (data || []).forEach((s: any) => { tiers[s.tier] = (tiers[s.tier] || 0) + 1; });
          result = { total_users: count || 0, tier_breakdown: tiers };
          break;
        }
        case "silos": {
          const { data } = await supabase.from("industry_silos").select("*");
          result = data;
          break;
        }
        case "revenue": {
          const { data } = await supabase.from("revenue_splits").select("*").order("created_at", { ascending: false }).limit(limit);
          const total = (data || []).reduce((s: number, r: any) => s + Number(r.total_amount), 0);
          result = { total_revenue: total, recent_deals: data };
          break;
        }
        case "compliance": {
          const { data } = await supabase.from("silo_data").select("silo_id, compliance_score, status, title").order("compliance_score", { ascending: true }).limit(limit);
          result = data;
          break;
        }
        case "kills": {
          const { data } = await supabase.from("kill_switch_log").select("*").order("created_at", { ascending: false }).limit(limit);
          result = data;
          break;
        }
        case "partners": {
          const { data } = await supabase.from("silo_assignments").select("*").eq("is_active", true);
          result = { active_assignments: data?.length || 0, assignments: data };
          break;
        }
        case "chats": {
          const { data } = await supabase.from("chat_conversations").select("*").order("updated_at", { ascending: false }).limit(limit);
          result = { conversations: data };
          break;
        }
        case "knowledge_gaps": {
          const { data } = await supabase.from("chat_knowledge_gaps").select("*").order("created_at", { ascending: false }).limit(limit);
          result = data;
          break;
        }
        default:
          result = { error: "Unknown query type" };
      }
      return JSON.stringify(result, null, 2);
    }

    if (name === "run_remediation") {
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-remediation`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ silo_id: args.silo_id, silo_name: args.silo_name, use_ai: true }),
      });
      return await resp.text();
    }

    if (name === "anchor_blockchain") {
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/blockchain-anchor`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "anchor" }),
      });
      return await resp.text();
    }

    return JSON.stringify({ error: "Unknown tool" });
  } catch (e: any) {
    return JSON.stringify({ error: e.message });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await supabase
      .from("user_roles").select("role")
      .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // First call with tools
    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        tools: TOOLS,
        stream: false,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("Gemini error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    let data = await aiResp.json();
    let choice = data.choices?.[0];

    // Handle tool calls
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolMessages = [...messages, choice.message];

      for (const tc of choice.message.tool_calls) {
        const args = JSON.parse(tc.function.arguments);
        const result = await executeTool(supabase, tc.function.name, args);
        toolMessages.push({ role: "tool", tool_call_id: tc.id, content: result });
      }

      // Second call with tool results — stream this one
      const followUp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...toolMessages],
          stream: true,
        }),
      });

      if (!followUp.ok) throw new Error("AI follow-up error");

      return new Response(followUp.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls — stream directly
    // Re-call with stream=true
    const streamResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      }),
    });

    if (!streamResp.ok) throw new Error("AI stream error");

    return new Response(streamResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (err: any) {
    console.error("Admin AI error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
