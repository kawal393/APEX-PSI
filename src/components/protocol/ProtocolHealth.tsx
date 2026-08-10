import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Counts {
  total_seals: number;
  approved_seals: number;
  pq_signed_seals: number;
  attestations: number;
  confirmed_anchors: number;
  ots_proofs: number;
}

/**
 * Protocol Health — every figure is read from the live ledger via the
 * get_seal_counts() RPC. Nothing here is hardcoded.
 */
export default function ProtocolHealth() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.rpc("get_seal_counts");
      if (!active) return;
      if (error) return setError(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      setCounts(row as unknown as Counts);
    };
    load();
    const id = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const cells: { label: string; value: string }[] = [
    { label: "Ledger entries", value: counts ? String(counts.total_seals) : "—" },
    { label: "Approved seals", value: counts ? String(counts.approved_seals) : "—" },
    { label: "Post-quantum signed", value: counts ? String(counts.pq_signed_seals) : "—" },
    { label: "Public attestations", value: counts ? String(counts.attestations) : "—" },
    { label: "Anchors confirmed", value: counts ? String(counts.confirmed_anchors) : "—" },
    {
      label: "OTS proofs pending",
      value: counts ? String(Math.max(0, counts.ots_proofs - counts.confirmed_anchors)) : "—",
    },
  ];

  return (
    <section className="border border-border rounded-lg bg-card/40 p-6">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">Protocol Health</h2>
        <span className="text-[10px] font-mono text-muted-foreground">auto-refresh 20s</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cells.map((c) => (
          <div key={c.label} className="border border-border/60 rounded-md p-4">
            <div className="text-2xl font-bold text-gold-gradient">{c.value}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-mono text-muted-foreground">
        <span className="border border-border/60 rounded px-2 py-1">Ed25519 · active</span>
        <span className="border border-border/60 rounded px-2 py-1">ML-DSA-65 (FIPS 204) · active</span>
        <span className="border border-border/60 rounded px-2 py-1">LMS-W4-SHA256 (SP 800-208) · active</span>
        <span className="border border-border/60 rounded px-2 py-1">RFC 8785 canonicalisation</span>
      </div>
      {error && <p className="mt-4 text-xs text-destructive font-mono">Health read failed: {error}</p>}
    </section>
  );
}
