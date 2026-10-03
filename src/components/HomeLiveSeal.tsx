import { useCallback, useEffect, useRef, useState } from "react";
import { createSHA256 } from "hash-wasm";
import { CheckCircle2, Copy, Download, FileAudio, FileImage, FileText, FileVideo, Loader2, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import apexLogo from "@/assets/apex-logo.png";

type Receipt = {
  receipt_id: string;
  timestamp: string;
  merkle_leaf: string;
  merkle_root?: string;
  ed25519_signature: string;
};

const bytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(2)} GB`;
};

const mediaKind = (file: File) => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
};

export default function HomeLiveSeal() {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [digest, setDigest] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectFile = useCallback(async (nextFile: File) => {
    setBusy(true);
    setReceipt(null);
    setDigest("");
    setProgress(0);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));

    try {
      const hasher = await createSHA256();
      hasher.init();
      const chunkSize = 8 * 1024 * 1024;
      let read = 0;
      while (read < nextFile.size) {
        const end = Math.min(read + chunkSize, nextFile.size);
        hasher.update(new Uint8Array(await nextFile.slice(read, end).arrayBuffer()));
        read = end;
        setProgress(nextFile.size ? Math.round((read / nextFile.size) * 100) : 100);
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
      setDigest(hasher.digest("hex"));
    } catch {
      toast.error(t("homeSeal.hashError"));
      setFile(null);
      setPreviewUrl("");
    } finally {
      setBusy(false);
    }
  }, [previewUrl, t]);

  const seal = async () => {
    if (!file || !digest) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("notarize", {
      body: {
        decision: `MEDIA-ASSET sha256:${digest} type=${file.type || "application/octet-stream"} bytes=${file.size}`,
        model_id: "apex.live.seal",
        predicate: "MEDIA_PROVENANCE",
      },
    });
    setBusy(false);

    if (error) {
      let message = t("homeSeal.sealError");
      try {
        const context = (error as { context?: Response }).context;
        if (context) {
          const payload = await context.json() as { error?: string };
          message = payload.error ?? message;
        }
      } catch {
        // Keep the public error message when the service response is not JSON.
      }
      toast.error(message);
      return;
    }
    setReceipt(data as Receipt);
    toast.success(t("homeSeal.sealedToast"));
  };

  const downloadReceipt = () => {
    if (!file || !receipt) return;
    const payload = {
      profile: "PSI-INTOP-C2PA-1/json",
      conformance: "informative bridge — not a signed C2PA manifest; no C2PA conformance is claimed",
      asset: { name: file.name, format: file.type || "application/octet-stream", bytes: file.size, sha256: digest },
      psi_receipt: receipt,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${file.name}.apex-receipt.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const kind = file ? mediaKind(file) : "document";
  const KindIcon = kind === "image" ? FileImage : kind === "video" ? FileVideo : kind === "audio" ? FileAudio : FileText;

  return (
    <section className="min-h-[calc(100vh-7rem)] border-b border-border bg-background px-4 py-12 md:py-20" aria-labelledby="live-seal-heading">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">{t("homeSeal.eyebrow")}</p>
            <h1 id="live-seal-heading" className="mt-4 font-serif text-4xl font-bold leading-tight md:text-6xl">
              {t("homeSeal.title")}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">{t("homeSeal.intro")}</p>
            <div className="mt-8 border-y border-gold/20 py-5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <p>{t("homeSeal.factLocal")}</p>
              <p className="mt-2">{t("homeSeal.factLong")}</p>
              <p className="mt-2">{t("homeSeal.factLimits")}</p>
            </div>
          </div>

          <div className="border border-gold/30 bg-card/30">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <img src={apexLogo} alt="APEX company logo" className="h-9 w-9 object-contain glow-gold" />
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold">APEX PSI</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{t("homeSeal.workspace")}</p>
                </div>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-400">● {t("homeSeal.live")}</span>
            </div>

            {!file ? (
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  const dropped = event.dataTransfer.files?.[0];
                  if (dropped) void selectFile(dropped);
                }}
                className={`m-4 flex min-h-[25rem] cursor-pointer flex-col items-center justify-center border border-dashed p-8 text-center transition-colors sm:m-6 ${dragging ? "border-gold bg-gold/10" : "border-gold/40 bg-background/40 hover:border-gold hover:bg-gold/5"}`}
              >
                <Upload className="h-12 w-12 text-gold" strokeWidth={1.5} />
                <p className="mt-6 font-mono text-sm font-bold uppercase tracking-[0.2em] text-foreground">{t("homeSeal.drop")}</p>
                <p className="mt-3 max-w-md text-sm text-muted-foreground">{t("homeSeal.formats")}</p>
                <Button type="button" variant="heroOutline" className="mt-7" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }}>
                  {t("homeSeal.choose")}
                </Button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
                <div className="relative flex min-h-[22rem] items-center justify-center overflow-hidden border-b border-border bg-background lg:border-b-0 lg:border-r">
                  {kind === "image" && <img src={previewUrl} alt={file.name} className="max-h-[32rem] w-full object-contain" />}
                  {kind === "video" && <video src={previewUrl} controls className="max-h-[32rem] w-full" />}
                  {kind === "audio" && <audio src={previewUrl} controls className="mx-8 w-full" />}
                  {kind === "document" && (
                    <div className="p-10 text-center">
                      <KindIcon className="mx-auto h-16 w-16 text-gold" strokeWidth={1.25} />
                      <p className="mt-4 max-w-sm break-all font-mono text-xs text-foreground">{file.name}</p>
                    </div>
                  )}
                  {receipt && (
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-gold/40 bg-background/95 px-4 py-3 backdrop-blur">
                      <div className="flex items-center gap-2">
                        <img src={apexLogo} alt="" className="h-7 w-7 object-contain" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold">{t("homeSeal.apexSealed")}</span>
                      </div>
                      <span className="truncate font-mono text-[9px] text-muted-foreground">{receipt.receipt_id}</span>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <KindIcon className="h-4 w-4 text-gold" />
                    <p className="min-w-0 truncate text-sm font-semibold">{file.name}</p>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">{bytes(file.size)}</p>

                  {busy && !digest && (
                    <div className="mt-8">
                      <div className="flex items-center gap-2 font-mono text-xs text-gold"><Loader2 className="h-4 w-4 animate-spin" /> {t("homeSeal.hashing")} {progress}%</div>
                      <div className="mt-3 h-1 bg-muted"><div className="h-full bg-gold transition-[width]" style={{ width: `${progress}%` }} /></div>
                    </div>
                  )}

                  {digest && (
                    <div className="mt-6">
                      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">SHA-256</p>
                      <p className="mt-2 break-all font-mono text-[10px] leading-relaxed text-emerald-400">{digest}</p>
                      <Button type="button" variant="ghost" size="sm" className="mt-2 px-0 text-muted-foreground" onClick={() => { void navigator.clipboard.writeText(digest); toast.success(t("homeSeal.copied")); }}>
                        <Copy className="h-3 w-3" /> {t("homeSeal.copy")}
                      </Button>
                    </div>
                  )}

                  {!receipt && digest && (
                    <Button type="button" variant="hero" className="mt-6 w-full" disabled={busy} onClick={() => void seal()}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{t("homeSeal.sealNow")}
                    </Button>
                  )}

                  {receipt && (
                    <div className="mt-6 border-t border-gold/20 pt-5">
                      <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400"><CheckCircle2 className="h-4 w-4" /> {t("homeSeal.sealed")}</p>
                      <p className="mt-3 break-all font-mono text-[10px] text-muted-foreground">{receipt.receipt_id}</p>
                      <div className="mt-5 flex flex-col gap-2">
                        <Button type="button" variant="hero" size="sm" onClick={downloadReceipt}><Download className="h-4 w-4" /> {t("homeSeal.download")}</Button>
                        <Button type="button" variant="heroOutline" size="sm" asChild>
                          <Link to={`/r/${receipt.merkle_leaf.replace("sha256:", "")}`}>{t("homeSeal.verify")}</Link>
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button type="button" variant="ghost" size="sm" className="mt-5 w-full text-muted-foreground" onClick={() => { setFile(null); setDigest(""); setReceipt(null); setPreviewUrl(""); if (inputRef.current) inputRef.current.value = ""; }}>
                    {t("homeSeal.another")}
                  </Button>
                </div>
              </div>
            )}
            <input ref={inputRef} type="file" className="hidden" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void selectFile(selected); }} />
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-4xl text-center font-mono text-[10px] leading-relaxed text-muted-foreground">{t("homeSeal.honesty")}</p>
      </div>
    </section>
  );
}