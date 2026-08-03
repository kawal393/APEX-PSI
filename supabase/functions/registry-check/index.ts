// APEX PSI — Verified Supplier check.
// Public, permissionless: given a domain, report whether it publishes
// APEX PSI transparency conformity signals (protocol descriptor,
// Compliance-Receipt header, trust anchor) and whether it holds a
// Verified Supplier Registry listing.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const TIMEOUT_MS = 8000;

interface Signal {
  id: string;
  label: string;
  present: boolean;
  detail: string;
}

function normalizeDomain(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(trimmed)) return null;
  if (trimmed.length > 253) return null;
  return trimmed;
}

async function timedFetch(url: string, init?: RequestInit): Promise<Response | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctl.signal, redirect: "follow" });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let raw = url.searchParams.get("domain") ?? "";
    if (!raw && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      raw = typeof body?.domain === "string" ? body.domain : "";
    }

    const domain = normalizeDomain(raw);
    if (!domain) {
      return new Response(
        JSON.stringify({ error: "Provide a valid domain, e.g. example.com" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const base = `https://${domain}`;
    const signals: Signal[] = [];

    // 1. Protocol descriptor
    const descriptorRes = await timedFetch(`${base}/.well-known/apex-protocol.json`);
    let descriptor: unknown = null;
    if (descriptorRes?.ok) {
      descriptor = await descriptorRes.json().catch(() => null);
    }
    signals.push({
      id: "protocol_descriptor",
      label: "/.well-known/apex-protocol.json",
      present: !!descriptor,
      detail: descriptor
        ? "Publishes a machine-readable PSI protocol descriptor."
        : "No protocol descriptor served at the well-known path.",
    });

    // 2. Compliance-Receipt response header
    const rootRes = await timedFetch(base, { method: "GET" });
    const receiptHeader = rootRes?.headers.get("compliance-receipt") ?? null;
    signals.push({
      id: "compliance_receipt_header",
      label: "Compliance-Receipt HTTP header",
      present: !!receiptHeader,
      detail: receiptHeader
        ? `Header present: ${receiptHeader.slice(0, 180)}`
        : "No Compliance-Receipt header on the root response (draft-singh-psi-http-01).",
    });

    // 3. Trust anchor
    const anchorRes = await timedFetch(`${base}/.well-known/apex-psi-trust-anchor.json`);
    const anchorOk = !!anchorRes?.ok;
    signals.push({
      id: "trust_anchor",
      label: "Published trust anchor",
      present: anchorOk,
      detail: anchorOk
        ? "Publishes a signing trust anchor for independent signature checking."
        : "No published trust anchor document.",
    });

    // 4. security.txt — basic disclosure hygiene
    const secRes = await timedFetch(`${base}/.well-known/security.txt`);
    signals.push({
      id: "security_txt",
      label: "/.well-known/security.txt",
      present: !!secRes?.ok,
      detail: secRes?.ok
        ? "Security disclosure contact published."
        : "No security disclosure contact published.",
    });

    // 5. Registry listing (paid, verified suppliers only)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    let listed = false;
    let listedName: string | null = null;
    const listingRes = await timedFetch(
      `${supabaseUrl}/rest/v1/verified_suppliers?domain=eq.${encodeURIComponent(domain)}&status=eq.active&select=domain,display_name`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (listingRes?.ok) {
      const rows = await listingRes.json().catch(() => []);
      listed = Array.isArray(rows) && rows.length > 0;
      listedName = listed ? (rows[0].display_name ?? null) : null;
    }

    const present = signals.filter((s) => s.present).length;
    const score = Math.round((present / signals.length) * 100);
    const grade = listed
      ? "VERIFIED_SUPPLIER"
      : score >= 75
        ? "CONFORMANT_SIGNALS"
        : score >= 25
          ? "PARTIAL_SIGNALS"
          : "NO_SIGNALS";

    return new Response(
      JSON.stringify({
        domain,
        checked_at: new Date().toISOString(),
        reachable: !!rootRes,
        score,
        grade,
        registry_listing: { listed, display_name: listedName },
        signals,
        engine: "APEX PSI Supplier Check v1",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("registry-check failed", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
