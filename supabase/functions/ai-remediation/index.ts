// ═══════════════════════════════════════════════════════════════════════
// APEX — AI Auto-Remediation Engine
// When compliance drops, generates EU AI Act-mapped remediation plans
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCaller } from "../_shared/caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EU_AI_ACT_ARTICLES = [
  { number: "Article 5", title: "Prohibited AI Practices", risk: "critical", actions: ["Audit all AI systems for prohibited use cases (social scoring, subliminal manipulation)", "Document exemption justifications for law enforcement uses", "Implement real-time monitoring for prohibited pattern detection"] },
  { number: "Article 6", title: "Classification of High-Risk AI", risk: "high", actions: ["Classify all AI systems using Annex III risk taxonomy", "Document classification rationale for each system", "Register high-risk systems in the EU database"] },
  { number: "Article 9", title: "Risk Management System", risk: "high", actions: ["Establish continuous risk assessment framework", "Document known and foreseeable risks per system", "Implement risk mitigation measures with measurable KPIs"] },
  { number: "Article 10", title: "Data Governance", risk: "high", actions: ["Audit training datasets for bias and representativeness", "Implement data quality metrics and monitoring", "Document data provenance and processing pipelines"] },
  { number: "Article 12", title: "Record-Keeping", risk: "medium", actions: ["Enable automatic logging of AI system operations", "Ensure logs are retained for minimum required period", "Implement tamper-proof audit trail mechanisms"] },
  { number: "Article 13", title: "Transparency", risk: "high", actions: ["Create user-facing documentation for all AI systems", "Implement interpretability features for high-risk outputs", "Provide clear disclosure of AI-generated content"] },
  { number: "Article 14", title: "Human Oversight", risk: "critical", actions: ["Designate qualified human overseers for each high-risk system", "Implement human-in-the-loop controls for critical decisions", "Create escalation procedures for override scenarios"] },
  { number: "Article 15", title: "Accuracy & Robustness", risk: "high", actions: ["Establish accuracy benchmarks per AI system", "Implement adversarial testing and red-teaming", "Deploy monitoring for model drift and performance degradation"] },
  { number: "Article 52", title: "Transparency for Users", risk: "medium", actions: ["Label all AI-generated content clearly", "Notify users when interacting with AI systems", "Implement deepfake detection and disclosure"] },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const body = await req.json().catch(() => ({}));
    const { silo_id, silo_name, current_score, use_ai } = body;

    if (!silo_id || typeof silo_id !== "string" || !/^[0-9a-f-]{36}$/i.test(silo_id)) {
      return new Response(JSON.stringify({ error: "silo_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only internal calls, admins, or members assigned to this silo may read its data.
    const caller = await resolveCaller(req, supabase);
    let allowed = caller.service || caller.isAdmin;
    if (!allowed && caller.userId) {
      const { data: assignment } = await supabase
        .from("silo_assignments")
        .select("id")
        .eq("user_id", caller.userId)
        .eq("silo_id", silo_id)
        .eq("is_active", true)
        .limit(1);
      allowed = !!assignment && assignment.length > 0;
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Not authorized for this silo" }), {
        status: caller.userId ? 403 : 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get silo data for context
    const { data: siloRecords } = await supabase
      .from("silo_data")
      .select("*")
      .eq("silo_id", silo_id)
      .order("compliance_score", { ascending: true })
      .limit(10);

    const score = current_score ?? (siloRecords && siloRecords.length > 0
      ? Math.round(siloRecords.reduce((s: number, r: any) => s + (Number(r.compliance_score) || 0), 0) / siloRecords.length)
      : 50);

    // Determine which articles need remediation based on score
    const urgencyLevel = score < 30 ? "critical" : score < 50 ? "high" : score < 70 ? "medium" : "low";
    
    const relevantArticles = EU_AI_ACT_ARTICLES.filter(a => {
      if (urgencyLevel === "critical") return true;
      if (urgencyLevel === "high") return a.risk === "critical" || a.risk === "high";
      if (urgencyLevel === "medium") return a.risk === "critical" || a.risk === "high" || a.risk === "medium";
      return a.risk === "critical";
    });

    // Build remediation plan
    const plan = {
      silo_id,
      silo_name: silo_name || "Unknown Silo",
      current_score: score,
      urgency_level: urgencyLevel,
      generated_at: new Date().toISOString(),
      target_score: Math.min(score + 30, 95),
      estimated_days: urgencyLevel === "critical" ? 14 : urgencyLevel === "high" ? 30 : 60,
      articles: relevantArticles.map((a, i) => ({
        ...a,
        priority: i + 1,
        deadline_days: urgencyLevel === "critical" ? 7 + i * 3 : 14 + i * 7,
        status: "pending",
      })),
      ai_analysis: null as string | null,
    };

    // If AI analysis requested, use Gemini for deeper analysis
    if (use_ai) {
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (GEMINI_API_KEY) {
        const lowScoreRecords = (siloRecords || []).slice(0, 5).map((r: any) => `${r.title}: ${r.compliance_score}%`).join(", ");
        
        const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            messages: [{
              role: "user",
              content: `You are an EU AI Act compliance expert. A "${silo_name}" industry silo has a compliance score of ${score}%. Low-scoring records: ${lowScoreRecords || "none available"}. 

Provide a concise 3-paragraph remediation analysis:
1. Root cause assessment (what's likely failing)
2. Priority actions (top 3 things to fix immediately)  
3. Timeline and expected score improvement

Be specific to the ${silo_name} industry. Keep it under 200 words.`
            }],
            max_tokens: 400,
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          plan.ai_analysis = aiData.choices?.[0]?.message?.content || null;
        }
      }
    }

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("ai-remediation error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
