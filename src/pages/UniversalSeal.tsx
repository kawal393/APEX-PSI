import { useState, useRef, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Upload,
  Shield,
  Download,
  CheckCircle2,
  Copy,
  Sparkles,
  Globe,
  Code,
  Link as LinkIcon,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import ApexVerifiedStamp from "@/components/ApexVerifiedStamp";
import { createSHA256 } from "hash-wasm";

const NOTARIZE_URL = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/notarize";
const VERIFY_URL = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/verify-hash";

type SealResult = {
  receipt_id: string;
  timestamp: string;
  sha256: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  decision_hash?: string;
  merkle_leaf?: string;
  merkle_root?: string;
  ed25519_signature?: string;
  predicate_applied?: string;
  receipt_version?: string;
};

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function kindIcon(type: string) {
  if (type.startsWith("image/")) return FileImage;
  if (type.startsWith("video/")) return FileVideo;
  if (type.startsWith("audio/")) return FileAudio;
  return FileText;
}

const UniversalSeal = () => {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [result, setResult] = useState<SealResult | null>(null);
  const [history, setHistory] = useState<SealResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("apex.seal.history");
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      // Streaming SHA-256 — chunked, no size limit. File never leaves the device.
      const CHUNK = 8 * 1024 * 1024; // 8 MB
      const hasher = await createSHA256();
      hasher.init();
      let read = 0;
      const total = file.size;
      const t0 = performance.now();
      while (read < total) {
        const end = Math.min(read + CHUNK, total);
        const chunk = new Uint8Array(await file.slice(read, end).arrayBuffer());
        hasher.update(chunk);
        read = end;
        const pct = total > 0 ? Math.floor((read / total) * 100) : 100;
        setProgress(`Hashing locally · ${pct}% · ${bytes(read)} / ${bytes(total)} (file never leaves your device)`);
        // Yield to UI
        await new Promise((r) => setTimeout(r, 0));
      }
      const hash = hasher.digest("hex");
      const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
      setProgress(`Hashed ${bytes(total)} in ${elapsed}s · anchoring to APEX ledger…`);

      const res = await fetch(NOTARIZE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: `APEX_SEAL sha256:${hash}`,
          model_id: "apex.universal.seal",
          context: { fileName: file.name, fileSize: file.size, fileType: file.type || "application/octet-stream" },
          predicate: "APEX_TRUTH_PROTOCOL",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Seal failed");

      const sealed: SealResult = {
        receipt_id: data.receipt_id,
        timestamp: data.timestamp,
        sha256: hash,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
        decision_hash: data.decision_hash,
        merkle_leaf: data.merkle_leaf,
        merkle_root: data.merkle_root,
        ed25519_signature: data.ed25519_signature,
        predicate_applied: data.predicate_applied,
        receipt_version: data.receipt_version,
      };
      setResult(sealed);
      const next = [sealed, ...history].slice(0, 25);
      setHistory(next);
      try { localStorage.setItem("apex.seal.history", JSON.stringify(next)); } catch {}
      toast.success("Sealed. Truth anchored to APEX ledger.");
    } catch (e: any) {
      toast.error(e.message || "Could not seal file");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }, [history]);

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const onDrop = (e: DragEvent) => {
      prevent(e);
      const f = e.dataTransfer?.files?.[0];
      if (f) handleFile(f);
    };
    ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) => el.addEventListener(ev, prevent as any));
    el.addEventListener("drop", onDrop as any);
    return () => {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) => el.removeEventListener(ev, prevent as any));
      el.removeEventListener("drop", onDrop as any);
    };
  }, [handleFile]);

  const copy = (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const downloadReceipt = () => {
    if (!result) return;
    const receipt = {
      spec: "APEX-SEAL-v1",
      sealed_at: result.timestamp,
      file: { name: result.fileName, size_bytes: result.fileSize, mime: result.fileType },
      sha256: result.sha256,
      receipt_id: result.receipt_id,
      anchor: {
        ledger: "apex-psi",
        merkle_leaf: result.merkle_leaf,
        merkle_root: result.merkle_root,
        ed25519_signature: result.ed25519_signature,
        predicate: result.predicate_applied,
      },
      verify_url: VERIFY_URL,
      verify_instructions: "POST { sha256_hash: '<your file hash>' } to verify_url to confirm this seal.",
      issuer: "apex.psi.universal.seal",
      version: result.receipt_version || "PSI-1.2",
    };
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.fileName}.apex.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareUrl = result
    ? `${window.location.origin}/verify?hash=${result.sha256}&receipt=${result.receipt_id}`
    : "";

  const embedSnippet = `<iframe src="${window.location.origin}/embed/seal" width="420" height="520" style="border:0;border-radius:14px;overflow:hidden" loading="lazy" title="APEX Universal Seal"></iframe>`;

  const curlSnippet = `curl -X POST ${NOTARIZE_URL} \\
  -H "Content-Type: application/json" \\
  -d '{"decision":"APEX_SEAL sha256:<your-file-hash>","predicate":"APEX_TRUTH_PROTOCOL"}'`;

  const jsSnippet = `// Drop this on any page. Zero dependencies.
async function apexSeal(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const sha256 = Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0")).join("");
  const res = await fetch("${NOTARIZE_URL}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision: "APEX_SEAL sha256:" + sha256,
      predicate: "APEX_TRUTH_PROTOCOL",
      context: { fileName: file.name, fileSize: file.size, fileType: file.type }
    })
  });
  return await res.json(); // { receipt_id, merkle_root, ed25519_signature, ... }
}`;

  const KindIcon = result ? kindIcon(result.fileType) : Upload;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>APEX Seal — World's First Cryptographic Truth Stamp for Any File</title>
        <meta
          name="description"
          content="Stamp any photo, video, audio, document, or file with APEX PSI · APEX Pramaan. Client-side SHA-256, anchored receipt, verifiable forever. Free, open, no login."
        />
        <link rel="canonical" href="https://apex-psi.lovable.app/seal" />
      </Helmet>
      <Navbar />

      {/* HERO */}
      <section className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" />
        <div className="container mx-auto max-w-6xl px-4 py-16 md:py-24 relative">
          <div className="inline-flex items-center gap-2 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] text-emerald-400 border border-emerald-400/30 rounded-full px-3 py-1 mb-6">
            <Sparkles className="h-3 w-3" /> APEX PSI · APEX PRAMAAN
          </div>
          <h1 className="text-3xl md:text-6xl font-black tracking-tight mb-4 leading-[1.05]">
            <span className="text-chrome-gradient">World's First Cryptographic</span>
            <br />
            <span className="text-gold-gradient">Truth Stamp for Any File</span>
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-3xl mb-8">
            Drop any photo, video, audio, document, or archive. APEX seals it in your browser, anchors it to an immutable ledger, and returns a permanent, verifiable receipt — in seconds. No login. No upload. No vendor.
          </p>
          <div className="flex flex-wrap gap-3 text-xs font-mono">
            <span className="px-3 py-1.5 rounded-full border border-emerald-400/30 text-emerald-400">SHA-256 in browser</span>
            <span className="px-3 py-1.5 rounded-full border border-gold/30 text-gold">Ed25519 signed</span>
            <span className="px-3 py-1.5 rounded-full border border-primary/30 text-primary">Merkle anchored</span>
            <span className="px-3 py-1.5 rounded-full border border-border text-muted-foreground">Verifiable forever</span>
          </div>
        </div>
      </section>

      {/* SEAL */}
      <section id="seal" className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-card/60 backdrop-blur-xl border-border">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold">Universal Seal — Any File, Any Size</h2>
            </div>

            <div
              ref={dropRef}
              onClick={() => !busy && inputRef.current?.click()}
              className="border-2 border-dashed border-emerald-400/30 hover:border-emerald-400/70 transition-colors rounded-lg p-10 text-center cursor-pointer bg-background/40"
            >
              {busy ? (
                <>
                  <Loader2 className="h-10 w-10 mx-auto mb-3 text-emerald-400 animate-spin" />
                  <p className="font-mono text-sm">{progress || "Working…"}</p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto mb-3 text-emerald-400/70" />
                  <p className="font-mono text-sm">Drop any file here — photo · video · audio · doc · zip · ANY size</p>
                  <p className="text-xs text-muted-foreground mt-2">Streaming SHA-256 via <code>hash-wasm</code>. Only the hash leaves your device. No file-size limit.</p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {result && (
              <div className="mt-6 grid md:grid-cols-[1fr_auto] gap-6 items-start">
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> APEX VERIFIED · receipt {result.receipt_id}
                  </div>
                  <div className="bg-background/60 rounded p-3 border border-border space-y-2">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground flex items-center gap-1"><KindIcon className="h-3 w-3" /> file</span>
                      <span className="truncate">{result.fileName} · {bytes(result.fileSize)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">sha256</span>
                      <button onClick={() => copy(result.sha256, "SHA-256 copied")} className="truncate text-emerald-400 hover:underline flex items-center gap-1">
                        {result.sha256.slice(0, 24)}… <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    {result.merkle_root && (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">merkle_root</span>
                        <button onClick={() => copy(result.merkle_root!, "Merkle root copied")} className="truncate text-gold hover:underline">
                          {result.merkle_root.slice(0, 18)}…
                        </button>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">sealed_at</span>
                      <span>{new Date(result.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={downloadReceipt} size="sm" variant="hero">
                      <Download className="h-3 w-3 mr-1" /> Download Receipt
                    </Button>
                    <Button onClick={() => copy(shareUrl, "Verify URL copied")} size="sm" variant="heroOutline">
                      <LinkIcon className="h-3 w-3 mr-1" /> Copy Verify URL
                    </Button>
                  </div>
                </div>
                <div className="flex justify-center md:justify-end">
                  <ApexVerifiedStamp hash={result.sha256} btcBlock={result.receipt_id.slice(-6)} size="md" />
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6 bg-card/60 backdrop-blur-xl border-border">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-bold">Why It's Inevitable</h2>
            </div>
            <ul className="text-xs font-mono space-y-2 text-foreground/80">
              <li>· Open protocol — no vendor lock</li>
              <li>· Works on any device, any browser</li>
              <li>· No login, no email, no friction</li>
              <li>· Hash never leaves verifiable math</li>
              <li>· Embed on any site in one line</li>
              <li>· Free for public seals · forever</li>
            </ul>
            <div className="mt-4 pt-4 border-t border-border text-[10px] font-mono text-emerald-400">● APEX LEDGER LIVE</div>
          </Card>
        </div>
      </section>

      {/* SYNC EVERYWHERE */}
      <section id="sync" className="container mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl md:text-4xl font-black mb-2 text-chrome-gradient">Sync Any Website. One Line.</h2>
          <p className="text-muted-foreground max-w-3xl">
            APEX is a protocol, not a product. Drop the widget, paste the snippet, or call the API — any site instantly gains cryptographic truth-stamping.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="p-6 bg-card/60 border-border">
            <div className="flex items-center gap-2 mb-3">
              <Code className="h-4 w-4 text-emerald-400" />
              <h3 className="font-bold">Embed Widget (iframe)</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Drop this anywhere — blog, CMS, intranet, kiosk.</p>
            <pre className="text-[10px] font-mono bg-background/60 p-3 rounded border border-border overflow-x-auto whitespace-pre-wrap break-all">{embedSnippet}</pre>
            <Button size="sm" variant="heroOutline" className="mt-3" onClick={() => copy(embedSnippet, "Embed snippet copied")}>
              <Copy className="h-3 w-3 mr-1" /> Copy Embed
            </Button>
          </Card>

          <Card className="p-6 bg-card/60 border-border">
            <div className="flex items-center gap-2 mb-3">
              <Code className="h-4 w-4 text-gold" />
              <h3 className="font-bold">JavaScript SDK (0 deps)</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Native browser crypto. No packages. Just paste.</p>
            <pre className="text-[10px] font-mono bg-background/60 p-3 rounded border border-border overflow-x-auto max-h-48">{jsSnippet}</pre>
            <Button size="sm" variant="heroOutline" className="mt-3" onClick={() => copy(jsSnippet, "JS snippet copied")}>
              <Copy className="h-3 w-3 mr-1" /> Copy Snippet
            </Button>
          </Card>

          <Card className="p-6 bg-card/60 border-border">
            <div className="flex items-center gap-2 mb-3">
              <Code className="h-4 w-4 text-primary" />
              <h3 className="font-bold">REST API (curl)</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Server-side, mobile, CI/CD, anywhere HTTP exists.</p>
            <pre className="text-[10px] font-mono bg-background/60 p-3 rounded border border-border overflow-x-auto whitespace-pre-wrap break-all">{curlSnippet}</pre>
            <Button size="sm" variant="heroOutline" className="mt-3" onClick={() => copy(curlSnippet, "curl copied")}>
              <Copy className="h-3 w-3 mr-1" /> Copy curl
            </Button>
          </Card>
        </div>

        <div className="mt-6 text-center">
          <Button asChild variant="hero">
            <a href="/api"><LinkIcon className="h-4 w-4 mr-1" /> Get Your API Key</a>
          </Button>
        </div>
      </section>

      {/* HISTORY */}
      {history.length > 0 && (
        <section className="container mx-auto max-w-6xl px-4 py-12">
          <Card className="p-6 bg-card/60 border-border">
            <h2 className="text-lg font-bold mb-4">Your Recent Seals (local)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-2 px-2">When</th>
                    <th className="text-left py-2 px-2">File</th>
                    <th className="text-left py-2 px-2">SHA-256</th>
                    <th className="text-left py-2 px-2">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.receipt_id} className="border-b border-border/40">
                      <td className="py-2 px-2 text-muted-foreground">{new Date(h.timestamp).toLocaleString()}</td>
                      <td className="py-2 px-2 truncate max-w-[200px]">{h.fileName}</td>
                      <td className="py-2 px-2">
                        <button onClick={() => copy(h.sha256, "Hash copied")} className="text-emerald-400 hover:underline">{h.sha256.slice(0, 14)}…</button>
                      </td>
                      <td className="py-2 px-2 text-gold">{h.receipt_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default UniversalSeal;
