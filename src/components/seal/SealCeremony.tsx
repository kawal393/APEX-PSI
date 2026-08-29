import { useCallback, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Rosette, { rosetteSvgMarkup } from "@/components/Rosette";
import { Download, Upload, Loader2 } from "lucide-react";
import QRCode from "qrcode";

const NOTARIZE_URL = "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/notarize";
const VERIFY_BASE = "https://apex-infrastructure.com/verify";

type Mode = "LOCAL" | "SANDBOX";

interface Ceremony {
  hash: string;
  subject: string;
  bytes: number;
  timestamp: string;
  mode: Mode;
  receipt_id: string;
  decision_hash?: string;
  qr: string;
}

const hex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * THE CEREMONY — the digest streams on screen as it is computed in this browser,
 * the rosette draws itself in, the stamp falls, and a receipt card mints.
 * LOCAL: nothing leaves the device. SANDBOX: a demonstration seal is notarised.
 */
const SealCeremony = () => {
  const [mode, setMode] = useState<Mode>("LOCAL");
  const [text, setText] = useState("");
  const [stream, setStream] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Ceremony | null>(null);
  const [stamped, setStamped] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const streamDigest = useCallback(async (digest: string) => {
    setStream("");
    for (let i = 2; i <= 64; i += 2) {
      setStream(digest.slice(0, i));
      await sleep(12);
    }
  }, []);

  const seal = useCallback(
    async (buf: ArrayBuffer, subject: string) => {
      setBusy(true);
      setError(null);
      setResult(null);
      setStamped(false);
      try {
        const digest = hex(await crypto.subtle.digest("SHA-256", buf));
        await streamDigest(digest);

        const timestamp = new Date().toISOString();
        let receipt_id = `LOCAL-${digest.slice(0, 16).toUpperCase()}`;
        let decision_hash: string | undefined;

        if (mode === "SANDBOX") {
          const res = await fetch(NOTARIZE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              decision: `SANDBOX SEAL: ${subject} sha256:${digest}`,
              predicate: "SANDBOX",
              context: { sandbox: true },
            }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok || !data) throw new Error("notarisation unavailable");
          receipt_id = data.receipt_id ?? data.receiptId ?? receipt_id;
          decision_hash = data.decision_hash ?? data.decisionHash;
        }

        const qr = await QRCode.toDataURL(`${VERIFY_BASE}/${decision_hash ?? digest}`, {
          margin: 1,
          width: 256,
          color: { dark: "#C9A227", light: "#0A0A0B" },
        });

        setResult({
          hash: digest,
          subject,
          bytes: buf.byteLength,
          timestamp,
          mode,
          receipt_id,
          decision_hash,
          qr,
        });
        await sleep(900);
        setStamped(true);
      } catch {
        setError("ERROR — could not complete the seal");
      } finally {
        setBusy(false);
      }
    },
    [mode, streamDigest],
  );

  const downloadPraman = () => {
    if (!result) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: "praman/1",
            mode: result.mode,
            subject: { name: result.subject, size_bytes: result.bytes },
            sha256: result.hash,
            decision_hash: result.decision_hash ?? null,
            receipt_id: result.receipt_id,
            sealed_at: result.timestamp,
            verify: `${VERIFY_BASE}/${result.decision_hash ?? result.hash}`,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${result.receipt_id}.praman`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadPng = async () => {
    if (!result) return;
    const W = 900;
    const H = 480;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0A0A0B";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(237,234,227,0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(20.5, 20.5, W - 41, H - 41);

    const drawImg = (src: string, x: number, y: number, size: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, x, y, size, size);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = src;
      });

    const svg = rosetteSvgMarkup(result.hash, 240);
    await drawImg(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`, 50, 120, 240);
    await drawImg(result.qr, W - 200, 140, 150);

    ctx.fillStyle = "#C9A227";
    ctx.font = "600 20px ui-serif, Georgia, serif";
    ctx.fillText("APEX PSI — SEALED RECORD", 50, 70);
    ctx.fillStyle = "#EDEAE3";
    ctx.font = "13px ui-monospace, monospace";
    ctx.fillText(`receipt   ${result.receipt_id}`, 320, 150);
    ctx.fillText(`sealed at ${result.timestamp}`, 320, 175);
    ctx.fillText(`mode      ${result.mode}`, 320, 200);
    ctx.fillText("sha256", 320, 235);
    ctx.fillText(result.hash.slice(0, 32), 320, 256);
    ctx.fillText(result.hash.slice(32), 320, 277);
    ctx.fillStyle = "rgba(237,234,227,0.6)";
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillText("This record certifies existence, timestamp and integrity — not the truth of any claim.", 50, H - 60);
    ctx.fillText("The ledger does not judge. It remembers.", 50, H - 42);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${result.receipt_id}.png`;
    a.click();
  };

  return (
    <Card className="p-6 border-border">
      <h2 className="text-sm font-bold uppercase tracking-[0.2em]">The Ceremony</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Drop a file or write one sentence. The SHA-256 digest is computed in this browser and streams as it forms;
        the rosette is engraved from those bytes. Nothing uploads in LOCAL mode.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["LOCAL", "SANDBOX"] as Mode[]).map((m) => (
          <Button key={m} size="sm" variant={mode === m ? "hero" : "heroOutline"} onClick={() => setMode(m)}>
            {m}
          </Button>
        ))}
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {mode === "LOCAL"
          ? "Local — nothing leaves the device."
          : "Sandbox — a demonstration seal is notarised."}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Sandbox seals are demonstrations. Production seals are issued under licence.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="One sentence to seal"
          className="min-h-[80px] text-sm"
        />
        <div className="flex flex-col gap-2">
          <Button
            variant="hero"
            disabled={busy || !text.trim()}
            onClick={() => void seal(new TextEncoder().encode(text.trim()).buffer as ArrayBuffer, text.trim().slice(0, 120))}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Seal this text
          </Button>
          <Button variant="heroOutline" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Seal a file
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) await seal(await f.arrayBuffer(), f.name);
            }}
          />
        </div>
      </div>

      {stream && (
        <p className="mt-4 break-all font-mono text-[11px] text-gold">
          sha256: {stream}
          {stream.length < 64 && <span className="animate-pulse">▊</span>}
        </p>
      )}

      {error && <p className="mt-4 font-mono text-xs text-warning">{error}</p>}

      {result && (
        <div className="mt-6 grid gap-6 rounded-md border border-border bg-background/60 p-6 sm:grid-cols-[auto_1fr_auto]">
          <div className="flex items-center justify-center">
            <Rosette hash={result.hash} size={140} animate />
          </div>
          <div className="min-w-0 font-mono text-[11px] text-muted-foreground">
            <p className="text-foreground">{result.receipt_id}</p>
            <p className="mt-1">{result.timestamp}</p>
            <p className="mt-1">mode {result.mode}</p>
            <p className="mt-3 break-all text-foreground">{result.hash}</p>
            {result.decision_hash && <p className="mt-1 break-all">decision {result.decision_hash}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="heroOutline" onClick={() => void downloadPng()}>
                <Download className="mr-2 h-3.5 w-3.5" /> PNG
              </Button>
              <Button size="sm" variant="heroOutline" onClick={downloadPraman}>
                <Download className="mr-2 h-3.5 w-3.5" /> .praman
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <img
              src={result.qr}
              alt={`QR code linking to the verification door for ${result.hash.slice(0, 16)}`}
              className={`h-28 w-28 transition-all duration-500 ${stamped ? "scale-100 opacity-100" : "scale-125 opacity-0"}`}
            />
            <span className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              {stamped ? "sealed" : "stamping…"}
            </span>
          </div>
        </div>
      )}

      <p className="mt-6 text-[10px] leading-relaxed text-muted-foreground/80">
        This record certifies existence, timestamp and integrity — not the truth of any claim. The ledger does not
        judge. It remembers.
      </p>
    </Card>
  );
};

export default SealCeremony;
