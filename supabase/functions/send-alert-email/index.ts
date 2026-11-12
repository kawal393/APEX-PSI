import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { isServiceCall, escapeHtml, EMAIL_RE } from "../_shared/caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Internal only: alerts are sent by other backend functions holding the service key.
  if (!isServiceCall(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const to = typeof body?.to === "string" ? body.to.trim() : "";
    if (!EMAIL_RE.test(to)) {
      return new Response(JSON.stringify({ error: "Invalid recipient" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const company = escapeHtml(body?.company);
    const status = String(body?.status ?? "").slice(0, 40);
    const statusHtml = escapeHtml(status.toUpperCase());
    const score = Number.isFinite(Number(body?.score)) ? Math.round(Number(body.score)) : 0;
    const mode = escapeHtml(body?.mode);
    const previous_status = escapeHtml(body?.previous_status);
    const subject = typeof body?.subject === "string" ? body.subject.slice(0, 150) : "";

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.log("RESEND_API_KEY not set, skipping alert");
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusColor = status === "compliant" ? "#22c55e" : status === "mostly_compliant" ? "#eab308" : "#ef4444";

    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0a0b0f;color:#e8e0d0;border-radius:12px;border:1px solid #1a1a2e;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="font-size:12px;letter-spacing:4px;color:#d4a017;">APEX APEX PSI</div>
    <h1 style="font-size:20px;margin:8px 0;color:#fff;">Compliance Status Alert</h1>
  </div>
  <div style="background:#1a1a2e;border-radius:8px;padding:20px;margin-bottom:20px;">
    <p style="margin:4px 0;"><strong style="color:#888;">Company:</strong> ${company || "N/A"}</p>
    <p style="margin:4px 0;"><strong style="color:#888;">Previous:</strong> ${previous_status || "N/A"}</p>
    <p style="margin:4px 0;"><strong style="color:#888;">Current:</strong> <span style="color:${statusColor};font-weight:bold;">${statusHtml}</span></p>
    <p style="margin:4px 0;"><strong style="color:#888;">Score:</strong> ${score}%</p>
    <p style="margin:4px 0;"><strong style="color:#888;">Mode:</strong> ${mode || "SHIELD"}</p>
  </div>
  <p style="color:#888;font-size:12px;text-align:center;">Log into your dashboard to review full details.</p>
  <hr style="border:none;border-top:1px solid #1a1a2e;margin-top:20px;">
  <p style="color:#555;font-size:10px;text-align:center;">APEX Infrastructure Pty Ltd · Automated Alert</p>
</div>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "APEX Alerts <onboarding@resend.dev>",
        to: [to],
        subject: subject || `⚠️ Compliance Status Changed: ${(status || "").toUpperCase()}`,
        html,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-alert-email error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
