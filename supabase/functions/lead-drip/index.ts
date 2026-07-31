import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TARGET_EMAIL = "apex.manraj888@gmail.com";

const DRIP_EMAILS = [
  {
    delayMs: 0, // Immediate
    subject: "Your AI Compliance Journey Starts Now",
    html: (name: string, company: string) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0a0b0f;color:#e8e0d0;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#d4a017;margin:0;font-size:24px;">APEX PSI</h1>
          <p style="color:#8a7a5a;font-size:12px;margin-top:4px;">Provable Stateful Integrity</p>
        </div>
        <h2 style="color:#e8e0d0;font-size:20px;">Welcome${name ? `, ${name}` : ""}!</h2>
        <p style="color:#a89878;line-height:1.7;">Thank you for your interest in APEX. The EU AI Act deadline is <strong style="color:#d4a017;">August 2, 2026</strong>, and companies like${company ? ` ${company}` : " yours"} need to act now.</p>
        <p style="color:#a89878;line-height:1.7;">Here's what sets APEX apart:</p>
        <ul style="color:#a89878;line-height:2;">
          <li><strong style="color:#e8e0d0;">Cryptographic Proof</strong> — Not just audits. Mathematical certainty.</li>
          <li><strong style="color:#e8e0d0;">Real-Time Monitoring</strong> — Continuous compliance, not annual checkups.</li>
          <li><strong style="color:#e8e0d0;">Zero-Knowledge</strong> — Prove compliance without revealing your models.</li>
        </ul>
        <div style="text-align:center;margin:32px 0;">
          <a href="https://digital-gallows.apex-infrastructure.com/assess" style="display:inline-block;padding:14px 32px;background:#d4a017;color:#0a0b0f;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">Get Your Free Compliance Score →</a>
        </div>
        <hr style="border:none;border-top:1px solid #1a1a2e;margin:32px 0;">
        <p style="color:#555;font-size:11px;text-align:center;">APEX PSI · EU AI Act Compliance Platform</p>
      </div>
    `,
  },
  {
    delayMs: 86400000, // 24 hours
    subject: "The €35M Question: Is Your AI Compliant?",
    html: (name: string, company: string) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0a0b0f;color:#e8e0d0;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#d4a017;margin:0;font-size:24px;">APEX PSI</h1>
        </div>
        <h2 style="color:#e8e0d0;font-size:20px;">${name ? `${name}, ` : ""}Did you know?</h2>
        <div style="background:#111118;border:1px solid #1a1a2e;border-radius:12px;padding:24px;margin:20px 0;">
          <p style="color:#ff4444;font-size:28px;font-weight:bold;margin:0;text-align:center;">€35,000,000</p>
          <p style="color:#a89878;text-align:center;margin-top:8px;">Maximum fine for EU AI Act non-compliance<br><span style="color:#666;">or 7% of global annual revenue</span></p>
        </div>
        <p style="color:#a89878;line-height:1.7;">Most companies are using <strong style="color:#e8e0d0;">annual audits</strong> — checking compliance once a year. That's like checking your smoke alarm once a year and hoping nothing burns down in between.</p>
        <p style="color:#a89878;line-height:1.7;">APEX uses <strong style="color:#d4a017;">Provable Stateful Integrity (PSI)</strong> to verify compliance <em>continuously</em> and <em>cryptographically</em>. Every state change is committed, challenged, and proven.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="https://digital-gallows.apex-infrastructure.com/gallows" style="display:inline-block;padding:14px 32px;background:#d4a017;color:#0a0b0f;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">Try the Free Gallows Engine →</a>
        </div>
        <hr style="border:none;border-top:1px solid #1a1a2e;margin:32px 0;">
        <p style="color:#555;font-size:11px;text-align:center;">APEX PSI · EU AI Act Compliance Platform</p>
      </div>
    `,
  },
  {
    delayMs: 259200000, // 72 hours
    subject: "Last chance: Schedule your compliance demo",
    html: (name: string, company: string) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0a0b0f;color:#e8e0d0;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#d4a017;margin:0;font-size:24px;">APEX PSI</h1>
        </div>
        <h2 style="color:#e8e0d0;font-size:20px;">${name ? `${name}, ` : ""}Ready to get compliant?</h2>
        <p style="color:#a89878;line-height:1.7;">We've helped companies across finance, healthcare, and tech achieve verifiable EU AI Act compliance. Here's what our customers get:</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr>
            <td style="padding:12px;border-bottom:1px solid #1a1a2e;">
              <strong style="color:#d4a017;">SHIELD Mode</strong><br>
              <span style="color:#a89878;font-size:13px;">Continuous background monitoring</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;border-bottom:1px solid #1a1a2e;">
              <strong style="color:#d4a017;">SWORD Mode</strong><br>
              <span style="color:#a89878;font-size:13px;">Active compliance probes for pre-audit prep</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;">
              <strong style="color:#d4a017;">JUDGE Mode</strong><br>
              <span style="color:#a89878;font-size:13px;">Full adversarial audit simulating regulatory inspection</span>
            </td>
          </tr>
        </table>
        <p style="color:#a89878;line-height:1.7;">Plans start at <strong style="color:#e8e0d0;">$499/mo</strong>. Every day you wait is another day of unverified compliance risk.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="https://digital-gallows.apex-infrastructure.com/auth" style="display:inline-block;padding:14px 32px;background:#d4a017;color:#0a0b0f;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">Start Your Free Trial →</a>
        </div>
        <hr style="border:none;border-top:1px solid #1a1a2e;margin:32px 0;">
        <p style="color:#555;font-size:11px;text-align:center;">APEX PSI · EU AI Act Compliance Platform<br>Reply STOP to unsubscribe</p>
      </div>
    `,
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lead_email, lead_name, lead_company, conversation_id, drip_index } = await req.json();

    if (!lead_email) {
      return new Response(JSON.stringify({ error: "Missing lead_email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const index = drip_index || 0;
    if (index >= DRIP_EMAILS.length) {
      return new Response(JSON.stringify({ message: "Drip sequence complete" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const drip = DRIP_EMAILS[index];
    const name = lead_name || "";
    const company = lead_company || "";

    // Send the email
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "APEX PSI <onboarding@resend.dev>",
        to: [lead_email],
        subject: drip.subject,
        html: drip.html(name, company),
      }),
    });

    const emailData = await emailRes.json();
    console.log(`Drip email ${index + 1} sent to ${lead_email}:`, emailRes.status, JSON.stringify(emailData));

    // Notify admin on first email
    if (index === 0) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "APEX PSI <onboarding@resend.dev>",
          to: [TARGET_EMAIL],
          subject: `🎯 New Lead Captured: ${lead_email}`,
          html: `
            <h2>New Lead from APEX AI Chat</h2>
            <p><strong>Name:</strong> ${name || "Not provided"}</p>
            <p><strong>Email:</strong> ${lead_email}</p>
            <p><strong>Company:</strong> ${company || "Not provided"}</p>
            <p><strong>Conversation:</strong> ${conversation_id || "N/A"}</p>
            <p>Drip sequence started. 3 emails will be sent over 3 days.</p>
          `,
        }),
      });
    }

    // Schedule next drip if there is one
    if (index + 1 < DRIP_EMAILS.length) {
      const nextDrip = DRIP_EMAILS[index + 1];
      // Use Supabase pg_cron or just store for later processing
      // For now, we'll use a simple approach: store drip state in DB
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("drip_queue").upsert({
        lead_email,
        lead_name: name,
        lead_company: company,
        conversation_id: conversation_id || null,
        drip_index: index + 1,
        send_at: new Date(Date.now() + nextDrip.delayMs).toISOString(),
        status: "pending",
      }, { onConflict: "lead_email,drip_index" });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailSent: index + 1,
      totalEmails: DRIP_EMAILS.length,
      nextEmailAt: index + 1 < DRIP_EMAILS.length 
        ? new Date(Date.now() + DRIP_EMAILS[index + 1].delayMs).toISOString() 
        : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lead-drip error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
