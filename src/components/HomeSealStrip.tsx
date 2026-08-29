import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Rosette from "@/components/Rosette";

interface Seal {
  commit_id: string | null;
  commit_hash: string | null;
  created_at: string | null;
}

/**
 * The hero line plus a live strip of the six most recent sealed receipts.
 * Only live ledger rows render; if the read fails, the strip says so plainly.
 */
const HomeSealStrip = () => {
  const [seals, setSeals] = useState<Seal[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("gallows_public_ledger")
        .select("commit_id,commit_hash,created_at")
        .not("commit_hash", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);
      if (!active) return;
      if (error) return setError(error.message);
      setSeals((data ?? []) as Seal[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="px-4 py-16 border-t border-border">
      <div className="container mx-auto max-w-6xl">
        <p className="text-center text-lg sm:text-2xl md:text-3xl font-semibold tracking-tight">
          The data is free. The math is public. The seal is Pramaan.
        </p>
        <p className="mt-3 text-center">
          <Link
            to="/declaration"
            className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-gold transition-colors"
          >
            The Recomputation Declaration
          </Link>
        </p>

        <div className="mt-10">
          <h2 className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Six most recent sealed receipts
          </h2>

          {error && (
            <p className="mt-4 text-center font-mono text-xs text-warning">
              ERROR — ledger read unavailable
            </p>
          )}
          {!error && seals.length === 0 && (
            <p className="mt-4 text-center font-mono text-xs text-muted-foreground">Awaiting ledger entries…</p>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {seals.map((s) => (
              <Link
                key={`${s.commit_id}-${s.created_at}`}
                to={`/verify?hash=${s.commit_hash}`}
                className="flex items-center gap-4 rounded-md border border-border bg-card/40 p-4 transition-colors hover:border-gold/50"
              >
                <Rosette hash={s.commit_hash} size={48} />
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[11px] text-foreground">{s.commit_id ?? "—"}</span>
                  <span className="block truncate font-mono text-[10px] text-muted-foreground">
                    {s.created_at ? new Date(s.created_at).toISOString() : "—"}
                  </span>
                  <span className="block truncate font-mono text-[10px] text-muted-foreground">{s.commit_hash}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeSealStrip;
