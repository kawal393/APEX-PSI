import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all data in parallel including site_visits
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [subsRes, compRes, vhRes, gallowsRes, usersRes, visits24hRes, visits7dRes, visits30dRes, visitsRecentRes, campaignVisitsRes, leadsRes] = await Promise.all([
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("compliance_results").select("*").order("updated_at", { ascending: false }),
      supabase.from("verification_history").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("gallows_ledger").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.auth.admin.listUsers({ perPage: 500 }),
      supabase.from("site_visits").select("visitor_id, page_path, referrer, created_at, user_agent, language, session_id").gte("created_at", last24h).order("created_at", { ascending: false }).limit(1000),
      supabase.from("site_visits").select("visitor_id, page_path, referrer, created_at, user_agent").gte("created_at", last7d).order("created_at", { ascending: false }).limit(1000),
      supabase.from("site_visits").select("visitor_id, page_path, referrer, created_at").gte("created_at", last30d).order("created_at", { ascending: false }).limit(1000),
      supabase.from("site_visits").select("visitor_id, page_path, referrer, created_at, user_agent, language, session_id, screen_width, screen_height").order("created_at", { ascending: false }).limit(50),
      supabase.from("site_visits").select("visitor_id, created_at, utm_source, utm_medium, utm_campaign, utm_content, landing_page").gte("created_at", last30d).order("created_at", { ascending: false }).limit(5000),
      supabase.from("marketing_leads").select("*").order("created_at", { ascending: false }).limit(500),
    ]);


    const subscriptions = subsRes.data || [];
    const complianceResults = compRes.data || [];
    const recentVerifications = vhRes.data || [];
    const recentLedger = gallowsRes.data || [];
    const users = usersRes.data?.users || [];
    const visits24h = visits24hRes.data || [];
    const visits7d = visits7dRes.data || [];
    const visits30d = visits30dRes.data || [];
    const visitsRecent = visitsRecentRes.data || [];
    const campaignVisits = campaignVisitsRes.data || [];
    const marketingLeads = leadsRes.data || [];

    // Campaign attribution (last 30 days)
    const campaignMap: Record<string, {
      source: string; medium: string; campaign: string; content: string;
      views: number; visitors: Set<string>; landing: Record<string, number>;
    }> = {};
    campaignVisits.forEach((v: Record<string, string | null>) => {
      const source = v.utm_source || "";
      const campaign = v.utm_campaign || "";
      if (!source && !campaign) return;
      const key = `${source}|${v.utm_medium || ""}|${campaign}|${v.utm_content || ""}`;
      if (!campaignMap[key]) {
        campaignMap[key] = {
          source: source || "(none)", medium: v.utm_medium || "(none)",
          campaign: campaign || "(none)", content: v.utm_content || "(none)",
          views: 0, visitors: new Set(), landing: {},
        };
      }
      const c = campaignMap[key];
      c.views++;
      if (v.visitor_id) c.visitors.add(v.visitor_id);
      const lp = v.landing_page || "/";
      c.landing[lp] = (c.landing[lp] || 0) + 1;
    });

    const leadsBySource: Record<string, number> = {};
    marketingLeads.forEach((l: Record<string, unknown>) => {
      const k = `${(l.utm_source as string) || "(none)"}|${(l.utm_campaign as string) || "(none)"}`;
      leadsBySource[k] = (leadsBySource[k] || 0) + 1;
    });

    const campaigns = Object.values(campaignMap)
      .map((c) => {
        const visitors = c.visitors.size;
        const leads = leadsBySource[`${c.source}|${c.campaign}`] || 0;
        const topLanding = Object.entries(c.landing).sort((a, b) => b[1] - a[1])[0]?.[0] || "/";
        return {
          source: c.source, medium: c.medium, campaign: c.campaign, content: c.content,
          views: c.views, visitors, leads,
          conversion_rate: visitors > 0 ? Number(((leads / visitors) * 100).toFixed(1)) : 0,
          top_landing: topLanding,
        };
      })
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 25);


    // Calculate stats
    const totalUsers = users.length;
    const paidUsers = subscriptions.filter(s => s.status === "active" && s.tier !== "free").length;
    const tierCounts: Record<string, number> = {};
    subscriptions.forEach(s => {
      const t = s.tier || "free";
      tierCounts[t] = (tierCounts[t] || 0) + 1;
    });
    const totalVerifications = subscriptions.reduce((sum, s) => sum + (s.verifications_used || 0), 0);
    const avgScore = complianceResults.length > 0
      ? Math.round(complianceResults.reduce((sum, c) => sum + c.overall_score, 0) / complianceResults.length)
      : 0;

    // Site visit analytics
    const uniqueVisitors24h = new Set(visits24h.map(v => v.visitor_id)).size;
    const uniqueVisitors7d = new Set(visits7d.map(v => v.visitor_id)).size;
    const uniqueVisitors30d = new Set(visits30d.map(v => v.visitor_id)).size;
    const sessions24h = new Set(visits24h.map(v => v.session_id).filter(Boolean)).size;

    // Top pages
    const pageCount: Record<string, number> = {};
    visits7d.forEach(v => { pageCount[v.page_path] = (pageCount[v.page_path] || 0) + 1; });
    const topPages = Object.entries(pageCount).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([path, count]) => ({ path, count }));

    // Top referrers
    const refCount: Record<string, number> = {};
    visits7d.forEach(v => {
      if (v.referrer) {
        try { const u = new URL(v.referrer); refCount[u.hostname] = (refCount[u.hostname] || 0) + 1; } catch { refCount[v.referrer] = (refCount[v.referrer] || 0) + 1; }
      }
    });
    const topReferrers = Object.entries(refCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([source, count]) => ({ source, count }));

    // Daily visits (last 7 days)
    const dailyVisits: Record<string, { views: number; visitors: Set<string> }> = {};
    visits7d.forEach(v => {
      const day = v.created_at.slice(0, 10);
      if (!dailyVisits[day]) dailyVisits[day] = { views: 0, visitors: new Set() };
      dailyVisits[day].views++;
      dailyVisits[day].visitors.add(v.visitor_id);
    });
    const dailyChart = Object.entries(dailyVisits).sort((a, b) => a[0].localeCompare(b[0])).map(([date, d]) => ({ date, views: d.views, visitors: d.visitors.size }));

    const customers = users.map(u => {
      const sub = subscriptions.find(s => s.user_id === u.id);
      const comp = complianceResults.find(c => c.user_id === u.id);
      return {
        id: u.id, email: u.email, created_at: u.created_at,
        tier: sub?.tier || "free", status: sub?.status || "none",
        verifications_used: sub?.verifications_used || 0,
        compliance_score: comp?.overall_score ?? null,
        compliance_status: comp?.status ?? null,
        trio_mode: comp?.trio_mode ?? null,
        company_name: comp?.company_name ?? null,
      };
    });

    return new Response(JSON.stringify({
      stats: {
        total_users: totalUsers, paid_users: paidUsers, tier_counts: tierCounts,
        total_verifications: totalVerifications, avg_compliance_score: avgScore,
      },
      site_intelligence: {
        pageviews_24h: visits24h.length,
        unique_visitors_24h: uniqueVisitors24h,
        sessions_24h: sessions24h,
        pageviews_7d: visits7d.length,
        unique_visitors_7d: uniqueVisitors7d,
        pageviews_30d: visits30d.length,
        unique_visitors_30d: uniqueVisitors30d,
        top_pages: topPages,
        top_referrers: topReferrers,
        daily_chart: dailyChart,
        recent_visits: visitsRecent,
      },
      customers,
      recent_verifications: recentVerifications.slice(0, 50),
      recent_ledger: recentLedger,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
