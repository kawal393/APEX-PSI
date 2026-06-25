// Register a hardware-backed (WebAuthn) witness attestation for a Foundation governance action.
// Body: { action_type, target_ref, credential_id, public_key?, signature, client_data_json?, authenticator_data?, notes? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "auth required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = auth.slice(7);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const required = ["action_type", "target_ref", "credential_id", "signature"];
    for (const k of required) {
      if (!body[k] || typeof body[k] !== "string") {
        return new Response(JSON.stringify({ error: `missing ${k}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data, error } = await supabase
      .from("foundation_witness_attestations")
      .insert({
        user_id: userRes.user.id,
        action_type: body.action_type,
        target_ref: body.target_ref,
        credential_id: body.credential_id,
        public_key: body.public_key ?? null,
        signature: body.signature,
        client_data_json: body.client_data_json ?? null,
        authenticator_data: body.authenticator_data ?? null,
        notes: body.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, attestation: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
