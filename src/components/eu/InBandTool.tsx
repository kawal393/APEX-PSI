import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Upload, Download, ShieldCheck, ShieldAlert, ShieldX, Loader2, FileSignature, Fingerprint, BadgeCheck,
} from "lucide-react";
import {
  embedInBandCredentials, verifyInBandCredentials, EmbedResult, InBandVerification, SourceType, SealMode,
} from "@/lib/c2pa-inband";
import { TRUST_ANCHOR_URL } from "@/lib/psi-pqc";

const SOURCE_OPTIONS: Array<{ id: SourceType; label: string; hint: string }> = [
  { id: "aiGenerated", label: "AI-generated", hint: "trainedAlgorithmicMedia" },
  { id: "aiEdited", label: "AI-modified", hint: "compositeWithTrainedAlgorithmicMedia" },
  { id: "capture", label: "Camera / human capture", hint: "digitalCapture" },
];

const MODE_OPTIONS: Array<{ id: SealMode; label: string; hint: string }> = [
  { id: "institutional", label: "Institutional seal", hint: "Signed by the published APEX PSI identity — attributable." },
  { id: "self", label: "Self seal", hint: "Ephemeral keypair, fully offline — proves integrity, not identity." },
];

const Row = ({ k, v, mono = true }: { k: string; v: string; mono?: boolean }) => (
  <div className="flex flex-col sm:flex-row sm:gap-3 border-b border-border/40 py-1.5">
    <span className="text-[10px] uppercase tracking-widest text-muted-foreground sm:w-44 shrink-0">{k}</span>
    <span className={`text-xs break-all text-foreground/90 ${mono ? "font-mono" : ""}`}>{v}</span>
  </div>
);

const InBandTool = () => {
  const [busy, setBusy] = useState<null | "seal" | "verify">(null);
  const [sourceType, setSourceType] = useState<SourceType>("aiGenerated");
  const [mode, setMode] = useState<SealMode>("institutional");
  const [watermark, setWatermark] = useState(true);
  const [sealed, setSealed] = useState<EmbedResult | null>(null);
  const [check, setCheck] = useState<InBandVerification | null>(null);
  const sealRef = useRef<HTMLInputElement>(null);
  const verifyRef = useRef<HTMLInputElement>(null);

  const doSeal = async (file: File) => {
    setBusy("seal");
    setSealed(null);
    try {
      const res = await embedInBandCredentials(file, {
        sourceType,
        watermark,
        mode,
        generator: "APEX-PSI/1.0 (eu-code-of-practice-section-1)",
      });
      setSealed(res);
      if (mode === "institutional" && res.mode === "self") {
        toast.warning("Institutional signer unreachable — fell back to a self seal (integrity only).");
      } else {
        toast.success(`In-band credentials written — ${res.mechanism}`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Embedding failed");
    } finally {
      setBusy(null);
    }
  };


  const doVerify = async (file: File) => {
    setBusy("verify");
    setCheck(null);
    try {
      setCheck(await verifyInBandCredentials(file));
    } catch (e: any) {
      toast.error(e?.message || "Verification failed");
    } finally {
      setBusy(null);
    }
  };

  const download = () => {
    if (!sealed) return;
    const url = URL.createObjectURL(sealed.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sealed.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadManifest = () => {
    if (!sealed) return;
    const blob = new Blob([JSON.stringify(sealed.manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sealed.fileName}.psi-manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const verdictIcon =
    check?.verdict === "VALID" ? ShieldCheck : check?.verdict === "TAMPERED" ? ShieldX : ShieldAlert;
  const VerdictIcon = verdictIcon;

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* SEAL */}
      <div className="rounded-xl border border-gold/30 bg-background/50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileSignature className="h-4 w-4 text-gold" />
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground">1 · Mark the content</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Signed metadata is written inside the file bytes (JPEG APP11 with JUMBF framing, PNG ancillary chunk, MP4 uuid box, WAV chunk,
          PDF trailing block). Nothing is uploaded — sealing runs entirely in your browser.
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {SOURCE_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => setSourceType(o.id)}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                sourceType === o.id
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-border text-muted-foreground hover:border-gold/30"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-1">
          {MODE_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => setMode(o.id)}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                mode === o.id
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-border text-muted-foreground hover:border-gold/30"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          {MODE_OPTIONS.find((o) => o.id === mode)?.hint}{" "}
          <a href={TRUST_ANCHOR_URL} target="_blank" rel="noreferrer" className="underline hover:text-gold">
            Trust anchor
          </a>
        </p>

        <label className="flex items-center gap-2 text-xs text-foreground/80 mb-4 cursor-pointer">
          <input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} className="accent-[hsl(var(--gold))]" />
          Also embed the robust transform-domain watermark (images → lossless PNG output)
        </label>

        <input
          ref={sealRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && doSeal(e.target.files[0])}
        />
        <Button onClick={() => sealRef.current?.click()} disabled={busy !== null} className="w-full">
          {busy === "seal" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Select file to mark
        </Button>

        {sealed && (
          <div className="mt-4">
            <Row
              k="Seal mode"
              v={sealed.mode === "institutional" ? "Institutional — attributable to APEX PSI" : "Self seal — integrity only"}
              mono={false}
            />
            <Row k="Issuer" v={sealed.issuer} />
            <Row k="Container" v={`${sealed.container.toUpperCase()} — ${sealed.mechanism}`} mono={false} />
            <Row k="Signature suite" v={sealed.manifest.claim.signature_suite} />
            <Row k="Watermark" v={sealed.watermarked ? "psi.dct-qim-v2 (block-DCT QIM)" : "not applied"} />
            <Row k="Hard binding" v={sealed.preEmbedSha256} />
            <Row k="Sealed file SHA-256" v={sealed.finalSha256} />
            <Row k="Claim digest" v={sealed.claimDigest} />

            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" onClick={download}>
                <Download className="h-3.5 w-3.5 mr-2" /> Download marked file
              </Button>
              <Button size="sm" variant="outline" onClick={downloadManifest}>
                Manifest JSON
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* VERIFY */}
      <div className="rounded-xl border border-border bg-background/50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint className="h-4 w-4 text-gold" />
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground">2 · Detect &amp; verify</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Drop the marked file back in — or any third-party file. The detector extracts the in-band manifest, verifies
          both signatures (Ed25519 and ML-DSA-65) and re-computes the hard binding to prove the bytes are unmodified.
        </p>

        <input
          ref={verifyRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && doVerify(e.target.files[0])}
        />
        <Button variant="outline" onClick={() => verifyRef.current?.click()} disabled={busy !== null} className="w-full">
          {busy === "verify" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Select file to verify
        </Button>

        {check && (
          <div className="mt-4">
            <div
              className={`flex items-center gap-2 rounded-lg border p-3 mb-3 ${
                check.verdict === "VALID"
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : check.verdict === "TAMPERED"
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-border bg-muted/10"
              }`}
            >
              <VerdictIcon
                className={`h-5 w-5 ${
                  check.verdict === "VALID" ? "text-emerald-400" : check.verdict === "TAMPERED" ? "text-destructive" : "text-muted-foreground"
                }`}
              />
              <span className="text-sm font-black tracking-widest">{check.verdict}</span>
            </div>
            {check.found && (
              <div
                className={`flex items-start gap-2 rounded-lg border p-3 mb-3 ${
                  check.issuerVerified ? "border-gold/40 bg-gold/5" : "border-border bg-muted/10"
                }`}
              >
                <BadgeCheck className={`h-4 w-4 mt-0.5 ${check.issuerVerified ? "text-gold" : "text-muted-foreground"}`} />
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-foreground">{check.attribution}</div>
                  <div className="text-[11px] text-muted-foreground break-all font-mono">{check.issuer ?? "—"}</div>
                </div>
              </div>
            )}
            <Row k="Container" v={`${check.container?.toUpperCase() ?? "—"} — ${check.mechanism ?? "—"}`} mono={false} />

            <Row k="Ed25519" v={check.ed25519Valid ? "verified" : "not verified"} />
            <Row k="ML-DSA-65" v={check.mldsaValid ? "verified" : "not verified"} />
            <Row k="Hard binding" v={check.bindingValid ? "matches asset bytes" : "mismatch"} />
            <Row
              k="Watermark"
              v={
                check.watermark
                  ? check.watermark.present
                    ? `recovered · confidence ${(check.watermark.confidence * 100).toFixed(1)}% · sync lock ${(check.watermark.syncScore * 100).toFixed(0)}%`
                    : "not detected"
                  : "n/a for this format"
              }
              mono={false}
            />
            {check.manifest && (
              <>
                <Row k="Declared source" v={String((check.manifest.claim.assertions.find((a) => a.label === "c2pa.actions")?.data as any)?.actions?.[0]?.digitalSourceType ?? "—")} />
                <Row k="Claim generator" v={check.manifest.claim.claim_generator} mono={false} />
                <Row k="Sealed at" v={check.manifest.claim.created_at} />
              </>
            )}
            <ul className="mt-3 space-y-1">
              {check.notes.map((n, i) => (
                <li key={i} className="text-xs text-muted-foreground">• {n}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default InBandTool;
