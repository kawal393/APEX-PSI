import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { DOMAIN_PROFILES, EPISTEMIC_STATES, type DomainProfile } from "@/data/domainProfiles";

// RFC 8785-style canonical form for flat string maps: sorted keys, no whitespace.
function canonical(obj: Record<string, string>) {
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(obj[k])).join(",") + "}";
}
async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ProfileCard({ p }: { p: DomainProfile }) {
  const [json, setJson] = useState(JSON.stringify(p.sample, null, 2));
  const [digest, setDigest] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setErr(null);
    try {
      const obj = JSON.parse(json);
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj)) flat[k] = String(v);
      setDigest(await sha256(canonical(flat)));
    } catch {
      setDigest(null);
      setErr("Not valid JSON.");
    }
  };
  const curl = `curl -X POST https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/notarize \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify({ decision: p.sample })}'`;

  return (
    <article id={p.id} className="border border-border bg-card p-6 scroll-mt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-lg font-bold text-gold">{p.id}</h2>
        <span className="font-mono text-[10px] uppercase tracking-widest border border-border px-2 py-0.5 text-muted-foreground">{p.status}</span>
      </div>
      <p className="mt-1 text-sm uppercase tracking-wider text-foreground">{p.vertical}</p>
      <p className="mt-3 text-sm text-muted-foreground">{p.summary}</p>
      <ul className="mt-4 space-y-1 font-mono text-xs">
        {p.fields.map((f) => (
          <li key={f.name}><span className="text-foreground">{f.name}</span> <span className="text-muted-foreground">— {f.note}</span></li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">Aligns with: {p.alignsWith.join(" · ")}</p>
      <textarea value={json} onChange={(e) => setJson(e.target.value)} rows={5} spellCheck={false}
        className="mt-4 w-full bg-background border border-border p-2 font-mono text-xs text-foreground" aria-label={`${p.id} sample event`} />
      <div className="mt-2 flex flex-wrap gap-3">
        <button onClick={run} className="border border-gold px-3 py-1 font-mono text-xs uppercase tracking-wider text-gold hover:bg-gold/10">Compute digest</button>
        <button onClick={() => { navigator.clipboard.writeText(curl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="border border-border px-3 py-1 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">{copied ? "Copied" : "Copy curl"}</button>
      </div>
      {digest && <p className="mt-2 break-all font-mono text-[11px] text-foreground">SHA-256 (canonical): {digest}</p>}
      {err && <p className="mt-2 font-mono text-[11px] text-destructive">{err}</p>}
    </article>
  );
}

export default function Verticals() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Domain Profiles — 13 Verticals | APEX PSI</title>
        <meta name="description" content="Thirteen open domain profiles for APEX PSI receipts: AI agents, finance, health, software, supply chain, legal custody, energy, industrial, robotics, telecom, media, aerospace and public records." />
      </Helmet>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">Domain profiles</p>
        <h1 className="mt-3 text-4xl md:text-6xl font-black uppercase tracking-tight">One receipt. Thirteen verticals.</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Each profile defines which fields an event commits to. The same canonicalisation, digest, signature and verifier apply in every domain.
          Profiles are open and free to implement. Status shows what exists today: REFERENCE profiles have a worked APEX implementation; PROPOSED profiles await independent implementers.
        </p>
        <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
          "Aligns with" names frameworks a profile is designed to support. It does not claim certification, endorsement or legal sufficiency.
        </p>

        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Profiles">
          {DOMAIN_PROFILES.map((p) => (
            <a key={p.id} href={`#${p.id}`} className="border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-gold">{p.id}</a>
          ))}
        </nav>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          {DOMAIN_PROFILES.map((p) => <ProfileCard key={p.id} p={p} />)}
        </section>

        <section className="mt-20">
          <h2 className="text-2xl md:text-4xl font-black uppercase">Seven evidence states</h2>
          <p className="mt-2 text-sm text-muted-foreground">Results are never reduced to a single true/false. A state is never promoted silently.</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {EPISTEMIC_STATES.map((s) => (
              <div key={s.state} className="border border-border p-4">
                <p className="font-mono text-sm font-bold text-gold">{s.state}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.meaning}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 border border-gold/40 p-6">
          <h2 className="text-xl font-black uppercase">Implement a profile</h2>
          <p className="mt-2 text-sm text-muted-foreground">Verification is free and works offline. Hosted sealing has a free allowance; higher volume is available on paid plans.</p>
          <div className="mt-4 flex flex-wrap gap-4 font-mono text-xs uppercase tracking-wider">
            <Link to="/verify" className="text-gold underline">Verify a receipt</Link>
            <Link to="/api" className="text-gold underline">API reference</Link>
            <Link to="/products" className="text-gold underline">Plans</Link>
            <Link to="/conformance" className="text-gold underline">Conformance</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
