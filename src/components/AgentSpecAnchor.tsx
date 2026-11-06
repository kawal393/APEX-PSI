import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const DRAFT_ID = "draft-singh-psi-agent-02";
const DRAFT_HASH = "2592edc5dd4634d2ba6ee1c459d45d7372e0c6be358c2d3afe8e6353c43b68a1";
const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface AnchorRow {
  status: string;
  bitcoin_block_height: number | null;
  bitcoin_txid: string | null;
  calendar_url: string | null;
  created_at: string;
}

/**
 * PRIORITY ANCHOR — the public timestamp record for draft-singh-psi-agent-02.
 * Rendered only from the live ots_proofs row. If the Bitcoin block has not
 * confirmed yet, the plaque says so. Absence and pending states are stated,
 * never hidden.
 */
const AgentSpecAnchor = () => {
  const [anchor, setAnchor] = useState<AnchorRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("ots_proofs")
        .select("status, bitcoin_block_height, bitcoin_txid, calendar_url, created_at")
        .eq("commit_id", DRAFT_ID)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      setAnchor((data as AnchorRow) ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const confirmed = anchor?.status === "confirmed" && anchor.bitcoin_block_height != null;

  return (
    <section
      id="agent-02-priority"
      aria-label="Priority anchor for the agent settlement specification"
      className="border-b border-gold/20 px-4 py-16 md:py-20"
    >
      <div className="mx-auto max-w-5xl">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.4em] text-gold">
          Priority of record
        </p>
        <h2 className="mt-4 text-center font-serif text-3xl font-bold tracking-tight md:text-5xl">
          The first specification to bind an agent's
          <span className="block bg-gradient-to-b from-gold via-gold/90 to-gold/50 bg-clip-text text-transparent">
            authority, decision and payment
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground md:text-base">
          <span className="text-foreground">draft-singh-psi-agent-02</span> is the first open
          specification to bind enterprise spend mandates, agent proposals, independent policy
          decisions and financial settlements into a single envelope that anyone can verify
          offline. Published 6 November 2026 — and its fingerprint was submitted to the Bitcoin
          calendar the same day, so the priority date does not depend on our say-so.
        </p>

        <dl className="mx-auto mt-10 max-w-3xl space-y-4 rounded-lg border border-border bg-card/40 p-6 font-mono text-sm md:p-8">
          <div className="grid gap-1 md:grid-cols-[240px_1fr]">
            <dt className="text-muted-foreground">Specification</dt>
            <dd className="text-foreground">{DRAFT_ID} — Binding Decisions and Settlements to Agent Action Records</dd>
          </div>
          <div className="grid gap-1 md:grid-cols-[240px_1fr]">
            <dt className="text-muted-foreground">SHA-256 fingerprint</dt>
            <dd className="break-all text-foreground">{DRAFT_HASH}</dd>
          </div>
          <div className="grid gap-1 md:grid-cols-[240px_1fr]">
            <dt className="text-muted-foreground">Bitcoin anchor</dt>
            <dd className="text-foreground">
              {loading && "Reading the ledger…"}
              {!loading && !anchor && "No anchor recorded. Absence is also a record."}
              {!loading && anchor && confirmed && (
                <>
                  Confirmed in block #{anchor.bitcoin_block_height!.toLocaleString("en-US")}
                </>
              )}
              {!loading && anchor && !confirmed && (
                <>
                  Pending — accepted by the OpenTimestamps calendar on{" "}
                  {new Date(anchor.created_at).toISOString().slice(0, 10)}, awaiting inclusion in a
                  Bitcoin block. This line upgrades itself when the block confirms.
                </>
              )}
            </dd>
          </div>
          {!loading && anchor?.bitcoin_txid && (
            <div className="grid gap-1 md:grid-cols-[240px_1fr]">
              <dt className="text-muted-foreground">Attesting transaction</dt>
              <dd className="break-all text-foreground">{anchor.bitcoin_txid}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href={`/ietf/${DRAFT_ID}.txt`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-gold bg-gold px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-background transition-colors hover:bg-transparent hover:text-gold"
          >
            Read the specification
          </a>
          <a
            href={`${FN_BASE}/ots-proof?hash=${DRAFT_HASH}`}
            className="border border-gold/50 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-gold transition-colors hover:bg-gold/10"
          >
            Download the .ots proof
          </a>
          <Link
            to="/drafts"
            className="border border-border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/90 transition-colors hover:border-gold/40"
          >
            All drafts
          </Link>
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center font-mono text-[10px] leading-relaxed text-muted-foreground">
          Verify without trusting this website: download the specification and the .ots file, then
          run <span className="text-foreground">sha256sum</span> on the draft and{" "}
          <span className="text-foreground">ots verify</span> from the OpenTimestamps reference
          client. The fingerprint above is computed from the served file, not typed by hand.
        </p>
      </div>
    </section>
  );
};

export default AgentSpecAnchor;
