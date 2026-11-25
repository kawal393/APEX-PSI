import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import "@/i18n/gate";

const FIELDS = ["allowed", "reason", "integrity_verified", "pq_verified", "authority", "timestamp_anchor"] as const;
const URL_BASE = import.meta.env.VITE_SUPABASE_URL;

const show = (v: unknown) =>
  v === undefined || v === null ? "SEAL PENDING" : typeof v === "object" ? JSON.stringify(v) : String(v);

const Mandate = () => {
  const { t } = useTranslation("gate");
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const check = async () => {
    if (!id.trim()) return;
    setBusy(true); setErr(null); setRes(null);
    try {
      const r = await fetch(`${URL_BASE}/functions/v1/verify-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ receipt_id: id.trim() }),
      });
      setRes(await r.json());
    } catch {
      setErr("The check could not be reached. Try again.");
    } finally { setBusy(false); }
  };

  return (
    <>
      <Helmet>
        <title>Ask Before You Act — APEX PSI</title>
        <meta name="description" content="A pre-action gate: an AI asks before it acts, and the receiver checks the receipt before obeying." />
        <link rel="canonical" href="https://www.ai-governance-standard.com/mandate" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-16">
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-gold">Authorize</p>
          <h1 className="mt-4 font-serif text-4xl md:text-6xl">Ask before you act.</h1>
          <Button asChild variant="link" className="mt-4"><Link to="/gate">{t("title")}</Link></Button>
          <ol className="mt-8 space-y-3 text-foreground/85">
            <li>1. An AI asks for a receipt before it does something.</li>
            <li>2. Whoever receives the action checks that receipt before they obey.</li>
            <li>3. No valid receipt means the action is refused by default.</li>
          </ol>

          <section className="mt-12 border border-gold/30 p-6">
            <label htmlFor="rid" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Receipt ID</label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input id="rid" value={id} onChange={(e) => setId(e.target.value)} onKeyDown={(e) => e.key === "Enter" && check()}
                className="flex-1 border border-border bg-background px-3 py-3 font-mono text-sm" placeholder="receipt_id" />
              <button onClick={check} disabled={busy}
                className="border border-gold bg-gold px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-background disabled:opacity-50">
                {busy ? "Checking" : "Check"}
              </button>
            </div>
            {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
            {res && (
              <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-sm">
                {FIELDS.map((f) => (
                  <div key={f} className="contents">
                    <dt className="text-muted-foreground">{f}</dt>
                    <dd className="break-all">{show(res[f])}</dd>
                  </div>
                ))}
                {typeof res.error === "string" && (<><dt className="text-muted-foreground">note</dt><dd>{res.error}</dd></>)}
              </dl>
            )}
          </section>
          <section className="mt-12">
            <h2 className="font-serif text-2xl md:text-3xl">Bind who was allowed to act.</h2>
            <p className="mt-3 text-foreground/85">
              A receipt can carry the role the agent claimed, a fingerprint of the exact policy in force, and the grant that
              delegated it. All of it is signed with the receipt, so nobody can change it afterwards.
            </p>
            <pre className="mt-4 overflow-x-auto border border-border p-4 font-mono text-xs">{`POST /functions/v1/authorize
{
  "agent_id": "claims-agent-7",
  "action_type": "execute-payment",
  "intent": { "claim": "C-1042", "amount": 1200 },
  "authority": {
    "role": "claims_adjuster_l2",
    "policy_hash": "sha256:<fingerprint of the policy document>",
    "delegated_by": "ops-lead-3",
    "delegation_ref": "GRANT-2026-118"
  }
}`}</pre>
            <p className="mt-4 text-foreground/85">
              The receiver checks the receipt and states what it expects. Any difference refuses the action.
            </p>
            <pre className="mt-4 overflow-x-auto border border-border p-4 font-mono text-xs">{`POST /functions/v1/verify-action
{ "receipt_id": "APEX-ACT-…", "claims": { "role": "claims_adjuster_l2", "policy_hash": "sha256:…" } }
→ "allowed": false, "reason": "authority_mismatch"   (when either differs)`}</pre>
            <p className="mt-4 text-sm text-muted-foreground">
              APEX records the authority as it was declared. It does not check it against your staff or access records — compare it
              with your own before you obey.
            </p>
          </section>
          <p className="mt-10 text-sm text-muted-foreground">
            This record certifies existence, timestamp and integrity — not the truth of any claim. The ledger does not judge. It remembers.
          </p>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Mandate;
