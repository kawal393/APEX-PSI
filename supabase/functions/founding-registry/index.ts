import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendMail, esc, findBanned, OPERATOR_EMAIL } from "../_shared/mail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOTAL_SEATS = 10;
const LAPSE_DAYS = 90;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function callerEmail(req: Request): Promise<{ email: string | null; userId: string | null }> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return { email: null, userId: null };
  const token = authHeader.replace("Bearer ", "");
  if (!token || token === ANON_KEY) return { email: null, userId: null };
  const { data } = await admin().auth.getUser(token);
  const email = data.user?.email?.toLowerCase() ?? null;
  return { email, userId: data.user?.id ?? null };
}

async function isOperator(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { data } = await admin().rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!data;
}

/** Lapse any RESERVED seat older than LAPSE_DAYS. Seats retire empty forever. */
async function sweepLapsed() {
  const cutoff = new Date(Date.now() - LAPSE_DAYS * 86400000).toISOString();
  await admin()
    .from("founding_applications")
    .update({ status: "LAPSED" })
    .eq("status", "RESERVED")
    .lt("reserved_at", cutoff);
}

async function lowestFreeSeat(): Promise<number | null> {
  const db = admin();
  const { data: taken } = await db.from("founding_applications").select("seat_number").not("seat_number", "is", null);
  const used = new Set<number>((taken ?? []).map((r: { seat_number: number }) => r.seat_number));
  for (let i = 1; i <= TOTAL_SEATS; i++) if (!used.has(i)) return i;
  return null;
}

/** Off by default: the operator stays the gate unless FOUNDING_AUTO_APPROVE=true. */
const AUTO_APPROVE = Deno.env.get("FOUNDING_AUTO_APPROVE") === "true";
const SITE = Deno.env.get("SITE_URL") ?? "https://ai-governance-standard.com";

type Script = { version: number; approved_script: string; may_say: string[]; may_not_say: string[]; banned_terms: string[] };
async function loadScript(): Promise<Script | null> {
  const { data } = await admin().from("partner_script")
    .select("version, approved_script, may_say, may_not_say, banned_terms").eq("id", "founding-v1").maybeSingle();
  return (data as Script) ?? null;
}

/** Reserve the lowest free seat and send the welcome kit automatically. */
async function reserveSeat(applicant_id: string): Promise<{ seat?: number; error?: string }> {
  const db = admin();
  const seat = await lowestFreeSeat();
  if (!seat) return { error: "No free seats" };
  const { data: app, error } = await db
    .from("founding_applications")
    .update({ status: "RESERVED", seat_number: seat, reserved_at: new Date().toISOString() })
    .eq("applicant_id", applicant_id).eq("status", "VERIFIED")
    .select("display_name, email").maybeSingle();
  if (error || !app) return { error: "Approval failed" };
  const s = await loadScript();
  const list = (xs: string[]) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const seatNo = String(seat).padStart(3, "0");
  const html = `<p>${esc(app.display_name)}, seat #${seatNo} in the APEX PSI Founding Member registry is reserved for you.</p>
<p><b>Next step:</b> sign in at <a href="${SITE}/founding">${SITE}/founding</a> with this email, then perform your first witness act to inscribe the seat. Your personal referral code appears there once you sign in. Unused reservations lapse after ${LAPSE_DAYS} days.</p>
${s ? `<h3>The approved script (v${s.version}) — use these words</h3><p>${esc(s.approved_script)}</p>
<h3>You may say</h3>${list(s.may_say)}<h3>You may not say</h3>${list(s.may_not_say)}` : ""}
<p>Reminder of what you signed (§6): a seat gives no equity, ownership, partnership, employment or authority to act for APEX. Referral fees are paid only on revenue APEX actually receives from customers you directly refer. Pass every pricing, contract or technical question to the founder.</p>`;
  await sendMail(app.email, `Seat #${seatNo} reserved — APEX PSI Founding Member welcome kit`, html);
  await sendMail(OPERATOR_EMAIL, `Founding seat #${seatNo} reserved: ${app.display_name}`, `<p>${esc(app.email)} — ${AUTO_APPROVE ? "auto-approved" : "approved by operator"}.</p>`);
  return { seat };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const db = admin();
    await sweepLapsed();

    // ---------- APPROVED PARTNER SCRIPT (public, read-only) ----------
    if (action === "script") {
      const s = await loadScript();
      return json({ script: s ? { version: s.version, approved_script: s.approved_script, may_say: s.may_say, may_not_say: s.may_not_say } : null });
    }

    // ---------- PUBLIC WALL ----------
    if (action === "wall") {
      const { data: members } = await db
        .from("founding_members")
        .select("seat_number, display_name, receipt_id, leaf_hash, sealed_at")
        .order("seat_number");
      const { data: reserved } = await db
        .from("founding_applications")
        .select("seat_number")
        .eq("status", "RESERVED")
        .not("seat_number", "is", null);
      return json({
        total_seats: TOTAL_SEATS,
        members: members ?? [],
        reserved_seats: (reserved ?? []).map((r: { seat_number: number }) => r.seat_number),
        closed: (members ?? []).length >= TOTAL_SEATS,
      });
    }

    // ---------- APPLY ----------
    if (action === "apply") {
      const display_name = String(body.display_name ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const witness_line = String(body.witness_line ?? "").trim();
      const ack_hash = String(body.ack_hash ?? "").trim();
      const acknowledged = body.acknowledged === true;

      if (!display_name || display_name.length > 120) return json({ error: "Name required" }, 400);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Valid email required" }, 400);
      if (!witness_line || witness_line.length > 300) return json({ error: "Witness line required" }, 400);
      if (!acknowledged) return json({ error: "Acknowledgement must be accepted" }, 400);
      if (!/^[0-9a-f]{64}$/.test(ack_hash)) return json({ error: "Acknowledgement hash invalid" }, 400);

      // Safety wall: public listing text may not carry banned claims.
      const script = await loadScript();
      const hits = findBanned(`${display_name} ${witness_line}`, script?.banned_terms ?? []);
      if (hits.length) return json({ error: `Please remove claims that APEX cannot stand behind: ${hits.join(", ")}` }, 400);

      const { count } = await db
        .from("founding_members")
        .select("seat_number", { count: "exact", head: true });
      if ((count ?? 0) >= TOTAL_SEATS) return json({ error: "The registry is closed forever." }, 409);

      const { data: existing } = await db
        .from("founding_applications")
        .select("applicant_id, status")
        .eq("email", email)
        .not("status", "eq", "LAPSED")
        .maybeSingle();
      if (existing) return json({ applicant_id: existing.applicant_id, status: existing.status, duplicate: true });

      const applicant_id = `APEX-APP-${(await sha256(`${email}|${Date.now()}`)).slice(0, 8).toUpperCase()}`;
      const { error } = await db.from("founding_applications").insert({
        applicant_id,
        display_name,
        email,
        witness_line,
        ack_hash,
        status: "PENDING",
      });
      if (error) return json({ error: "Could not record application" }, 500);
      return json({ applicant_id, status: "PENDING" }, 201);
    }

    // ---------- OWN STATUS (also flips VERIFIED once the email is confirmed) ----------
    if (action === "my-status") {
      const { email } = await callerEmail(req);
      if (!email) return json({ application: null });
      const { data: app } = await db
        .from("founding_applications")
        .select("applicant_id, display_name, email, witness_line, status, seat_number, reserved_at, created_at, ack_hash")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .maybeSingle();
      if (!app) return json({ application: null });

      let record = app;
      if (app.status === "PENDING") {
        const { data: updated } = await db
          .from("founding_applications")
          .update({ email_verified: true, status: "VERIFIED" })
          .eq("applicant_id", app.applicant_id)
          .select("applicant_id, display_name, email, witness_line, status, seat_number, reserved_at, created_at, ack_hash")
          .maybeSingle();
        if (updated) record = updated;
      }
      if (AUTO_APPROVE && record.status === "VERIFIED") {
        const r = await reserveSeat(record.applicant_id);
        if (r.seat) record = { ...record, status: "RESERVED", seat_number: r.seat, reserved_at: new Date().toISOString() };
      }
      let member = null;
      if (record.status === "INSCRIBED" && record.seat_number) {
        const { data: m } = await db
          .from("founding_members")
          .select("seat_number, display_name, receipt_id, leaf_hash, sealed_at")
          .eq("seat_number", record.seat_number)
          .maybeSingle();
        member = m;
      }
      let referral = null;
      if (record.status === "RESERVED" || record.status === "INSCRIBED") {
        const { userId } = await callerEmail(req);
        if (userId) {
          let { data: p } = await db.from("partners").select("id, partner_code").eq("user_id", userId).maybeSingle();
          if (!p) {
            const code = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
            const { data: created } = await db.from("partners").insert({ user_id: userId, partner_code: code, status: "active" }).select("id, partner_code").maybeSingle();
            p = created;
          }
          if (p) {
            const { data: rows } = await db.from("partner_referrals").select("status, commission_amount, referred_email").eq("partner_id", p.id);
            const list = rows ?? [];
            referral = {
              code: p.partner_code,
              earned: list.filter((r: any) => r.status === "paid").reduce((a: number, r: any) => a + Number(r.commission_amount), 0),
              pending: list.filter((r: any) => r.status === "pending").reduce((a: number, r: any) => a + Number(r.commission_amount), 0),
              customers: new Set(list.map((r: any) => r.referred_email)).size,
            };
          }
        }
      }
      return json({ application: record, member, referral });
    }

    // ---------- FIRST WITNESS ACT ----------
    if (action === "witness") {
      const { email } = await callerEmail(req);
      if (!email) return json({ error: "Confirmed email required" }, 401);
      const artifact = String(body.artifact ?? "").trim();
      if (!artifact || artifact.length > 10000) return json({ error: "Paste public text or a URL to witness" }, 400);

      const { data: app } = await db
        .from("founding_applications")
        .select("applicant_id, display_name, seat_number, status, ack_hash")
        .eq("email", email)
        .maybeSingle();
      if (!app) return json({ error: "No application found" }, 404);
      if (app.status !== "RESERVED" || !app.seat_number) return json({ error: "Seat is not reserved" }, 409);

      const leaf = await sha256(artifact);
      const notarizeRes = await fetch(`${SUPABASE_URL}/functions/v1/notarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({
          decision: `FIRST_WITNESS seat=${String(app.seat_number).padStart(3, "0")} ack=${app.ack_hash} artifact=${leaf}`,
          predicate: "FIRST_WITNESS",
          context: { seat_number: app.seat_number, applicant_id: app.applicant_id },
        }),
      });
      if (!notarizeRes.ok) return json({ error: "Notarisation failed" }, 502);
      const receipt = await notarizeRes.json();
      const leafHash = String(receipt.merkle_leaf ?? "").replace("sha256:", "");
      if (!receipt.receipt_id || !/^[0-9a-f]{64}$/.test(leafHash)) {
        return json({ error: "Receipt did not verify" }, 502);
      }

      const { error: mErr } = await db.from("founding_members").insert({
        seat_number: app.seat_number,
        display_name: app.display_name,
        receipt_id: receipt.receipt_id,
        leaf_hash: leafHash,
        ack_hash: app.ack_hash,
      });
      if (mErr) return json({ error: "Seat already inscribed" }, 409);
      await db.from("founding_applications").update({ status: "INSCRIBED" }).eq("applicant_id", app.applicant_id);

      return json({
        seat_number: app.seat_number,
        receipt_id: receipt.receipt_id,
        leaf_hash: leafHash,
        artifact_hash: leaf,
        status: "INSCRIBED",
      }, 201);
    }

    // ---------- OPERATOR ----------
    const { userId } = await callerEmail(req);
    const operator = await isOperator(userId);

    if (action === "admin-list") {
      if (!operator) return json({ error: "Operator login required" }, 403);
      const { data } = await db
        .from("founding_applications")
        .select("applicant_id, display_name, email, witness_line, status, seat_number, created_at")
        .eq("email_verified", true)
        .in("status", ["VERIFIED", "RESERVED", "INSCRIBED", "LAPSED"])
        .order("created_at");
      return json({ applications: data ?? [] });
    }

    if (action === "admin-approve") {
      if (!operator) return json({ error: "Operator login required" }, 403);
      const applicant_id = String(body.applicant_id ?? "");
      const { data: app } = await db
        .from("founding_applications")
        .select("applicant_id, status, email_verified")
        .eq("applicant_id", applicant_id)
        .maybeSingle();
      if (!app || !app.email_verified || app.status !== "VERIFIED") return json({ error: "Not approvable" }, 409);
      const r = await reserveSeat(applicant_id);
      if (r.error) return json({ error: r.error }, 409);
      return json({ applicant_id, seat_number: r.seat, status: "RESERVED" });
    }

    if (action === "admin-reject") {
      if (!operator) return json({ error: "Operator login required" }, 403);
      const applicant_id = String(body.applicant_id ?? "");
      const { error } = await db
        .from("founding_applications")
        .update({ status: "LAPSED" })
        .eq("applicant_id", applicant_id)
        .eq("status", "VERIFIED");
      if (error) return json({ error: "Rejection failed" }, 500);
      return json({ applicant_id, status: "LAPSED" });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("[founding-registry]", err);
    return json({ error: "Internal server error" }, 500);
  }
});
