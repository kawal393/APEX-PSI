import { useCallback, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import {
  runVerifyAny,
  type ReaderRow,
  type VerifyAnyReport,
} from "@/lib/verify-any";

const STATUS_STYLE: Record<ReaderRow["status"], { badge: string; label: string }> = {
  verified: { badge: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400", label: "VERIFIED" },
  present: { badge: "border-amber-500/50 bg-amber-500/10 text-amber-400", label: "PRESENT" },
  absent: { badge: "border-border bg-card/60 text-foreground/50", label: "NOT FOUND" },
  failed: { badge: "border-red-500/50 bg-red-500/10 text-red-400", label: "FAILED" },
  error: { badge: "border-red-500/40 bg-red-500/5 text-red-300", label: "READ ERROR" },
};

const VerifyAny = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<VerifyAnyReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File | undefined | null) => {
    if (!file) return;
    setBusy(true);
    setReport(null);
    try {
      const rep = await runVerifyAny(file);
      setReport(rep);
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28 pb-24 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.35em] text-gold/70 mb-2">
            Cross-standard verification
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-black mb-3 text-gold-gradient">
            The Referee
          </h1>
          <p className="text-sm text-foreground/70 leading-relaxed mb-2">
            Drop any file. The referee reads every provenance mark it can —
            C2PA Content Credentials, the APEX PSI in-band manifest, the PSI
            survival watermark, and the public ledger — and reports each one
            neutrally: what it proves, and what it cannot prove.
          </p>
          <p className="text-xs text-foreground/50 mb-8">
            The referee reads and reports. It does not judge content, and it
            grants no favour to any format — including its own. Nothing you
            drop is uploaded anywhere.
          </p>

          <div
            className={`rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors mb-8 ${
              dragOver ? "border-gold bg-gold/5" : "border-border hover:border-gold/40"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {busy ? (
              <p className="text-sm text-gold animate-pulse">
                Reading every mark…
              </p>
            ) : (
              <>
                <p className="text-sm font-bold mb-1">
                  Drop a file here, or click to choose
                </p>
                <p className="text-xs text-foreground/50">
                  Images, video, audio, PDF — any container is accepted.
                </p>
              </>
            )}
          </div>

          {report && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card/40 p-4">
                <p className="text-xs text-foreground/60 mb-1">
                  {report.fileName} · {report.fileMime} ·{" "}
                  {report.fileSize.toLocaleString()} bytes
                </p>
                <p className="text-[11px] text-foreground/40 break-all">
                  SHA-256: {report.sha256}
                </p>
              </div>

              {report.rows.map((row) => {
                const s = STATUS_STYLE[row.status];
                return (
                  <div
                    key={row.id}
                    className="rounded-xl border border-border bg-card/40 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <h2 className="text-sm font-black uppercase tracking-widest">
                        {row.label}
                      </h2>
                      <span
                        className={`rounded-full border px-3 py-0.5 text-[10px] font-bold tracking-widest ${s.badge}`}
                      >
                        {s.label}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 mb-3 break-all">
                      {row.detail}
                    </p>
                    <div className="grid md:grid-cols-2 gap-3 text-[11px]">
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="uppercase tracking-widest text-foreground/50 mb-1">
                          What this proves
                        </p>
                        <p className="text-foreground/70">{row.proves}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="uppercase tracking-widest text-foreground/50 mb-1">
                          What it cannot prove
                        </p>
                        <p className="text-foreground/70">{row.cannotProve}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <p className="text-[11px] text-foreground/40 text-center pt-2">
                Report generated {report.ranAt} · local analysis only ·{" "}
                <Link to="/verify" className="text-gold hover:underline">
                  verify a digest directly
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VerifyAny;
