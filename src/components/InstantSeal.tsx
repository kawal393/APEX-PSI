import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, FileUp, Copy, RotateCcw } from "lucide-react";

// Real, client-side SHA-256 — identical code path to /pramaan.
// The file never leaves the device; nothing is uploaded; nothing is simulated.
async function sha256Hex(buf: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Sealed = {
  name: string;
  size: number;
  hash: string;
};

const formatSize = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const InstantSeal = () => {
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sealed, setSealed] = useState<Sealed | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const buf = await file.arrayBuffer();
      const hash = await sha256Hex(buf);
      setSealed({ name: file.name, size: file.size, hash });
    } catch (e: any) {
      setError(e?.message || "Could not read that file.");
      setSealed(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const copyHash = async () => {
    if (!sealed) return;
    try {
      await navigator.clipboard.writeText(sealed.hash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  const reset = () => {
    setSealed(null);
    setError(null);
    setCopied(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section
      id="seal"
      aria-label="Seal any file yourself — a SHA-256 digest computed in your browser"
      className="relative border-b border-gold/20 bg-background px-4 py-14 md:py-16"
    >
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.35em] text-gold md:text-xs">
          <ShieldCheck className="h-4 w-4" /> Do It Yourself
        </div>
        <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-foreground md:text-5xl">
          Seal a file. Right here.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
          Drop any file. Your browser computes its real SHA-256 fingerprint instantly and
          locally. It never leaves this page, and nothing is uploaded. This is the exact
          math the protocol runs on — see it with your own eyes.
        </p>

        {!sealed ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={
              "mt-8 w-full cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors md:p-12 " +
              (drag
                ? "border-gold bg-gold/10"
                : "border-gold/40 bg-card/40 hover:border-gold hover:bg-gold/5") +
              (busy ? " opacity-60" : "")
            }
          >
            <FileUp className="mx-auto h-10 w-10 text-gold md:h-12 md:w-12" strokeWidth={1.75} />
            <p className="mt-4 font-mono text-sm font-bold uppercase tracking-[0.25em] text-gold md:text-base">
              {busy ? "Computing…" : "Drop a file — or click to choose"}
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              SHA-256 stays on your device
            </p>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </button>
        ) : (
          <div className="mt-8 rounded-lg border border-gold/40 bg-card/40 p-6 text-left">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-400">
                ✓ Sealed locally
              </p>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-gold"
              >
                <RotateCcw className="h-3 w-3" /> Another file
              </button>
            </div>

            <dl className="mt-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">file</dt>
                <dd className="max-w-[60%] truncate text-foreground">{sealed.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">size</dt>
                <dd className="text-foreground">{formatSize(sealed.size)}</dd>
              </div>
              <div className="pt-1">
                <dt className="text-muted-foreground">sha-256</dt>
                <dd className="mt-1 break-all rounded border border-border bg-background/60 p-2 leading-relaxed text-emerald-400">
                  {sealed.hash}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={copyHash}
              className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-gold"
            >
              <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy digest"}
            </button>

            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row">
              <Link
                to={`/verify?hash=${sealed.hash}`}
                className="flex-1 rounded-md border border-gold bg-gold px-6 py-3 text-center font-mono text-xs font-bold uppercase tracking-[0.2em] text-background transition-colors hover:bg-transparent hover:text-gold"
              >
                Verify this digest →
              </Link>
              <Link
                to="/pramaan"
                className="flex-1 rounded-md border border-gold/40 px-6 py-3 text-center font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold transition-colors hover:border-gold hover:bg-gold/10"
              >
                Get the full receipt
              </Link>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 font-mono text-xs text-red-400">{error}</p>
        )}

        <p className="mx-auto mt-6 max-w-xl font-mono text-[10px] leading-relaxed text-muted-foreground">
          A digest proves that a specific file existed, in exactly this form, at this moment.
          It records integrity and existence only — it is not a judgement about the content
          and not a compliance determination. Re-hash the same file anywhere and you get the
          identical value. That reproducibility is the whole point.
        </p>
      </div>
    </section>
  );
};

export default InstantSeal;
