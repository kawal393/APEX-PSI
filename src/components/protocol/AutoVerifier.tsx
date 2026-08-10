import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const VERIFY_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/verify-hash`;

/**
 * Autonomous verification agent. A visitor — or an AI agent over the same
 * public endpoint — submits a hash, the ledger is queried, and the signed
 * attestation bundle is returned with no human in the loop.
 */
export default function AutoVerifier() {
  const [hash, setHash] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${VERIFY_URL}?hash=${encodeURIComponent(clean)}`);
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border border-border rounded-lg bg-card/40 p-6">
      <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
        Autonomous Verification Agent
      </h2>
      <p className="text-xs text-muted-foreground mb-4 max-w-2xl">
        Submit any SHA-256 hash or commit ID. The agent queries the ledger, recomputes the post-quantum
        signature and returns the attestation bundle — the same endpoint humans and AI agents use.
      </p>
      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(hash);
        }}
      >
        <Input
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          placeholder="sha256 hash or commit id"
          className="font-mono text-xs"
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Verifying…" : "Verify"}
        </Button>
      </form>

      {error && <p className="mt-3 text-xs font-mono text-destructive">{error}</p>}

      {result && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-1.5 text-[10px] font-mono mb-3">
            <span className="border border-border/60 rounded px-1.5 py-0.5">
              {result.found ? "FOUND IN LEDGER" : "NOT IN LEDGER"}
            </span>
            {result.ed25519_signature ? (
              <span className="border border-border/60 rounded px-1.5 py-0.5">Ed25519</span>
            ) : null}
            {result.pq_algorithm ? (
              <span className="border border-gold/40 text-gold rounded px-1.5 py-0.5">
                {String(result.pq_algorithm)}
              </span>
            ) : null}
          </div>
          <pre className="max-h-72 overflow-auto rounded-md border border-border/60 bg-background/60 p-3 text-[10px] font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      <p className="mt-3 text-[10px] font-mono text-muted-foreground break-all">GET {VERIFY_URL}?hash=…</p>
    </section>
  );
}
