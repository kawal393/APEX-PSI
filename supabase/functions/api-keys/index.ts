// api-keys — list and revoke the signed-in user's APEX PSI API keys.
// Reads/writes go through the service role but are always scoped to the
// authenticated user's id, so no one can see or touch another user's keys.
// Only non-secret fields are returned (never the hash).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Authentication required" }, 401);

    const supabase = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { action } = await req.json().catch(() => ({ action: "list" } as Record<string, string>));

    if (action === "revoke") {
      const { id } = await req.json().catch(() => ({}) as Record<string, string>);
      if (!id) return json({ error: "Missing key id" }, 400);
      const { error } = await supabase
        .from("notary_api_keys")
        .update({ revoked: true })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) return json({ error: String(error.message || error) }, 500);
      return json({ ok: true });
    }

    // default: list
    const { data, error } = await supabase
      .from("notary_api_keys")
      .select("id,name,tier,daily_limit,daily_used,revoked,created_at")
      .eq("user_id", user.id)
      .eq("revoked", false)
      .order("created_at", { ascending: false });
    if (error) return json({ error: String(error.message || error) }, 500);
    return json({ keys: data ?? [] });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
