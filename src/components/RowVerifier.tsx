import { useState } from "react";
import Rosette from "@/components/Rosette";
import { Button } from "@/components/ui/button";

type State = "idle" | "working" | "match" | "mismatch" | "error";

interface RowVerifierProps {
  /** Raw bytes URL of the sealed artifact. */
  rawUrl: string;
  /** Expected SHA-256 of the artifact document. */
  expectedHash: string;
}

const sha256Hex = async (bytes: ArrayBuffer) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/** VERIFY THIS ROW — fetches the sealed bytes, recomputes SHA-256 in the browser, compares. */
const RowVerifier = ({ rawUrl, expectedHash }: RowVerifierProps) => {
  const [state, setState] = useState<State>("idle");
  const [computed, setComputed] = useState<string | null>(null);

  const run = async () => {
    setState("working");
    setComputed(null);
    try {
      const res = await fetch(rawUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const hex = await sha256Hex(await res.arrayBuffer());
      setComputed(hex);
      setState(hex === expectedHash.toLowerCase() ? "match" : "mismatch");
    } catch {
      setState("error");
    }
  };

  const verdict =
    state === "match"
      ? { label: "MATCH", line: "the bytes agree", cls: "text-gold border-gold/40 bg-gold/[0.06]" }
      : state === "mismatch"
        ? {
            label: "MISMATCH",
            line: "the bytes disagree",
            cls: "text-destructive border-destructive/40 bg-destructive/[0.06]",
          }
        : state === "error"
          ? {
              label: "ERROR",
              line: "could not fetch or compute",
              cls: "text-muted-foreground border-border bg-muted/10",
            }
          : null;

  return (
    <div className="mt-6 border-t border-border/40 pt-6">
      <Button variant="outline" size="sm" onClick={run} disabled={state === "working"}>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
          {state === "working" ? "Recomputing…" : "Verify this row"}
        </span>
      </Button>

      {verdict && (
        <div className={`mt-6 rounded-lg border p-6 ${verdict.cls}`}>
          <p className="font-mono text-xs uppercase tracking-[0.25em]">{verdict.label}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{verdict.line}</p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Sealed
              </p>
              <Rosette hash={expectedHash} size={96} className="mt-3" />
              <p className="mt-3 font-mono text-[10px] break-all text-muted-foreground">
                {expectedHash}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Recomputed
              </p>
              <Rosette
                hash={computed}
                size={96}
                className="mt-3"
                state={state === "match" ? "sealed" : state === "mismatch" ? "mismatch" : "pending"}
              />
              <p className="mt-3 font-mono text-[10px] break-all text-muted-foreground">
                {computed ?? "—"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RowVerifier;
