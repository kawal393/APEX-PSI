import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; source: string; source_id: string; title: string; source_url: string; content_hash: string; observed_at: string };
type Change = { id: string; source: string; source_id: string; earlier_hash: string; later_hash: string; earlier_observed_at: string; later_observed_at: string };

export default function Witness() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState(false);
  const [changes, setChanges] = useState<Change[]>([]);
  useEffect(() => {
    (supabase as any).from("public_witness_records").select("*").order("observed_at", { ascending: false }).limit(100)
      .then(({ data, error }: { data: Row[] | null; error: unknown }) => { if (error) setErr(true); else setRows(data ?? []); });
    (supabase as any).from("witness_contradictions").select("*").order("created_at", { ascending: false }).limit(50)
      .then(({ data }: { data: Change[] | null }) => setChanges(data ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Public Witness — APEX PSI</title>
        <meta name="description" content="Hourly SHA-256 fingerprints of open public records: software releases and clinical trial registrations." />
      </Helmet>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-16">
        <p className="font-mono text-xs tracking-widest text-gold">PUBLIC WITNESS · LIVE</p>
        <h1 className="mt-2 text-4xl md:text-6xl font-bold uppercase tracking-tight">Public Witness</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Every hour, an automated observer reads a small set of open public sources — npm and PyPI release metadata,
          and recently updated ClinicalTrials.gov registrations — and records the SHA-256 fingerprint of each record's
          canonical form. If a source later changes, a new fingerprint appears beside the old one. Both are kept.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          A fingerprint shows what a public record looked like when observed. It does not show the record is true,
          accurate or lawful. No personal data is collected.
        </p>

        <div className="mt-10 border border-border">
          {err && <p className="p-6 font-mono text-sm">Records temporarily unavailable.</p>}
          {!err && rows === null && <p className="p-6 font-mono text-sm">Loading…</p>}
          {rows?.length === 0 && <p className="p-6 font-mono text-sm">First observation pending.</p>}
          {rows && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead className="text-left text-muted-foreground border-b border-border">
                  <tr><th className="p-3">Observed (UTC)</th><th className="p-3">Source</th><th className="p-3">Record</th><th className="p-3">SHA-256</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="p-3 whitespace-nowrap">{r.observed_at.slice(0, 16).replace("T", " ")}</td>
                      <td className="p-3 uppercase text-gold">{r.source}</td>
                      <td className="p-3"><a href={r.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-gold underline-offset-2 hover:underline">{r.title}</a></td>
                      <td className="p-3 text-xs break-all text-muted-foreground">{r.content_hash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <h2 className="mt-14 text-2xl font-bold uppercase tracking-tight">Change Records</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">When a record already observed comes back with a different fingerprint, both versions are kept here, with both times. A change is a fact about the record, not a judgement about why it changed.</p>
        <div className="mt-4 border border-border">
          {changes.length === 0 ? <p className="p-6 font-mono text-sm">No changes observed yet.</p> : changes.map((c) => (
            <div key={c.id} className="p-4 border-b border-border/50 font-mono text-xs space-y-1">
              <p className="text-gold uppercase">{c.source} · {c.source_id}</p>
              <p className="break-all">EARLIER {c.earlier_observed_at.slice(0, 16).replace("T", " ")} · {c.earlier_hash}</p>
              <p className="break-all">LATER {c.later_observed_at.slice(0, 16).replace("T", " ")} · {c.later_hash}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
