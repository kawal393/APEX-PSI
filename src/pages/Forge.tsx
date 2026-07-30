import { useState, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Download, Shield, Copy, Wand2 } from "lucide-react";
import { embedInBandCredentials, EmbedResult } from "@/lib/c2pa-inband";
import { toast } from "sonner";

const FORGE_URL = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/forge-image";
const NOTARIZE_URL = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/notarize";

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function stampImage(dataUrl: string, hash: string, receiptId: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const W = canvas.width;
  const H = canvas.height;
  const pad = Math.max(16, Math.floor(W * 0.018));
  const stampH = Math.max(70, Math.floor(H * 0.085));
  const stampW = Math.min(W - pad * 2, Math.floor(W * 0.46));
  const x = W - stampW - pad;
  const y = H - stampH - pad;

  // Backdrop
  ctx.save();
  ctx.fillStyle = "rgba(8,8,12,0.78)";
  ctx.strokeStyle = "rgba(212,175,55,0.95)";
  ctx.lineWidth = Math.max(2, Math.floor(stampH * 0.035));
  const r = Math.floor(stampH * 0.14);
  roundRect(ctx, x, y, stampW, stampH, r);
  ctx.fill();
  ctx.stroke();

  // Gold accent bar
  const grad = ctx.createLinearGradient(x, y, x + stampW, y);
  grad.addColorStop(0, "#bfa14a");
  grad.addColorStop(0.5, "#f5d97a");
  grad.addColorStop(1, "#bfa14a");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, stampW, Math.max(3, Math.floor(stampH * 0.06)));

  // Title
  const titleSize = Math.floor(stampH * 0.32);
  ctx.fillStyle = "#f5d97a";
  ctx.font = `900 ${titleSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`;
  ctx.textBaseline = "top";
  ctx.fillText("APEX VERIFIED™", x + pad * 0.6, y + stampH * 0.16);

  // Hash + receipt
  const subSize = Math.floor(stampH * 0.18);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `600 ${subSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText(`sha256:${hash.slice(0, 24)}…`, x + pad * 0.6, y + stampH * 0.55);
  ctx.fillStyle = "rgba(180,255,200,0.9)";
  ctx.font = `500 ${Math.floor(subSize * 0.85)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText(`APEX PSI · ${receiptId}`, x + pad * 0.6, y + stampH * 0.78);
  ctx.restore();

  // Corner watermark
  ctx.save();
  ctx.fillStyle = "rgba(245,217,122,0.85)";
  ctx.font = `800 ${Math.floor(stampH * 0.22)}px ui-sans-serif, system-ui`;
  ctx.fillText("◆ APEX PRAMAAN", pad, pad);
  ctx.restore();

  return canvas.toDataURL("image/png");
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const PRESETS = [
  "A cinematic photo of a glowing gold APEX shield hovering over a Bloomberg-style terminal, dark room, volumetric light",
  "A futuristic hologram of the words 'TRUTH PROTOCOL' in chrome and gold, sci-fi data grid background",
  "An institutional poster: 'PROOF IS THE NEW PERMISSION' in massive serif, black + gold, brutalist layout",
  "A satellite view of Earth with golden cryptographic mesh lines connecting cities, deep space backdrop",
];

const Forge = () => {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ hash: string; receiptId: string; merkleRoot?: string } | null>(null);
  const [marked, setMarked] = useState<EmbedResult | null>(null);
  const aRef = useRef<HTMLAnchorElement>(null);

  const run = useCallback(async () => {
    const p = prompt.trim();
    if (p.length < 3) { toast.error("Write a longer prompt"); return; }
    setBusy(true); setImgUrl(null); setMeta(null); setMarked(null);
    try {
      setStage("Generating image via Lovable AI…");
      const res = await fetch(FORGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Forge failed (${res.status})`);

      setStage("Hashing image locally…");
      // Convert data URL → bytes → sha256
      const raw = (data.image as string).split(",")[1];
      const bin = atob(raw);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const hash = await sha256Hex(bytes.buffer);

      setStage("Anchoring to APEX ledger…");
      const nres = await fetch(NOTARIZE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: `APEX_FORGE sha256:${hash}`,
          model_id: data.model || "apex.forge",
          context: { prompt: p, type: "ai_generated_image" },
          predicate: "APEX_TRUTH_PROTOCOL",
        }),
      });
      const nd = await nres.json();
      if (!nres.ok) throw new Error(nd?.error || "Notarize failed");

      setStage("Stamping image with APEX VERIFIED seal…");
      const stamped = await stampImage(data.image, hash, nd.receipt_id);
      setImgUrl(stamped);
      setMeta({ hash, receiptId: nd.receipt_id, merkleRoot: nd.merkle_root });

      setStage("Writing in-band C2PA-compatible credentials + watermark…");
      const stampedBlob = await (await fetch(stamped)).blob();
      const embedded = await embedInBandCredentials(stampedBlob, {
        sourceType: "aiGenerated",
        watermark: true,
        generator: `APEX-FORGE/1.0 (${data.model || "apex.forge"})`,
        extraAssertions: [
          { label: "psi.prompt", data: { prompt: p } },
          { label: "psi.notary", data: { receipt_id: nd.receipt_id, merkle_root: nd.merkle_root ?? null, source_sha256: hash } },
        ],
      });
      setMarked(embedded);
      toast.success("Forged + sealed. Flood the internet.");
    } catch (e: any) {
      toast.error(e.message || "Forge failed");
    } finally {
      setBusy(false); setStage("");
    }
  }, [prompt]);

  const download = () => {
    if (!marked && !imgUrl) return;
    const a = document.createElement("a");
    const name = `apex-verified-${meta?.receiptId || Date.now()}.png`;
    if (marked) {
      const url = URL.createObjectURL(marked.blob);
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded with in-band signed metadata + invisible watermark");
      return;
    }
    a.href = imgUrl!;
    a.download = name;
    a.click();
  };

  const copyHash = () => {
    if (!meta) return;
    navigator.clipboard.writeText(meta.hash);
    toast.success("SHA-256 copied");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>APEX Forge — AI Image Generator with Cryptographic Truth Stamp</title>
        <meta name="description" content="Generate any image with AI and stamp it with the APEX VERIFIED™ seal. Anchored to the APEX PSI ledger. Free, open, shareable." />
        <link rel="canonical" href="https://apex-psi.lovable.app/forge" />
      </Helmet>
      <Navbar />

      <section className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" />
        <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20 relative">
          <div className="inline-flex items-center gap-2 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] text-gold border border-gold/30 rounded-full px-3 py-1 mb-6">
            <Wand2 className="h-3 w-3" /> APEX FORGE · STAMPED AI IMAGERY
          </div>
          <h1 className="text-3xl md:text-6xl font-black tracking-tight mb-4 leading-[1.05]">
            <span className="text-chrome-gradient">Generate Any Image.</span><br />
            <span className="text-gold-gradient">Stamp It With Truth.</span>
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-3xl">
            Every image leaves the forge SHA-256 hashed, anchored to the APEX ledger, and branded with the APEX VERIFIED™ seal. Share it anywhere — the seal is the protocol.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-10 grid lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-gold" />
            <h2 className="text-lg font-bold">Prompt</h2>
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want…"
            className="min-h-[140px] font-mono text-sm"
            disabled={busy}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => setPrompt(p)}
                disabled={busy}
                className="text-[10px] font-mono px-2 py-1 rounded border border-border hover:border-gold/60 hover:text-gold transition-colors"
              >
                preset {i + 1}
              </button>
            ))}
          </div>
          <Button onClick={run} disabled={busy} variant="hero" className="mt-4 w-full">
            {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {stage || "Working…"}</> : <><Wand2 className="h-4 w-4 mr-2" /> Forge + Stamp</>}
          </Button>
          <p className="text-[10px] font-mono text-muted-foreground mt-3">
            Powered by Lovable AI · Image is hashed, notarized, and stamped before display. Free during preview.
          </p>
        </Card>

        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold">Sealed Output</h2>
          </div>
          {!imgUrl && !busy && (
            <div className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center text-xs font-mono text-muted-foreground">
              Your stamped image will appear here
            </div>
          )}
          {busy && (
            <div className="aspect-square rounded-lg border border-border flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-gold animate-spin" />
              <p className="font-mono text-xs text-muted-foreground">{stage}</p>
            </div>
          )}
          {imgUrl && (
            <>
              <img src={imgUrl} alt="APEX VERIFIED forged image" className="w-full rounded-lg border border-gold/30" />
              {meta && (
                <div className="mt-3 space-y-2 font-mono text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">receipt</span>
                    <span className="text-emerald-400">{meta.receiptId}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">sha256</span>
                    <button onClick={copyHash} className="text-gold hover:underline flex items-center gap-1 truncate">
                      {meta.hash.slice(0, 22)}… <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  {marked && (
                    <div className="rounded border border-gold/30 bg-gold/5 p-2 space-y-1">
                      <p className="text-gold">IN-BAND CREDENTIALS · {marked.mechanism}</p>
                      <p className="text-muted-foreground">
                        digitalSourceType: trainedAlgorithmicMedia · {marked.manifest.claim.signature_suite} ·
                        invisible watermark {marked.watermarked ? "on" : "off"}
                      </p>
                      <a href="/inband" className="text-emerald-400 hover:underline">Verify the marked file → /inband</a>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={download} variant="hero" size="sm">
                  <Download className="h-3 w-3 mr-1" /> Download PNG
                </Button>
                <Button asChild variant="heroOutline" size="sm">
                  <a href={`/verify?hash=${meta?.hash}`} target="_blank" rel="noreferrer">Verify on APEX</a>
                </Button>
              </div>
            </>
          )}
        </Card>
      </section>

      <a ref={aRef} className="hidden" />
      <Footer />
    </div>
  );
};

export default Forge;
