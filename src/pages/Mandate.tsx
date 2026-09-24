import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const FIELDS = ["allowed", "integrity_verified", "pq_verified", "timestamp_anchor"] as const;
const URL_BASE = import.meta.env.VITE_SUPABASE_URL;

const show = (v: unknown) =>
  v === undefined || v === null ? "SEAL PENDING" : typeof v === "object" ? JSON.stringify(v) : String(v);

const Mandate = () => {
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
        <link rel="canonical" href="https://ai-governance-standard.com/mandate" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-16">
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-gold">Authorize</p>
          <h1 className="mt-4 font-serif text-4xl md:text-6xl">Ask before you act.</h1>
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
