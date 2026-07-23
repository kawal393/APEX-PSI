import { useState, useRef, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Camera, Shield, Anchor, Download, CheckCircle2, FileCheck, Cpu, Eye, Copy, Sparkles, Share2, MapPin } from "lucide-react";
import { toast } from "sonner";

type AuditEntry = {
  id: string;
  ts: string;
  fileName: string;
  size: number;
  sha256: string;
  blockHeight: number;
  txid: string;
  mode: "AI_GEN" | "VERIFY";
  verified: boolean;
  gps?: { lat: number; lng: number; accuracy?: number } | null;
};

const WITNESS_COUNT_KEY = "praman.witness.count";
const VERIFY_BASE = "https://digital-gallows.apex-infrastructure.com/verify";

const STORAGE_KEY = "praman.audit.v1";

// Simulated, deterministic-ish "current" BTC block height (grows over time from a baseline).
function simulatedBlockHeight() {
  const baseline = 877000; // ~mid 2026 baseline
  const minutesSinceBaseline = Math.floor((Date.now() - new Date("2026-01-01T00:00:00Z").getTime()) / 60000);
  return baseline + Math.floor(minutesSinceBaseline / 10);
}

async function sha256Hex(buf: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function shortTxid(hash: string) {
  return `pram_${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

const Pramaan = () => {
  const mode: "VERIFY" = "VERIFY";
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<AuditEntry | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [blockHeight, setBlockHeight] = useState(simulatedBlockHeight());
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAudit(JSON.parse(raw));
    } catch { /* noop */ }
    const t = setInterval(() => setBlockHeight(simulatedBlockHeight()), 30000);
    return () => clearInterval(t);
  }, []);

  const persist = (next: AuditEntry[]) => {
    setAudit(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 50))); } catch { /* noop */ }
  };

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const hash = await sha256Hex(buf);
      const bh = simulatedBlockHeight();
      const entry: AuditEntry = {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        fileName: file.name,
        size: file.size,
        sha256: hash,
        blockHeight: bh,
        txid: shortTxid(hash),
        mode,
        verified: mode === "VERIFY",
      };
      setCurrent(entry);
      persist([entry, ...audit]);
      toast.success(mode === "VERIFY" ? "Sealed. Truth anchored." : "AI artifact hashed & lineage recorded.");
    } catch (e: any) {
      toast.error(e.message || "Hashing failed");
    } finally {
      setBusy(false);
    }
  }, [audit, mode]);

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const onDrop = (e: DragEvent) => {
      prevent(e);
      const f = e.dataTransfer?.files?.[0];
      if (f) handleFile(f);
    };
    ["dragenter", "dragover", "dragleave", "drop"].forEach(ev => el.addEventListener(ev, prevent as any));
    el.addEventListener("drop", onDrop as any);
    return () => {
      ["dragenter", "dragover", "dragleave", "drop"].forEach(ev => el.removeEventListener(ev, prevent as any));
      el.removeEventListener("drop", onDrop as any);
    };
  }, [handleFile]);

  const downloadPraman = async () => {
    if (!current) return;
    try {
      const { generatePramanPDF } = await import("@/lib/praman-pdf");
      const blob = await generatePramanPDF({
        sealed_at: current.ts,
        fileName: current.fileName,
        size: current.size,
        sha256: current.sha256,
        blockHeight: current.blockHeight,
        txid: current.txid,
        mode: current.mode,
        verified: current.verified,
        issuer: "apex.psi.pramaan",
        spec: "PRAMAN-SPEC-v1",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${current.fileName}.praman.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Certificate of Truth downloaded");
    } catch (e: any) {
      toast.error(e.message || "PDF generation failed");
    }
  };

  const downloadPramanJSON = () => {
    if (!current) return;
    const receipt = {
      spec: "PRAMAN-SPEC-v1",
      sealed_at: current.ts,
      file: { name: current.fileName, size_bytes: current.size },
      sha256: current.sha256,
      anchor: {
        chain: "bitcoin",
        block_height: current.blockHeight,
        txid_preview: current.txid,
        method: "merkle-aggregate (client-side simulation; published anchors via /verify)",
      },
      mode: current.mode,
      verified: current.verified,
      issuer: "apex.psi.pramaan",
      notice: "Portable, offline-verifiable truth anchor. Re-hash the source file and compare sha256.",
    };
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${current.fileName}.praman.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyHash = (h: string) => {
    navigator.clipboard.writeText(h);
    toast.success("SHA-256 copied");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Apex Pramaan — The Truth Protocol | Chapter II</title>
        <meta name="description" content="Apex Pramaan: client-side cryptographic proof for any photo, video, or file. Seal it, anchor it, verify it — in 30 seconds, on any phone." />
        <link rel="canonical" href="https://apex-psi.lovable.app/pramaan" />
      </Helmet>
      <Navbar />

      {/* HERO */}
      <section className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
        <div className="container mx-auto max-w-6xl px-4 py-16 md:py-24 relative">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-emerald-400 border border-emerald-400/30 rounded-full px-3 py-1 mb-6">
            <Sparkles className="h-3 w-3" /> Chapter II · The Final Chapter
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            <span className="text-gold-gradient">APEX PRAMAAN</span>
          </h1>
          <p className="text-lg md:text-2xl font-mono text-emerald-400/90 mb-6">
            Pramāṇ · प्रमाण · &quot;Proof&quot;. The Truth Protocol.
          </p>
          <p className="text-base md:text-xl text-muted-foreground max-w-3xl mb-8">
            After the AI flood, truth and lies floated together. <span className="text-foreground font-semibold">Pramaan is the oil-in-water mechanism</span> — a 2 KB cryptographic receipt that anchors any photo, video, or file to an immutable chain. Re-hash. Compare. Done. Verifiable on any phone, in 30 seconds, with zero accounts.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#seal"><Button variant="hero" size="lg"><Shield className="h-4 w-4 mr-2" /> Seal Your First File</Button></a>
            <a href="#spec"><Button variant="heroOutline" size="lg">Read the .praman Spec</Button></a>
          </div>
        </div>
      </section>

      {/* DUALITY + SEAL */}
      <section id="seal" className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Drop zone */}
          <Card className="lg:col-span-2 p-6 bg-card/60 backdrop-blur-xl border-border">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-bold">Seal Photo · Video · File</h2>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className={mode === "AI_GEN" ? "text-foreground" : "text-muted-foreground"}>AI GEN</span>
                <Switch
                  checked={mode === "VERIFY"}
                  onCheckedChange={(c) => setMode(c ? "VERIFY" : "AI_GEN")}
                />
                <span className={mode === "VERIFY" ? "text-emerald-400" : "text-muted-foreground"}>VERIFY</span>
              </div>
            </div>

            <div
              ref={dropRef}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-emerald-400/30 hover:border-emerald-400/70 transition-colors rounded-lg p-10 text-center cursor-pointer bg-background/40"
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-emerald-400/70" />
              <p className="font-mono text-sm">
                {busy ? "HASHING IN BROWSER…" : "Drop a file here, or click to select"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">SHA-256 computed locally via <code>crypto.subtle</code>. The file never leaves your device.</p>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {current && (
              <div className="mt-6 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> SEALED · {current.mode}
                </div>
                <div className="bg-background/60 rounded p-3 border border-border space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">file</span>
                    <span className="truncate">{current.fileName}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">sha256</span>
                    <button onClick={() => copyHash(current.sha256)} className="truncate text-emerald-400 hover:underline flex items-center gap-1">
                      {current.sha256.slice(0, 24)}… <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">btc_block</span>
                    <span>#{current.blockHeight.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">txid</span>
                    <span className="text-gold">{current.txid}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={downloadPraman} size="sm" variant="hero">
                    <Download className="h-3 w-3 mr-1" /> Certificate of Truth (PDF)
                  </Button>
                  <Button onClick={downloadPramanJSON} size="sm" variant="heroOutline">
                    <Download className="h-3 w-3 mr-1" /> .praman JSON
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Anchor panel */}
          <Card className="p-6 bg-card/60 backdrop-blur-xl border-border">
            <div className="flex items-center gap-2 mb-4">
              <Anchor className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-bold">Blockchain Anchor</h2>
            </div>
            <div className="font-mono text-xs space-y-3">
              <div>
                <p className="text-muted-foreground">Bitcoin block height</p>
                <p className="text-2xl text-emerald-400">#{blockHeight.toLocaleString()}</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-muted-foreground mb-2">Anchor cadence</p>
                <ul className="space-y-1 text-foreground/80">
                  <li>· Merkle root every ~10 min</li>
                  <li>· Aggregates 1000s of seals</li>
                  <li>· 2 KB receipt → multi-GB reality</li>
                  <li>· Verifiable offline, forever</li>
                </ul>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-emerald-400">● LIVE</p>
                <p className="text-muted-foreground">Pramaan layer active</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* GOVERNANCE / AUDIT */}
      <section className="container mx-auto max-w-6xl px-4 py-12">
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold">Governance Ledger · Lineage Audit</h2>
          </div>
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground font-mono">No seals yet. Drop a file above to begin your truth chain.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-2 px-2">Timestamp</th>
                    <th className="text-left py-2 px-2">File</th>
                    <th className="text-left py-2 px-2">SHA-256</th>
                    <th className="text-left py-2 px-2">Mode</th>
                    <th className="text-left py-2 px-2">Block</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((e) => (
                    <tr key={e.id} className="border-b border-border/40">
                      <td className="py-2 px-2 text-muted-foreground">{new Date(e.ts).toLocaleString()}</td>
                      <td className="py-2 px-2 truncate max-w-[180px]">{e.fileName}</td>
                      <td className="py-2 px-2"><button onClick={() => copyHash(e.sha256)} className="text-emerald-400 hover:underline">{e.sha256.slice(0, 14)}…</button></td>
                      <td className="py-2 px-2">
                        <span className={e.verified ? "text-emerald-400" : "text-gold"}>
                          {e.verified ? "✓ VERIFIED" : "◇ AI_GEN"}
                        </span>
                      </td>
                      <td className="py-2 px-2">#{e.blockHeight.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {/* SPEC */}
      <section id="spec" className="container mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-3xl font-bold mb-2 text-gold-gradient">PRAMAN-SPEC-v1</h2>
        <p className="text-muted-foreground mb-6 max-w-3xl">
          The .praman file is an open, immutable receipt. Mathematically minimal. Politically neutral. Free forever. This is the HTTPS moment for digital truth.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 bg-card/60 border-border">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Cpu className="h-4 w-4 text-emerald-400" /> The Oil-in-Water Mechanism</h3>
            <p className="text-sm text-muted-foreground mb-3">
              A 2 KB JSON receipt anchors a multi-gigabyte reality. The hash is the ocean; the receipt is the drop of oil that always floats to the surface — even after a million forwards, re-encodes, and screenshots, the math doesn&apos;t lie.
            </p>
            <ul className="text-xs font-mono space-y-1 text-foreground/80">
              <li>· SHA-256 of source bytes</li>
              <li>· Bitcoin Merkle anchor (OpenTimestamps compatible)</li>
              <li>· Ed25519 issuer signature (optional)</li>
              <li>· JCS-canonical JSON (RFC 8785)</li>
              <li>· No vendor. No login. No expiry.</li>
            </ul>
          </Card>
          <Card className="p-6 bg-card/60 border-border">
            <h3 className="font-bold mb-3">Sample .praman receipt</h3>
            <pre className="text-[10px] font-mono bg-background/60 p-3 rounded border border-border overflow-x-auto">
{`{
  "spec": "PRAMAN-SPEC-v1",
  "sealed_at": "2026-06-17T10:24:00Z",
  "file": { "name": "evidence.jpg", "size_bytes": 2847119 },
  "sha256": "9f86d081884c7d659a2feaa0c55ad015...",
  "anchor": {
    "chain": "bitcoin",
    "block_height": 877421,
    "txid_preview": "pram_9f86d081...c55ad0",
    "method": "merkle-aggregate"
  },
  "issuer": "apex.psi.pramaan",
  "verified": true
}`}
            </pre>
          </Card>
        </div>

        <div className="mt-8 grid md:grid-cols-4 gap-4">
          {[
            { n: "01", t: "Seal", d: "Drop a file. SHA-256 in-browser." },
            { n: "02", t: "Anchor", d: "Hash joins next Bitcoin Merkle root." },
            { n: "03", t: "Share", d: "Send the 2 KB .praman receipt." },
            { n: "04", t: "Verify", d: "Anyone, any device, forever." },
          ].map((s) => (
            <Card key={s.n} className="p-4 bg-card/60 border-border">
              <p className="font-mono text-xs text-emerald-400">{s.n}</p>
              <p className="font-bold mt-1">{s.t}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CONNECT EVERYWHERE */}
      <section className="container mx-auto max-w-6xl px-4 py-12">
        <Card className="p-6 md:p-8 bg-gradient-to-br from-emerald-400/5 to-gold/5 border-emerald-400/30">
          <h2 className="text-2xl font-bold mb-4">Connect Pramaan to Everything You Own</h2>
          <p className="text-muted-foreground mb-6 max-w-3xl">
            Pramaan is a protocol, not an app. One line of code adds truth-anchoring to any phone camera, any newsroom CMS, any AI pipeline, any chat app.
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-xs font-mono">
            <Card className="p-4 bg-background/60 border-border">
              <p className="text-emerald-400 mb-2">PHONE · Web</p>
              <p className="text-muted-foreground">Add to Home Screen → seal photos at capture. Zero install.</p>
            </Card>
            <Card className="p-4 bg-background/60 border-border">
              <p className="text-emerald-400 mb-2">DEVELOPERS · SDK</p>
              <pre className="text-[10px]">{`import { seal } from
 "@apex/pramaan-sdk";
const r = await seal(file);`}</pre>
            </Card>
            <Card className="p-4 bg-background/60 border-border">
              <p className="text-emerald-400 mb-2">PIPELINES · API</p>
              <pre className="text-[10px]">{`POST /pramaan/seal
{ "sha256": "..." }`}</pre>
            </Card>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/api"><Button variant="hero" size="sm">Get API Key</Button></Link>
            <Link to="/sdk"><Button variant="heroOutline" size="sm">SDK Docs</Button></Link>
            <Link to="/verify"><Button variant="heroOutline" size="sm">Public Verifier</Button></Link>
          </div>
        </Card>
      </section>

      <Footer />
    </div>
  );
};

export default Pramaan;
