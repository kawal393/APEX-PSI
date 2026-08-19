import { Bitcoin, CheckCircle2, Clock, MinusCircle } from "lucide-react";

/**
 * Three-state Bitcoin anchor display. There is no fourth state and no
 * "pending" language for a record that was never submitted.
 *
 *  CONFIRMED     — a real block includes the txid.
 *  SUBMITTED     — a txid exists but no block confirms it yet.
 *  NOT ANCHORED  — no txid exists. Nothing is claimed.
 */
export type AnchorPhase = "CONFIRMED" | "SUBMITTED" | "NOT_ANCHORED";

export interface AnchorInput {
  status?: string | null;
  bitcoin_txid?: string | null;
  bitcoin_block_height?: number | null;
  confirmations?: number | null;
  submitted_at?: string | null;
  created_at?: string | null;
}

export function anchorPhase(anchor?: AnchorInput | null): AnchorPhase {
  if (!anchor || !anchor.bitcoin_txid) return "NOT_ANCHORED";
  if (
    anchor.status === "confirmed" &&
    typeof anchor.bitcoin_block_height === "number" &&
    anchor.bitcoin_block_height > 0
  ) {
    return "CONFIRMED";
  }
  return "SUBMITTED";
}

export const shortTxid = (txid: string) =>
  txid.length > 16 ? `${txid.slice(0, 8)}…${txid.slice(-8)}` : txid;

/** Exact, non-negotiable wording for each state. */
export function anchorSentence(anchor?: AnchorInput | null): string {
  const phase = anchorPhase(anchor);
  if (phase === "NOT_ANCHORED") return "No Bitcoin anchor for this record yet.";
  const txid = anchor!.bitcoin_txid as string;
  if (phase === "CONFIRMED") {
    const n = typeof anchor!.confirmations === "number" && anchor!.confirmations > 0 ? anchor!.confirmations : 1;
    return `Anchored in Bitcoin block ${anchor!.bitcoin_block_height} — ${n} confirmations. Txid ${shortTxid(txid)}.`;
  }
  const stamp = anchor!.submitted_at ?? anchor!.created_at;
  const time = stamp ? new Date(stamp).toISOString().replace(".000", "") : "at an unrecorded time";
  return `Anchor submitted ${time} — txid ${shortTxid(txid)} — awaiting first confirmation (typically under 1 hour).`;
}

const TONE: Record<AnchorPhase, { text: string; border: string; Icon: typeof CheckCircle2; label: string }> = {
  CONFIRMED: { text: "text-compliant", border: "border-compliant/30 bg-compliant/5", Icon: CheckCircle2, label: "CONFIRMED" },
  SUBMITTED: { text: "text-warning", border: "border-warning/30 bg-warning/5", Icon: Clock, label: "SUBMITTED" },
  NOT_ANCHORED: { text: "text-muted-foreground", border: "border-border bg-background/50", Icon: MinusCircle, label: "NOT ANCHORED" },
};

interface Props {
  anchor?: AnchorInput | null;
  /** "card" for full receipt views, "inline" for dense ledger rows. */
  variant?: "card" | "inline";
  children?: React.ReactNode;
}

const AnchorState = ({ anchor, variant = "card", children }: Props) => {
  const phase = anchorPhase(anchor);
  const tone = TONE[phase];
  const sentence = anchorSentence(anchor);
  const txid = anchor?.bitcoin_txid ?? null;

  if (variant === "inline") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono ${tone.border} ${tone.text}`}
        title={sentence}
      >
        <tone.Icon className="h-2.5 w-2.5" />
        {phase === "CONFIRMED" && txid ? (
          <a
            href={`https://mempool.space/tx/${txid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            block {anchor?.bitcoin_block_height} · {anchor?.confirmations ?? 1} conf ↗
          </a>
        ) : (
          tone.label.toLowerCase()
        )}
      </span>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${tone.border}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Bitcoin className="h-4 w-4 text-gold" />
        <p className="text-xs font-bold text-foreground">Bitcoin timestamp anchor</p>
        <span className={`ml-auto text-[10px] font-mono uppercase tracking-[0.15em] ${tone.text}`}>
          {tone.label}
        </span>
      </div>
      <p className={`text-[11px] font-bold ${tone.text}`}>{sentence}</p>
      {phase === "NOT_ANCHORED" && (
        <p className="text-[11px] text-warning font-mono mt-1.5">Bitcoin anchoring: absent</p>
      )}
      {phase !== "NOT_ANCHORED" && txid && (
        <p className="text-[10px] font-mono text-muted-foreground break-all mt-1.5">txid {txid}</p>
      )}
      {children && <div className="mt-2 flex flex-wrap gap-3">{children}</div>}
    </div>
  );
};

export default AnchorState;
