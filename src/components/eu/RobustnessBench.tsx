import { useCallback, useRef, useState } from "react";
import {
  BenchRow,
  DEFAULT_DELTA,
  WM2_METHOD,
  WM2_SPEC,
  runRobustnessBench,
  applyDistortion,
  blobToImageData,
  detectDctWatermarkInImageData,
  embedDctWatermark,
  imageDataToCanvas,
  DISTORTIONS,
  DistortionId,
} from "@/lib/psi-watermark-dct";
import { Loader2, Upload, Play } from "lucide-react";

/** Deterministic synthetic test raster so the benchmark is runnable with zero input. */
async function syntheticImage(): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 768, 512);
  g.addColorStop(0, "#1b2433");
  g.addColorStop(0.5, "#8a7a4d");
  g.addColorStop(1, "#0d0f14");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 768, 512);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(${(i * 37) % 255},${(i * 91) % 255},${(i * 53) % 255},0.18)`;
    ctx.fillRect((i * 61) % 768, (i * 113) % 512, 18, 12);
  }
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "bold 42px monospace";
  ctx.fillText("APEX PSI TEST RASTER", 60, 270);
  return new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
}

const DIGEST = "9f2c41ab7d6e35108c4b0fa27e5d93b6114af8027cd35e69a0b7f4c218d3e5aa";

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const RobustnessBench = () => {
  const [rows, setRows] = useState<BenchRow[]>([]);
  const [running, setRunning] = useState(false);
  const [source, setSource] = useState<{ blob: Blob; name: string } | null>(null);
  const [single, setSingle] = useState<DistortionId>("chain");
  const [singleResult, setSingleResult] = useState<string | null>(null);
  const preview = useRef<HTMLDivElement>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setRows([]);
    try {
      const blob = source?.blob ?? (await syntheticImage());
      const collected: BenchRow[] = [];
      await runRobustnessBench(blob, DIGEST, DEFAULT_DELTA, (r) => {
        collected.push(r);
        setRows([...collected]);
      });
    } finally {
      setRunning(false);
    }
  }, [source]);

  const runSingle = useCallback(async () => {
    setRunning(true);
    setSingleResult(null);
    try {
      const blob = source?.blob ?? (await syntheticImage());
      const img = await blobToImageData(blob);
      embedDctWatermark(img, DIGEST, DEFAULT_DELTA);
      const distorted = await applyDistortion(img, single);
      const det = detectDctWatermarkInImageData(distorted, DEFAULT_DELTA);
      if (preview.current) {
        preview.current.innerHTML = "";
        const canvas = imageDataToCanvas(distorted);
        canvas.style.maxWidth = "100%";
        canvas.style.borderRadius = "8px";
        preview.current.appendChild(canvas);
      }
      setSingleResult(
        det.digest === DIGEST
          ? `RECOVERED · payload matches · sync lock ${pct(det.syncScore)} · confidence ${pct(det.confidence)} · detector scale ${det.scale}x`
          : det.present
            ? `PARTIAL · sync lock ${pct(det.syncScore)} but payload mismatch`
            : `NOT RECOVERED · sync lock ${pct(det.syncScore)}`
      );
    } finally {
      setRunning(false);
    }
  }, [source, single]);

  const survived = rows.filter((r) => r.recovered).length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card/40 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-bold cursor-pointer hover:border-gold/40 transition-colors">
            <Upload className="h-3.5 w-3.5" />
            {source ? source.name : "Use your own image (optional)"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setSource({ blob: f, name: f.name });
              }}
            />
          </label>
          <button
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-xs font-black text-background disabled:opacity-50"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run full benchmark
          </button>
          <span className="text-[11px] font-mono text-muted-foreground">
            {WM2_METHOD} · delta {DEFAULT_DELTA}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">{WM2_SPEC}</p>
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card/40">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="text-left p-3">Distortion</th>
                <th className="text-left p-3">Channel</th>
                <th className="text-left p-3">Payload</th>
                <th className="text-left p-3">Bit accuracy</th>
                <th className="text-left p-3">Sync lock</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 last:border-0">
                  <td className="p-3 font-bold text-foreground">{r.label}</td>
                  <td className="p-3 text-muted-foreground">{r.detail}</td>
                  <td className={`p-3 font-mono font-bold ${r.recovered ? "text-gold" : "text-destructive"}`}>
                    {r.recovered ? "RECOVERED" : "NOT RECOVERED"}
                  </td>
                  <td className="p-3 font-mono text-muted-foreground">{pct(r.bitAccuracy)}</td>
                  <td className="p-3 font-mono text-muted-foreground">{pct(r.syncScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 text-[11px] font-mono text-muted-foreground border-t border-border">
            {survived}/{rows.length} channels recovered the exact 128-bit payload in this run, in your browser.
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card/40 p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
          Single-channel demo (mark → distort → recover)
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={single}
            onChange={(e) => setSingle(e.target.value as DistortionId)}
            className="rounded-md border border-border bg-background px-3 py-2 text-xs"
          >
            {DISTORTIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <button
            onClick={runSingle}
            disabled={running}
            className="rounded-md border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-bold text-gold disabled:opacity-50"
          >
            Mark, distort and recover
          </button>
        </div>
        {singleResult && (
          <p
            className={`mt-3 text-xs font-mono ${singleResult.startsWith("RECOVERED") ? "text-gold" : "text-muted-foreground"}`}
          >
            {singleResult}
          </p>
        )}
        <div ref={preview} className="mt-3" />
      </div>
    </div>
  );
};

export default RobustnessBench;
