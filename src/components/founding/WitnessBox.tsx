import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const sha256Hex = async (text: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

type Result = {
  seat_number: number;
  receipt_id: string;
  leaf_hash: string;
  artifact_hash: string;
};

const WitnessBox = ({ onInscribed }: { onInscribed: () => void }) => {
  const [artifact, setArtifact] = useState("");
  const [localHash, setLocalHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const handleChange = async (value: string) => {
    setArtifact(value);
    setLocalHash(value.trim() ? await sha256Hex(value.trim()) : "");
  };

  const seal = async () => {
    setBusy(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("founding-registry", {
        body: { action: "witness", artifact: artifact.trim() },
      });
      if (fnError || data?.error) {
        setError(data?.error ?? "Sealing failed. Nothing was recorded.");
        return;
      }
      setResult(data as Result);
      onInscribed();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-gold/40 bg-card/40 p-5 space-y-4">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">Witness box</h3>
      <p className="text-sm text-muted-foreground">
        Paste any public text or URL. The digest is computed in your browser. Free, no install.
      </p>
      <textarea
        value={artifact}
        onChange={(e) => handleChange(e.target.value)}
        rows={5}
        spellCheck={false}
        placeholder="Public text or URL to witness"
        className="w-full bg-background border border-border p-3 font-mono text-xs"
      />
      {localHash && (
        <p className="font-mono text-[10px] text-muted-foreground break-all">
          Local SHA-256: {localHash}
        </p>
      )}
      <Button onClick={seal} disabled={busy || !artifact.trim()} className="font-mono uppercase tracking-[0.2em]">
        {busy ? "Sealing" : "Seal"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <div className="border border-gold/40 p-4 space-y-1 font-mono text-[11px]">
          <p className="text-gold uppercase tracking-[0.2em]">First witness sealed</p>
          <p className="break-all">Seat #{String(result.seat_number).padStart(3, "0")}</p>
          <p className="break-all">Receipt {result.receipt_id}</p>
          <p className="break-all">Leaf {result.leaf_hash}</p>
          <a href={`/verify?hash=${result.leaf_hash}`} className="text-gold hover:underline">
            Verify independently
          </a>
        </div>
      )}
    </div>
  );
};

export default WitnessBox;
