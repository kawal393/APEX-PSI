import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const shareId = url.searchParams.get("id");
    if (!shareId) {
      return new Response("Missing id", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("assessment_leads")
      .select("company_name, score, status, industry")
      .eq("share_id", shareId)
      .maybeSingle();

    if (error || !data) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const score = data.score ?? 0;
    const company = data.company_name || "Anonymous";
    const status = data.status || "ASSESSED";
    const industry = data.industry || "";

    // Color based on score
    let scoreColor = "#ef4444"; // red
    let statusLabel = "NON-COMPLIANT";
    if (score >= 90) { scoreColor = "#22c55e"; statusLabel = "COMPLIANT"; }
    else if (score >= 70) { scoreColor = "#d4a017"; statusLabel = "MOSTLY COMPLIANT"; }
    else if (score >= 50) { scoreColor = "#f59e0b"; statusLabel = "PARTIALLY COMPLIANT"; }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0f"/>
      <stop offset="100%" stop-color="#12121a"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#d4a017"/>
      <stop offset="100%" stop-color="#b8860b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="4" fill="url(#gold)"/>
  
  <!-- APEX Brand -->
  <text x="80" y="80" fill="#d4a017" font-size="18" font-weight="900" font-family="system-ui" letter-spacing="6">APEX PSI</text>
  <text x="80" y="108" fill="#666" font-size="14" font-family="system-ui">EU AI Act Compliance Assessment</text>
  
  <!-- Score Circle -->
  <circle cx="600" cy="300" r="120" fill="none" stroke="#1a1a2e" stroke-width="12"/>
  <circle cx="600" cy="300" r="120" fill="none" stroke="${scoreColor}" stroke-width="12" 
    stroke-dasharray="${(score / 100) * 754} 754" stroke-linecap="round" transform="rotate(-90 600 300)"/>
  <text x="600" y="290" text-anchor="middle" fill="${scoreColor}" font-size="72" font-weight="900" font-family="system-ui">${score}%</text>
  <text x="600" y="330" text-anchor="middle" fill="${scoreColor}" font-size="16" font-weight="700" font-family="system-ui" letter-spacing="3">${statusLabel}</text>
  
  <!-- Company -->
  <text x="600" y="480" text-anchor="middle" fill="#e8e0d0" font-size="28" font-weight="700" font-family="system-ui">${escapeXml(company)}</text>
  ${industry ? `<text x="600" y="510" text-anchor="middle" fill="#666" font-size="16" font-family="system-ui">${escapeXml(industry)}</text>` : ""}
  
  <!-- CTA -->
  <text x="600" y="580" text-anchor="middle" fill="#d4a017" font-size="14" font-family="system-ui" opacity="0.7">Check your compliance score → ai-governance-standard.com/assess</text>
  
  <!-- Decorative -->
  <rect x="0" y="626" width="1200" height="4" fill="url(#gold)"/>
</svg>`;

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
