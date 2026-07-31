// APEX PSI — Marketing lead capture
// Stores a consented email with campaign attribution, scores it,
// delivers the EU AI Act Article 50 Compliance Pack and enrolls
// high-intent leads into the existing drip sequence.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE = "https://digital-gallows.apex-infrastructure.com";

const FREE_MAIL = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
  "proton.me", "protonmail.com", "aol.com", "gmx.com", "mail.com", "live.com",
];

const HIGH_VALUE_TLD = [".gov", ".gov.uk", ".europa.eu", ".gov.au", ".gc.ca", ".gouv.fr"];

function scoreLead(email: string, intent: string, company: string | null): number {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  let score = 20;
  if (!FREE_MAIL.includes(domain)) score += 30;
  if (HIGH_VALUE_TLD.some((t) => domain.endsWith(t))) score += 40;
  if (domain.endsWith(".eu") || domain.includes("europa")) score += 15;
  if (company && company.trim().length > 1) score += 10;
  if (intent === "sealed_artifact") score += 20;
  if (intent === "exit_intent") score -= 5;
  return Math.max(0, Math.min(100, score));
}

function packEmail(name: string | null): { subject: string; html: string } {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return {
    subject: "Your EU AI Act Article 50 Compliance Pack",
    html: `
      <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
        <p style="font-size:12px;letter-spacing:2px;color:#9a7b2f;margin:0 0 16px">APEX PSI · PROOF OF STATEFUL INTEGRITY</p>
        <p>${greeting}</p>
        <p>Here is the Article 50 pack you asked for. Everything below is public and verifiable — no login, no sales call.</p>
        <ul style="line-height:1.9">
          <li><strong>Full technical specification</strong> — canonicalization, hybrid Ed25519 + ML-DSA-65 signatures, receipt schema, threat model and stated limitations: <a href="${SITE}/spec">${SITE}/spec</a></li>
          <li><strong>EU AI Act Article 50 clause mapping</strong> — requirement by requirement: <a href="${SITE}/eu-ai-act">${SITE}/eu-ai-act</a></li>
          <li><strong>In-band marking and detection</strong> — C2PA-compatible JUMBF/APP11 embedding you can test on your own file: <a href="${SITE}/inband">${SITE}/inband</a></li>
          <li><strong>Public trust anchor</strong> — verify our signatures offline: <a href="${SITE}/.well-known/apex-psi-trust-anchor.json">trust anchor JSON</a></li>
          <li><strong>Seal a file yourself</strong> (client-side, nothing uploaded): <a href="${SITE}/pramaan">${SITE}/pramaan</a></li>
        </ul>
        <p>The protocol is MIT open source and published as IETF draft-singh-psi-00. If you want to route your own systems through it, the API docs are at <a href="${SITE}/api">${SITE}/api</a>.</p>
        <p style="color:#666;font-size:13px">You received this because you requested the pack at ${SITE}. Reply "remove" and you will not hear from us again.</p>
      </div>`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : null;
    const company = typeof body.company === "string" ? body.company.trim().slice(0, 160) : null;
    const intent = typeof body.intent === "string" ? body.intent.slice(0, 40) : "compliance_pack";
    const sourcePage = typeof body.source_page === "string" ? body.source_page.slice(0, 200) : null;
    const visitorId = typeof body.visitor_id === "string" ? body.visitor_id.slice(0, 100) : null;

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 255;
    if (!emailOk) {
      return new Response(JSON.stringify({ error: "A valid email address is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const utm = body.utm && typeof body.utm === "object" ? body.utm : {};
    const pick = (k: string) =>
      typeof utm[k] === "string" && utm[k].length ? String(utm[k]).slice(0, 120) : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const score = scoreLead(email, intent, company);

    const { error: dbError } = await supabase.from("marketing_leads").insert({
      email,
      name,
      company,
      intent,
      source_page: sourcePage,
      visitor_id: visitorId,
      utm_source: pick("utm_source"),
      utm_medium: pick("utm_medium"),
      utm_campaign: pick("utm_campaign"),
      utm_content: pick("utm_content"),
      utm_term: pick("utm_term"),
      landing_page: pick("landing_page"),
      referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null,
      score,
      status: "new",
    });

    if (dbError) console.error("marketing_leads insert failed:", dbError.message);

    // Deliver the pack immediately.
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let delivered = false;
    if (resendKey) {
      const { subject, html } = packEmail(name);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [email],
          subject,
          html,
        }),
      });
      delivered = res.ok;
      if (!res.ok) console.error(`Resend failed [${res.status}]: ${await res.text()}`);

      // Always notify the operator so no lead is lost, even if delivery fails.
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [OPERATOR_EMAIL],
          subject: `New lead (${score}): ${email}${company ? " · " + company : ""}`,
          html: `<pre style="font-family:ui-monospace,monospace;font-size:13px">${JSON.stringify(
            {
              email, name, company, intent, score,
              source_page: sourcePage,
              utm_source: pick("utm_source"),
              utm_medium: pick("utm_medium"),
              utm_campaign: pick("utm_campaign"),
              utm_content: pick("utm_content"),
              pack_delivered: delivered,
            },
            null,
            2,
          )}</pre>`,
        }),
      }).catch((e) => console.error("operator notify failed:", String(e)));
    }


    // High-intent leads enter the existing drip sequence.
    if (score >= 60) {
      const { error: dripError } = await supabase.from("drip_queue").insert({
        lead_email: email,
        lead_name: name,
        lead_company: company,
        drip_index: 0,
        send_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
      });
      if (dripError) console.error("drip enroll failed:", dripError.message);
    }

    return new Response(JSON.stringify({ ok: true, delivered, score }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("capture-lead error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
