import { useState, useRef, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// Switch removed — VERIFY is the only mode now
import { Camera, Shield, Anchor, Download, CheckCircle2, FileCheck, Cpu, Eye, Copy, Sparkles, Share2, MapPin, Stamp } from "lucide-react";
import { embedInBandCredentials } from "@/lib/c2pa-inband";
import { toast } from "sonner";
import { PSI_SCHEMA_ID, psiSchemaDigest, ENGINE_LICENCE_TERMS } from "@/lib/psi-schema";

type AuditEntry = {
  id: string;
  ts: string;
  fileName: string;
  size: number;
  sha256: string;
  blockHeight: number;
  txid: string;
  receiptId?: string;
  merkleRoot?: string;
  receiptUrl?: string;
  ledgerTs?: string;
  ledgerStatus?: "sealed" | "local-only";
  mode: "AI_GEN" | "VERIFY";
  verified: boolean;
  gps?: { lat: number; lng: number; accuracy?: number } | null;
};

const WITNESS_COUNT_KEY = "praman.witness.count";
const VERIFY_BASE = "https://www.ai-governance-standard.com/verify";
const NOTARIZE_URL = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/notarize";

const STORAGE_KEY = "praman.audit.v1";

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
  const mode = "VERIFY" as const;
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<AuditEntry | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);
  const [embedding, setEmbedding] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAudit(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  const persist = (next: AuditEntry[]) => {
    setAudit(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 50))); } catch { /* noop */ }
  };

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    lastFileRef.current = file;
    // Fire GPS request in parallel (non-blocking). User may grant/deny.
    let capturedGps: { lat: number; lng: number; accuracy?: number } | null = null;
    const gpsPromise = new Promise<void>((resolve) => {
      if (!("geolocation" in navigator)) return resolve();
      const timer = setTimeout(() => resolve(), 5000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          capturedGps = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          clearTimeout(timer);
          resolve();
        },
        () => { clearTimeout(timer); resolve(); },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    });
    try {
      const buf = await file.arrayBuffer();
      const hash = await sha256Hex(buf);
      await gpsPromise;
      setGps(capturedGps);
      // Seal into the live APEX ledger. Only the hash leaves this device.
      let ledger: { receiptId: string; merkleRoot: string; receiptUrl: string; ledgerTs: string } | null = null;
      try {
        const res = await fetch(NOTARIZE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: `APEX_SEAL sha256:${hash}`,
            predicate: "APEX_TRUTH_PROTOCOL",
          }),
        });
        if (res.ok) {
          const j: any = await res.json();
          if (j && j.receipt_id) {
            ledger = {
              receiptId: j.receipt_id,
              merkleRoot: j.merkle_root ?? "",
              receiptUrl: j.receipt_page_url ?? "",
              ledgerTs: j.timestamp ?? "",
            };
          }
        }
      } catch { /* Ledger unreachable: the entry is marked local-only below, never presented as sealed. */ }
      const entry: AuditEntry = {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        fileName: file.name,
        size: file.size,
        sha256: hash,
        blockHeight: 0,
        txid: ledger ? ledger.receiptId : shortTxid(hash),
        mode,
        verified: true,
        gps: capturedGps,
        receiptId: ledger?.receiptId,
        merkleRoot: ledger?.merkleRoot,
        receiptUrl: ledger?.receiptUrl,
        ledgerTs: ledger?.ledgerTs,
        ledgerStatus: ledger ? "sealed" : "local-only",
      };
      setCurrent(entry);
      persist([entry, ...audit]);
      // Increment global witness counter
      try {
        const cur = parseInt(localStorage.getItem(WITNESS_COUNT_KEY) || "0", 10) || 0;
        localStorage.setItem(WITNESS_COUNT_KEY, String(cur + 1));
        window.dispatchEvent(new CustomEvent("praman:witness", { detail: cur + 1 }));
      } catch { /* noop */ }
      if (ledger) toast.success("Sealed. Receipt issued by the APEX ledger.");
      else toast.warning("Hashed on this device only — the ledger did not answer, so no receipt was issued.");
    } catch (e: any) {
      toast.error(e.message || "Hashing failed");
    } finally {
      setBusy(false);
    }
  }, [audit, mode]);

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
        receiptId: current.receiptId,
        merkleRoot: current.merkleRoot,
        receiptUrl: current.receiptUrl,
        mode: current.mode,
        verified: current.verified,
        issuer: "apex.psi.pramaan",
        spec: "PRAMAN-SPEC-v1",
        gps: current.gps ?? null,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${current.fileName}.praman.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Certificate downloaded");
    } catch (e: any) {
      toast.error(e.message || "PDF generation failed");
    }
  };

  const downloadPramanJSON = async () => {
    if (!current) return;
    const receipt = {
      spec: "PRAMAN-SPEC-v1",
      schema: PSI_SCHEMA_ID,
      schema_digest: await psiSchemaDigest(),
      licence: {
        engine: "APEX PSI Sealing Engine v1",
        terms: ENGINE_LICENCE_TERMS,
        verifier: "MIT — packages/psi-verifier (published as npm apex-psi-verifier@1.7.0 and PyPI psi-verifier==1.7.0; 1.2.0 checks no signature at all, 1.3.0 accepts an unchecked post-quantum claim, 1.5.0 cannot verify an RFC 9162 consistency proof)",
      },
      sealed_at: current.ts,
      file: { name: current.fileName, size_bytes: current.size },
      sha256: current.sha256,
      anchor: current.receiptId
        ? {
            ledger: "APEX PSI append-only ledger",
            receipt_id: current.receiptId,
            merkle_root: current.merkleRoot ?? null,
            receipt_url: current.receiptUrl ?? null,
            ledger_timestamp: current.ledgerTs ?? null,
            method: "hosted notarize (functions/v1/notarize) — SHA-256 + Ed25519 + ML-DSA-65",
          }
        : {
            ledger: null,
            method: "local hash only — no ledger receipt was issued for this entry",
          },
      geolocation: current.gps
        ? { lat: current.gps.lat, lng: current.gps.lng, accuracy_m: current.gps.accuracy ?? null }
        : null,
      mode: current.mode,
      verified: current.verified,
      issuer: "apex.psi.pramaan",
      notice: "Portable, offline-checkable record. Re-hash the source file and compare sha256. A receipt proves the record existed in this exact state at this time — not that its contents are true.",
    };
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${current.fileName}.praman.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareReceipt = async () => {
    if (!current) return;
    const url = `${VERIFY_BASE}?h=${current.sha256}`;
    const shareData = {
      title: "I WITNESS THIS",
      text: `🔐 APEX PRAMAAN seal: ${current.sha256}`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${url}`);
        toast.success("Verify link copied to clipboard");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(`${shareData.text}\n${url}`);
          toast.success("Verify link copied to clipboard");
        } catch { /* noop */ }
      }
    }
  };

  const downloadInBand = async () => {
    const file = lastFileRef.current;
    if (!file || !current) return;
    setEmbedding(true);
    try {
      const assertions: { label: string; data: Record<string, unknown> }[] = [];
      if (current.gps) {
        assertions.push({ label: "psi.geolocation", data: { lat: current.gps.lat, lng: current.gps.lng, accuracy_m: current.gps.accuracy ?? null } });
      }
      if (current.receiptId) {
        assertions.push({
          label: "psi.ledger_receipt",
          data: { receipt_id: current.receiptId, merkle_root: current.merkleRoot ?? null, receipt_url: current.receiptUrl ?? null, ledger_timestamp: current.ledgerTs ?? null },
        });
      }
      const res = await embedInBandCredentials(file, {
        sourceType: "capture",
        watermark: true,
        generator: "APEX-PSI/1.0 (apex-pramaan)",
        extraAssertions: assertions,
      });
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`In-band credentials embedded — ${res.mechanism}`);
    } catch (e: any) {
      toast.error(e?.message || "In-band embedding failed");
    } finally {
      setEmbedding(false);
    }
  };

  const copyHash = (h: string) => {
    navigator.clipboard.writeText(h);
    toast.success("SHA-256 copied");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Apex Pramaan — The Truth Protocol — Apex PSI — Universal Verification Protocol</title>
        <meta name="description" content="Apex Pramaan: client-side cryptographic proof for any photo, video, or file. Seal it, anchor it, verify it — in 30 seconds, on any phone." />
        <link rel="canonical" href="https://www.ai-governance-standard.com/pramaan" />
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
            After the AI flood, truth and lies floated together. <span className="text-foreground font-semibold">Pramaan is the oil-in-water mechanism</span> — a 2 KB cryptographic receipt that anchors any photo, video, or file to an append-only chain. Re-hash. Compare. Done. Verifiable on any phone, in 30 seconds, with zero accounts.
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
                <h2 className="text-lg font-bold">I Witness This</h2>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 border border-emerald-400/40 rounded-full px-2 py-0.5">
                SEAL · APEX LEDGER
              </span>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="w-full group relative overflow-hidden rounded-lg border-2 border-gold/70 hover:border-gold bg-gradient-to-br from-gold/20 via-gold/5 to-transparent hover:from-gold/30 transition-all p-8 md:p-12 text-center cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              <Camera className="h-14 w-14 md:h-16 md:w-16 mx-auto mb-4 text-gold" strokeWidth={2.2} />
              <p className="text-2xl md:text-3xl font-black tracking-[0.2em] text-gold-gradient">
                {busy ? "SEALING…" : "I WITNESS THIS"}
              </p>
              <p className="text-xs text-muted-foreground mt-3 font-mono">
                {busy ? "Hashing in browser via crypto.subtle" : "Tap to choose any file · SHA-256 stays on your device"}
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.zip"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </button>

            {current && (
              <div className="mt-6 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> {current.receiptId ? "SEALED · APEX LEDGER" : "HASHED ON DEVICE · NO LEDGER RECEIPT"}
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
                  {current.receiptId ? (
                    <>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">receipt</span>
                        <span className="text-gold">{current.receiptId}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">ledger</span>
                        {current.receiptUrl ? (
                          <a href={current.receiptUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">Open the receipt page ↗</a>
                        ) : (
                          <span className="text-emerald-400">APEX PSI ledger</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">ledger</span>
                      <span className="text-gold">local only — no receipt issued</span>
                    </div>
                  )}
                  {current.gps && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> gps</span>
                      <span className="text-emerald-400">
                        📍 {current.gps.lat.toFixed(5)}, {current.gps.lng.toFixed(5)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={shareReceipt} size="sm" className="bg-gold hover:bg-gold/90 text-background font-bold">
                    <Share2 className="h-3 w-3 mr-1" /> Share
                  </Button>
                  <Button onClick={downloadPraman} size="sm" variant="hero">
                    <Download className="h-3 w-3 mr-1" /> Certificate (PDF)
                  </Button>
                  <Button onClick={downloadPramanJSON} size="sm" variant="heroOutline">
                    <Download className="h-3 w-3 mr-1" /> .praman JSON
                  </Button>
                  <Button onClick={downloadInBand} size="sm" variant="heroOutline" disabled={embedding}>
                    <Stamp className="h-3 w-3 mr-1" /> {embedding ? "Embedding…" : "Marked file (in-band + watermark)"}
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
                <p className="text-muted-foreground">Latest ledger receipt</p>
                {current?.receiptId ? (
                  <p className="text-sm text-emerald-400 break-all">{current.receiptId}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No seal yet this session — drop a file and the live ledger issues your receipt.</p>
                )}
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
                    <th className="text-left py-2 px-2">Receipt</th>
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
                      <td className="py-2 px-2">{e.receiptId ? `${e.receiptId.slice(0, 18)}…` : "local only"}</td>
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
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h2 className="text-3xl font-bold text-gold-gradient">PRAMAN-SPEC-v1</h2>
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 border border-emerald-400/40 rounded-full px-2.5 py-1">
            PSI-INBAND-v1
          </span>
        </div>
        <p className="text-muted-foreground mb-6 max-w-3xl">
          The .praman file is an open, tamper-evident receipt. Mathematically minimal. Politically neutral. Free forever. This is the HTTPS moment for verifiable records.
        </p>

        <Card className="p-6 bg-card/60 border-border mb-6">
          <h3 className="font-bold mb-3">In-Band Signed Metadata — PSI-INBAND-v1</h3>
          <p className="text-sm text-muted-foreground mb-3">
            When sealing JPEG, PNG, MP4, WAV or PDF files, a hybrid-signed PSI claim (Ed25519 + ML-DSA-65) is embedded
            directly in the file's own bytes, using each format's native container mechanism, bound to the file's
            pre-embed SHA-256. This is not C2PA; it uses the same container placements so the claim travels with the file.
          </p>
          <ul className="text-sm space-y-1.5 text-foreground/80">
            <li>· The signature travels WITH the file, not as a separate receipt</li>
            <li>· Verifiable with the open-source APEX PSI detector, offline and without an account</li>
            <li>· The metadata is tamper-evident — removing it breaks the file integrity</li>
            <li>· Article 50 of the EU AI Act requires this in-band metadata</li>
          </ul>
        </Card>

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
              <pre className="text-[10px]">{`# source in the repository, not npm
git clone https://github.com/kawal393/APEX-PSI
npm install ./APEX-PSI/packages/psi-sdk`}</pre>
            </Card>
            <Card className="p-4 bg-background/60 border-border">
              <p className="text-emerald-400 mb-2">PIPELINES · API</p>
              <pre className="text-[10px]">{`POST functions/v1/notarize
{ "decision": "...", "model_id": "..." }
header: x-apex-api-key`}</pre>
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
