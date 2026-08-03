import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TARGET_EMAIL = "apex.manraj888@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, company, role, message } = await req.json();

    if (!name || !email || !company) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase.from("contact_submissions").insert({
      name,
      email,
      company,
      role: role || null,
      message: message || null,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
    }

    // Send email notification via Resend if API key exists
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      // 1. Notify you (admin)
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "APEX PSI <onboarding@resend.dev>",
          to: [TARGET_EMAIL],
          subject: `New Demo Request from ${name} (${company})`,
          html: `
            <h2>New Demo Request</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Company:</strong> ${company}</p>
            <p><strong>Role:</strong> ${role || "Not specified"}</p>
            <p><strong>Message:</strong> ${message || "No message"}</p>
            <hr>
            <p style="color:#888;font-size:12px;">Sent from APEX PSI contact form</p>
          `,
        }),
      });
      const emailData = await emailRes.text();
      console.log("Admin notification:", emailRes.status, emailData);

      // 2. Send confirmation to the customer
      const confirmRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "APEX PSI <onboarding@resend.dev>",
          to: [email],
          subject: "We received your request — APEX PSI",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
              <h2 style="color:#1a1a2e;">Thank you, ${name}!</h2>
              <p>We've received your request and our team will get back to you within <strong>24 hours</strong>.</p>
              <p>Here's a summary of what you sent:</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Company</td><td style="padding:8px;border-bottom:1px solid #eee;">${company}</td></tr>
                ${role ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Role</td><td style="padding:8px;border-bottom:1px solid #eee;">${role}</td></tr>` : ""}
                ${message ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Message</td><td style="padding:8px;border-bottom:1px solid #eee;">${message}</td></tr>` : ""}
              </table>
              <p style="margin-top:24px;">In the meantime, the <strong>EU AI Act deadline is August 2, 2026</strong>. Start your compliance journey today:</p>
              <a href="https://ai-governance-standard.com/auth" style="display:inline-block;padding:12px 24px;background:#d4a017;color:#000;text-decoration:none;border-radius:6px;font-weight:bold;margin-top:8px;">Request Compliance Audit →</a>
              <hr style="margin-top:32px;border:none;border-top:1px solid #eee;">
              <p style="color:#888;font-size:12px;">APEX PSI — EU AI Act Compliance Platform</p>
            </div>
          `,
        }),
      });
      const confirmData = await confirmRes.text();
      console.log("Customer confirmation:", confirmRes.status, confirmData);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
