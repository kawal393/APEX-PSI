// APEX PSI — Lead Intent Scorer & Auto-Enroller
// Scans chat_conversations that captured a lead_email in the recent window,
// uses Gemini to classify enterprise vs curious intent, and enrolls
// high-intent leads into the lead-drip sequence (Resend delivery).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function scoreIntent(transcript: string, company: string): Promise<{
  intent: "enterprise" | "curious" | "spam";
  score: number;
  reason: string;
}> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a B2B sales intent classifier for APEX PSI (verifiable AI compliance, EU AI Act). Output strict JSON only: {\"intent\":\"enterprise|curious|spam\",\"score\":0-100,\"reason\":\"<1 sentence>\"}. Enterprise = decision-maker, regulated industry, real company, mentions compliance/AI/audit/regulator/procurement. Curious = student/hobbyist/vague. Spam = gibberish/promotion.",
        },
        {
          role: "user",
          content: `Company: ${company || "unknown"}\n\nTranscript:\n${transcript.slice(0, 4000)}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) throw new Error(`AI gateway ${resp.status}`);
  const data = await resp.json();
  const raw = (data.choices?.[0]?.message?.content ?? "{}")
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(raw);
}

async function sendCustomEmail(
  to: string,
  name: string,
  company: string,
  reason: string,
): Promise<void> {
  const resend = Deno.env.get("RESEND_API_KEY");
  if (!resend) return;
  const subject = `${name ? name + ", " : ""}your AI compliance path (5-min read)`;
  const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0a0b0f;color:#e8e0d0;">
  <h1 style="color:#d4a017;font-size:22px;margin:0 0 8px;">APEX PSI</h1>
  <p style="color:#8a7a5a;font-size:12px;margin:0 0 24px;">Verifiable AI Compliance · IETF draft-singh-psi-00</p>
  <p style="color:#e8e0d0;">Hi ${name || "there"},</p>
  <p style="color:#a89878;line-height:1.7;">
    I saw your conversation with our system about ${company || "your organization"}.
    Based on what you described, you're likely inside the EU AI Act enforcement window
    (Article 50 — August 2, 2026).
  </p>
  <p style="color:#a89878;line-height:1.7;">
    APEX PSI gives you <strong style="color:#e8e0d0;">cryptographic proof</strong>
    that every AI decision existed at a specific time — SHA-256 hashing, Ed25519 + ML-DSA-65
    hybrid signatures, IETF-filed protocol, MIT-licensed. It plugs into whatever stack you run today.
  </p>
  <div style="background:#111118;border:1px solid #1a1a2e;border-radius:8px;padding:16px;margin:20px 0;">
    <p style="color:#d4a017;margin:0 0 6px;font-size:13px;">Signal from your session:</p>
    <p style="color:#a89878;margin:0;font-size:13px;font-style:italic;">${reason}</p>
  </div>
  <div style="text-align:center;margin:28px 0;">
    <a href="https://ai-governance-standard.com/pramaan" style="display:inline-block;padding:14px 28px;background:#d4a017;color:#0a0b0f;text-decoration:none;border-radius:8px;font-weight:bold;">Try Pramaan (60 sec, no signup) →</a>
  </div>
  <p style="color:#a89878;line-height:1.7;">
    If it helps, reply to this email — I'll route you straight to the founder.
  </p>
  <p style="color:#666;font-size:11px;margin-top:32px;">APEX PSI · Provable Stateful Integrity</p>
</div>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "APEX PSI <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Pull recently-captured leads (last 24h) that haven't been enrolled yet.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: convos, error } = await supabase
      .from("chat_conversations")
      .select("id, lead_email, lead_name, lead_company, updated_at")
      .not("lead_email", "is", null)
      .gte("updated_at", since);
    if (error) throw error;

    const results: any[] = [];
    for (const c of convos || []) {
      // Skip if already in drip_queue
      const { data: existing } = await supabase
        .from("drip_queue")
        .select("id")
        .eq("lead_email", c.lead_email)
        .limit(1);
      if (existing && existing.length > 0) continue;

      // Fetch transcript
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: true })
        .limit(30);
      const transcript = (msgs || [])
        .map((m: any) => `${m.role}: ${m.content}`)
        .join("\n");

      let score;
      try {
        score = await scoreIntent(transcript, c.lead_company || "");
      } catch (e) {
        results.push({ email: c.lead_email, error: String(e) });
        continue;
      }

      if (score.intent === "enterprise" && score.score >= 60) {
        // Send custom high-intent email immediately
        await sendCustomEmail(
          c.lead_email,
          c.lead_name || "",
          c.lead_company || "",
          score.reason,
        );
        // Enroll in 3-touch drip via lead-drip function (starts immediate + schedules next)
        await supabase.functions.invoke("lead-drip", {
          body: {
            lead_email: c.lead_email,
            lead_name: c.lead_name,
            lead_company: c.lead_company,
            conversation_id: c.id,
            drip_index: 0,
          },
        });
        results.push({ email: c.lead_email, intent: score.intent, score: score.score, enrolled: true });
      } else {
        results.push({ email: c.lead_email, intent: score.intent, score: score.score, enrolled: false });
      }
    }

    return new Response(
      JSON.stringify({ success: true, scanned: convos?.length || 0, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("score-and-enroll-leads error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
