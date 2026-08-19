import { useState, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Upload, Shield, CheckCircle2, Loader2, Copy } from "lucide-react";

const NOTARIZE_URL = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/notarize";

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const EmbedSeal = () => {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<{ sha256: string; receipt_id: string; fileName: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setBusy(true);
    setResult(null);
    setStatus("Hashing locally…");
    try {
      const buf = await file.arrayBuffer();
      const hash = await sha256Hex(buf);
      setStatus("Anchoring to APEX…");
      const res = await fetch(NOTARIZE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: `APEX_SEAL sha256:${hash}`,
          model_id: "apex.embed.seal",
          context: { fileName: file.name, fileSize: file.size, fileType: file.type },
          predicate: "APEX_TRUTH_PROTOCOL",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Seal failed");
      setResult({ sha256: hash, receipt_id: data.receipt_id, fileName: file.name });
      setStatus("");
    } catch (e: any) {
      setStatus(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 font-sans">
      <Helmet>
        <title>APEX Seal Widget — Apex PSI — Universal Verification Layer</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-emerald-400" />
          <h1 className="text-sm font-bold tracking-widest uppercase text-gold-gradient">APEX SEAL</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Drop any file. Get a cryptographic truth receipt. Hashed locally.</p>

        <div
          onClick={() => !busy && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          className="border-2 border-dashed border-emerald-400/30 hover:border-emerald-400/70 rounded-lg p-8 text-center cursor-pointer bg-background/40 transition-colors"
        >
          {busy ? (
            <>
              <Loader2 className="h-8 w-8 mx-auto mb-2 text-emerald-400 animate-spin" />
              <p className="font-mono text-xs">{status}</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto mb-2 text-emerald-400/70" />
              <p className="font-mono text-xs">Drop file or click</p>
            </>
          )}
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>

        {result && (
          <div className="mt-4 p-3 rounded border border-emerald-400/40 bg-background/60 font-mono text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> APEX VERIFIED
            </div>
            <div className="truncate"><span className="text-muted-foreground">file</span> {result.fileName}</div>
            <button onClick={() => navigator.clipboard.writeText(result.sha256)} className="text-emerald-400 hover:underline flex items-center gap-1 truncate w-full">
              {result.sha256.slice(0, 32)}… <Copy className="h-3 w-3" />
            </button>
            <div className="text-gold">{result.receipt_id}</div>
            <a href={`/seal`} target="_blank" rel="noreferrer" className="block text-[10px] text-primary hover:underline pt-1">Open full seal page →</a>
          </div>
        )}

        {status && !busy && !result && <p className="mt-3 text-xs text-destructive">{status}</p>}

        <p className="mt-4 text-[9px] font-mono text-muted-foreground/70 text-center tracking-widest uppercase">Powered by APEX PSI · APEX Pramaan</p>
      </div>
    </div>
  );
};

export default EmbedSeal;
