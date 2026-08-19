import { useState } from "react";
import { Link2, Download, ShieldCheck, ShieldAlert, ExternalLink, GitBranch } from "lucide-react";
import AnchorState from "@/components/psi/AnchorState";

export interface MerkleProofStep {
  hash: string;
  position: "left" | "right";
}

export interface TimestampAnchor {
  status: string;
  calendar_url?: string | null;
  bitcoin_block_height?: number | null;
  bitcoin_txid?: string | null;
  confirmations?: number | null;
  submitted_at?: string | null;
  created_at?: string | null;
  explorer_url?: string | null;
  ots_download_url?: string | null;
}

export interface ProofReceiptData {
  merkle_root?: string | null;
  merkle_proof?: MerkleProofStep[] | null;
  signed_payload?: string | null;
  post_quantum?: boolean;
  pq_verified?: boolean | null;
  pq_error?: string | null;
  pq_algorithm?: string | null;
  pq_standard?: string | null;
  pq_public_key?: string | null;
  timestamp_anchor?: TimestampAnchor | null;
}

/**
 * Receipt view rendered after a successful ledger verification.
 * Every field here comes from the live verify-hash response — the Merkle path,
 * the stored .ots proof, and the real Bitcoin transaction once a block lands.
 */
const ProofReceipt = ({ data }: { data: ProofReceiptData }) => {
  const [showPath, setShowPath] = useState(false);
  const anchor = data.timestamp_anchor;
  const path = data.merkle_proof ?? [];

  return (
    <div className="border-t border-border px-6 py-5 space-y-4">
      <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
        Cryptographic Receipt
      </p>

      {/* Post-quantum verification — real result, loud on failure */}
      {data.post_quantum ? (
        <div
          className={`rounded-lg border p-3 ${
            data.pq_verified
              ? "border-compliant/30 bg-compliant/5"
              : "border-destructive/40 bg-destructive/5"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {data.pq_verified ? (
              <ShieldCheck className="h-4 w-4 text-compliant" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-destructive" />
            )}
            <p
              className={`text-xs font-bold ${
                data.pq_verified ? "text-compliant" : "text-destructive"
              }`}
            >
              {data.pq_verified
                ? "POST-QUANTUM SIGNATURE VALID"
                : "POST-QUANTUM SIGNATURE INVALID"}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            {data.pq_algorithm ?? "LMS-W4-SHA256"}
            {data.pq_standard ? ` · ${data.pq_standard}` : ""}
          </p>
          {data.pq_error && (
            <p className="text-[11px] text-destructive mt-1">{data.pq_error}</p>
          )}
          {data.pq_public_key && (
            <p className="text-[10px] font-mono text-muted-foreground break-all mt-1">
              root: {data.pq_public_key}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <p className="text-xs text-muted-foreground">
            This entry predates the post-quantum signing layer, so it carries a SHA-256 +
            Ed25519 proof only. No post-quantum claim is made for it.
          </p>
        </div>
      )}

      {/* Merkle proof path */}
      {path.length > 0 && (
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <button
            onClick={() => setShowPath((v) => !v)}
            className="flex items-center gap-2 text-xs font-bold text-foreground bg-transparent border-none cursor-pointer p-0"
          >
            <GitBranch className="h-3.5 w-3.5 text-primary" />
            Merkle proof path — {path.length} step{path.length === 1 ? "" : "s"}
            <span className="text-muted-foreground font-normal">
              {showPath ? "(hide)" : "(show)"}
            </span>
          </button>
          {showPath && (
            <div className="mt-3 space-y-1.5">
              {data.signed_payload && (
                <p className="text-[10px] font-mono text-muted-foreground break-all">
                  leaf · {data.signed_payload}
                </p>
              )}
              {path.map((step, i) => (
                <div key={`${step.hash}-${i}`} className="flex items-start gap-2">
                  <span className="text-[10px] font-mono text-primary shrink-0 w-14">
                    {step.position === "left" ? "◀ left" : "right ▶"}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground break-all">
                    {step.hash}
                  </span>
                </div>
              ))}
              {data.merkle_root && (
                <p className="text-[10px] font-mono text-gold break-all pt-1">
                  root · {data.merkle_root}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bitcoin / OpenTimestamps anchor — exactly three states, never a fourth */}
      <AnchorState anchor={anchor}>
        {anchor?.bitcoin_txid && (
          <a
            href={anchor.explorer_url ?? `https://mempool.space/tx/${anchor.bitcoin_txid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" /> View on mempool.space
          </a>
        )}
        {anchor?.ots_download_url && (
          <a
            href={anchor.ots_download_url}
            className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
          >
            <Download className="h-3 w-3" /> Download .ots proof
          </a>
        )}
        {anchor?.calendar_url && (
          <span className="text-[11px] text-muted-foreground font-mono inline-flex items-center gap-1">
            <Link2 className="h-3 w-3" /> {anchor.calendar_url}
          </span>
        )}
      </AnchorState>
    </div>
  );
};

export default ProofReceipt;
