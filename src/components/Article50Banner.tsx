import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SealCounts {
  total_seals: number;
  approved_seals: number;
  pq_signed_seals: number;
  confirmed_anchors: number;
  ots_proofs: number;
  attestations: number;
}

const DEMO_HASH = "4606e9eee90b89d2fcf9d47c21fb00e558f60bb3c6ddf5955c2d005ae0e3ca7f";

/**
 * Article 50 entry banner. Every number here is read live from the ledger via
 * get_seal_counts() — there are no hardcoded totals anywhere in this component.
 */
const Article50Banner = () => {
  const [counts, setCounts] = useState<SealCounts | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc("get_seal_counts");
      if (!active || error || !data) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setCounts(row as SealCounts);
    })();
    return () => {
      active = false;
    };
  }, []);

  const stats = counts
    ? [
        { label: "Ledger entries", value: counts.total_seals.toLocaleString() },
        { label: "Approved seals", value: counts.approved_seals.toLocaleString() },
        { label: "Timestamp proofs", value: counts.ots_proofs.toLocaleString() },
        counts.confirmed_anchors > 0
          ? { label: "Confirmed BTC anchors", value: counts.confirmed_anchors.toLocaleString() }
          : { label: "Confirmed BTC anchors", value: "0" },
      ]
    : [];

  return (
    <section className="relative px-4 pt-10 pb-2">
      <div className="container mx-auto max-w-5xl">
        <div className="rounded-xl border border-gold/40 bg-gold/[0.05] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gold mb-2 inline-flex items-center gap-2">
                <Scale className="h-3.5 w-3.5" /> EU AI Act Article 50 · Applicable since 2 August 2026
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-foreground leading-tight mb-2">
                Produce machine-verifiable evidence for Article 50 workflows.
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl">
                Article 50 transparency duties apply to specified providers and deployers, subject to the
                Regulation&apos;s scope and exceptions. APEX PSI can issue a signed, independently checkable
                technical receipt; it does not determine legal compliance.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:w-64 shrink-0">
              <Link
                to={`/verify?hash=${DEMO_HASH}`}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-gold text-background font-bold text-sm h-11 px-5 hover:bg-gold/90 transition-colors"
              >
                <ShieldCheck className="h-4 w-4" /> Verify a live receipt
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/eu-ai-act"
                className="text-center text-xs text-muted-foreground hover:text-gold transition-colors"
              >
                Read the Article 50 mapping →
              </Link>
            </div>
          </div>

          {stats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-gold/20">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="text-lg sm:text-xl font-black text-foreground font-mono">{s.value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Article50Banner;
