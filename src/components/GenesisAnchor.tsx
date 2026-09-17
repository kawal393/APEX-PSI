import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StatusBadge from "@/components/StatusBadge";

interface Anchor {
  target_hash: string;
  commit_id: string | null;
  bitcoin_block_height: number | null;
  bitcoin_txid: string | null;
  confirmations: number | null;
  calendar_url: string | null;
  created_at: string;
  status: string;
}

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/**
 * THE GENESIS ANCHOR — rendered only from the earliest confirmed OpenTimestamps
 * record in the ledger. Nothing is hardcoded; if no confirmed anchor exists,
 * the absence is stated.
 */
const GenesisAnchor = () => {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("ots_proofs")
        .select(
          "target_hash, commit_id, bitcoin_block_height, bitcoin_txid, confirmations, calendar_url, created_at, status",
        )
        .eq("status", "confirmed")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      setAnchor((data as Anchor) ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rows = anchor
    ? [
        { label: "Anchored digest", value: anchor.target_hash },
        { label: "Anchor reference", value: anchor.commit_id ?? "—" },
        {
          label: "Bitcoin block",
          value: anchor.bitcoin_block_height
            ? `#${anchor.bitcoin_block_height.toLocaleString("en-US")}`
            : "—",
        },
        { label: "Attesting transaction", value: anchor.bitcoin_txid ?? "—" },
        {
          label: "Confirmations at last poll",
          value: anchor.confirmations != null ? String(anchor.confirmations) : "—",
        },
        { label: "Calendar", value: anchor.calendar_url ?? "—" },
        {
          label: "Submitted",
          value: new Date(anchor.created_at).toISOString().replace("T", " ").slice(0, 19) + " UTC",
        },
      ]
    : [];

  return (
    <section id="genesis-anchor" className="px-4 py-20 border-y border-border/60">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold">
            The Genesis anchor
          </p>
          <StatusBadge status="PRODUCTION" />
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight">
          Where verifiable history begins.
        </h2>

        {loading && (
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Reading the ledger…
          </p>
        )}

        {!loading && !anchor && (
          <p className="mt-6 rounded-lg border border-border bg-card/40 p-6 font-mono text-sm text-muted-foreground">
            NO CONFIRMED BITCOIN ANCHOR RECORDED. Absence is also a record.
          </p>
        )}

        {anchor && (
          <>
            <p className="mt-5 max-w-3xl text-sm md:text-base text-muted-foreground leading-relaxed">
              The earliest confirmed OpenTimestamps attestation held in the ledger. The digest
              below commits to a Merkle root of sealed records; the attestation places that digest
              in a Bitcoin block that no one can rewrite.
            </p>

            <dl className="mt-10 rounded-lg border border-border bg-card/40 p-6 md:p-8 space-y-4 font-mono text-sm">
              {rows.map((r) => (
                <div key={r.label} className="grid gap-1 md:grid-cols-[240px_1fr]">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className="text-foreground break-all">{r.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`${FN_BASE}/ots-proof?hash=${anchor.target_hash}`}
                className="border border-gold/50 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-gold hover:bg-gold/10 transition-colors"
              >
                Download the .ots proof
              </a>
              {anchor.bitcoin_txid && (
                <a
                  href={`https://mempool.space/tx/${anchor.bitcoin_txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/90 hover:border-gold/40 transition-colors"
                >
                  Inspect the Bitcoin block
                </a>
              )}
            </div>

            <p className="mt-5 max-w-3xl font-mono text-[10px] leading-relaxed text-muted-foreground">
              Verify this without trusting this website: download the .ots file and run
              <span className="text-foreground"> ots verify </span>
              from the OpenTimestamps reference client against the anchored digest. The transaction
              shown is the Bitcoin transaction recorded for the attesting block; the .ots file is
              the authoritative proof and the only thing you need.
            </p>
          </>
        )}
      </div>
    </section>
  );
};

export default GenesisAnchor;
