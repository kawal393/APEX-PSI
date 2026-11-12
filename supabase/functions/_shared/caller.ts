// Who is calling an edge function, resolved server-side.
// - service: an internal call from another function or job holding the service key
// - userId / isAdmin: a verified sign-in token, with the admin role read from user_roles
// Never trusts client-supplied role claims.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateCronRequest } from "./cron-auth.ts";

export interface Caller {
  service: boolean;
  userId: string | null;
  isAdmin: boolean;
}

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/** True only when the caller presents this project's service key. */
export function isServiceCall(req: Request): boolean {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = bearerToken(req);
  return !!key && !!token && token === key;
}

/** True only for the platform-managed scheduler (Bearer LOVABLE_CRON_SECRET). */
export function isScheduledJob(req: Request): boolean {
  if (!Deno.env.get("LOVABLE_CRON_SECRET")) return false;
  try {
    return authenticateCronRequest(req) === null;
  } catch {
    return false;
  }
}

/** Another backend function (service key) or the managed scheduler. */
export function isInternalCall(req: Request): boolean {
  return isServiceCall(req) || isScheduledJob(req);
}

export async function resolveCaller(req: Request, db: SupabaseClient = adminClient()): Promise<Caller> {
  if (isServiceCall(req)) return { service: true, userId: null, isAdmin: false };
  const token = bearerToken(req);
  if (!token || token.startsWith("apex_ntry_")) return { service: false, userId: null, isAdmin: false };
  const { data, error } = await db.auth.getUser(token);
  const userId = !error && data?.user ? data.user.id : null;
  if (!userId) return { service: false, userId: null, isAdmin: false };
  const { data: role } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return { service: false, userId, isAdmin: !!role };
}

export async function sha256Hex(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const EMAIL_RE = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,}$/i;
