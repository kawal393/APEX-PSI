import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AnchorState, { type AnchorInput } from "@/components/psi/AnchorState";

interface Entry {
  commit_id: string;
  commit_hash: string;
  status: string | null;
  created_at: string;
  ed25519_signature: string | null;
  pq_signature: unknown;
  merkle_root: string | null;
}

/**
 * Live Seal Stream — real-time feed of the evidence ledger.
 * Rows arrive over Realtime; anchor state is read from ots_proofs and rendered
 * in exactly three states: confirmed, submitted, or not anchored.
 */
export default function LiveSealStream() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [anchors, setAnchors] = useState<Record<string, AnchorInput>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("gallows_public_ledger")
        .select("commit_id,commit_hash,status,created_at,ed25519_signature,pq_signature,merkle_root")
        .order("created_at", { ascending: false })
        .limit(25);
      if (!active) return;
      if (error) return setError(error.message);
      setEntries((data ?? []) as Entry[]);

      const { data: proofs } = await supabase
        .from("ots_proofs")
        .select("commit_id,status,bitcoin_txid,bitcoin_block_height,confirmations,submitted_at,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!active || !proofs) return;
      const map: Record<string, AnchorInput> = {};
      for (const p of proofs) {
        if (!map[p.commit_id]) map[p.commit_id] = p as AnchorInput;
      }
      setAnchors(map);
    };

    load();

    const channel = supabase
      .channel("live-seal-stream")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gallows_ledger" }, (payload) => {
        setEntries((prev) => [payload.new as Entry, ...prev].slice(0, 25));
      })
      .subscribe();

    const id = setInterval(load, 30000);

    return () => {
      active = false;
      clearInterval(id);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <section className="border border-border rounded-lg bg-card/40 p-6">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">Live Seal Stream</h2>
        <span className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" /> realtime
        </span>
      </div>

      {error && <p className="text-xs text-destructive font-mono mb-3">Stream read failed: {error}</p>}

      <div className="space-y-2">
        {entries.length === 0 && !error && (
          <p className="text-xs font-mono text-muted-foreground">Awaiting ledger entries…</p>
        )}
        {entries.map((e) => {
          const anchor = anchors[e.commit_id];
          return (
            <div
              key={e.commit_id + e.created_at}
              className="grid md:grid-cols-[1fr_auto] gap-2 border border-border/60 rounded-md p-3"
            >
              <div className="min-w-0">
                <div className="font-mono text-xs text-foreground truncate">{e.commit_hash}</div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">
                  {new Date(e.created_at).toISOString()} · {e.commit_id}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                <span className="border border-border/60 rounded px-1.5 py-0.5">{e.status ?? "UNRECORDED"}</span>
                {e.ed25519_signature && <span className="border border-border/60 rounded px-1.5 py-0.5">Ed25519</span>}
                {e.pq_signature ? (
                  <span className="border border-gold/40 text-gold rounded px-1.5 py-0.5">PQ signed</span>
                ) : (
                  <span className="border border-border/60 rounded px-1.5 py-0.5 text-muted-foreground">PQ absent</span>
                )}
                <AnchorState anchor={anchor} variant="inline" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
