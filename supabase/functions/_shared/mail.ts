// Shared transactional mailer. Tries the branded sender, falls back to the
// Resend sandbox sender so operator notices are never lost.
export const OPERATOR_EMAIL = "apex.manraj888@gmail.com";
const FROM_ADDRESS = "APEX PSI <noreply@apex-infrastructure.com>";
const FALLBACK_FROM = "APEX PSI <onboarding@resend.dev>";

export const FOOTER_HTML =
  `<p style="font-size:11px;color:#888;margin-top:24px">Operated by ROCKYFILMS888 PTY LTD trading as Apex Intelligence Empire (ABN 71 672 237 795). Not a nation, state, government or sovereign entity; confers no citizenship. Nothing here is legal or financial advice.</p>`;

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return false;
  const send = (from: string) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html: html + FOOTER_HTML }),
    }).catch(() => null);
  const r = await send(FROM_ADDRESS);
  if (r?.ok) return true;
  if (r) console.error(`mail branded failed [${r.status}]: ${await r.text()}`);
  const r2 = await send(FALLBACK_FROM);
  if (r2 && !r2.ok) console.error(`mail fallback failed [${r2.status}]: ${await r2.text()}`);
  return Boolean(r2?.ok);
}

/** Returns the banned terms found in text (case-insensitive). */
export function findBanned(text: string, banned: string[]): string[] {
  const t = text.toLowerCase();
  return banned.filter((b) => b && t.includes(b.toLowerCase()));
}
