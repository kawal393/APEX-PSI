import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  title?: string;
}

/**
 * Live install/activity counter. Ledger receipts are read live from the
 * ledger; install figures are not yet instrumented, so they are shown as
 * honest placeholders rather than invented numbers.
 */
const InstallCounter = ({ title = "Protocol activity" }: Props) => {
  const [receipts, setReceipts] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc("get_seal_counts");
      if (!active || error || !data) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.total_seals != null) setReceipts(Number(row.total_seals));
    })();
    return () => {
      active = false;
    };
  }, []);

  const cells = [
    { label: "Ledger receipts", value: receipts != null ? receipts.toLocaleString() : "—", live: true },
    { label: "Active installs", value: "Growing", live: false },
    { label: "Installs this week", value: "X+", live: false },
    { label: "Countries", value: "X+", live: false },
  ];

  return (
    <div className="rounded-xl border border-gold/30 bg-gold/[0.04] p-4 sm:p-5">
      <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gold mb-3 inline-flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        {title}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cells.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-background/60 px-3 py-2.5">
            <p className="text-lg sm:text-xl font-black text-foreground leading-none mb-1">{c.value}</p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground flex items-center gap-1.5">
        <Activity className="h-3 w-3 text-gold" />
        Ledger receipts read live. Install telemetry is opt-in and not yet published — placeholders shown (updated weekly).
      </p>
    </div>
  );
};

export default InstallCounter;
