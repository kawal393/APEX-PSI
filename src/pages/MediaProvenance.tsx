import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Receipt = { receipt_id: string; timestamp: string; merkle_leaf: string; ed25519_signature: string };

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");

export default function MediaProvenance() {
  const [file, setFile] = useState<File | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const pick = async (f: File | undefined) => {
    setReceipt(null); setErr(null); setDigest(null); setFile(f ?? null);
    if (f) setDigest(hex(await crypto.subtle.digest("SHA-256", await f.arrayBuffer())));
  };

  const seal = async () => {
    if (!file || !digest) return;
    setBusy(true); setErr(null);
    const { data, error } = await supabase.functions.invoke("notarize", {
      body: { decision: `MEDIA-ASSET sha256:${digest} type=${file.type || "unknown"} bytes=${file.size}`, predicate: "MEDIA_PROVENANCE" },
    });
    setBusy(false);
    if (error) {
      let msg = "Sealing failed.";
      try { msg = (await (error as { context?: Response }).context?.json())?.error ?? msg; } catch { /* default */ }
      setErr(msg);
    } else setReceipt(data as Receipt);
  };

  // Informative bridge: shaped like a C2PA hard-binding assertion so content
  // credential tooling can read the digest. Not a signed C2PA manifest.
  const bridge = receipt && digest && file ? {
    profile: "PSI-INTOP-C2PA-1/json",
    conformance: "informative bridge — not a signed C2PA manifest; no C2PA conformance is claimed",
    assertion: { label: "c2pa.hash.data", data: { alg: "sha256", hash: digest, name: "jumbf manifest", exclusions: [] } },
    asset: { format: file.type || "application/octet-stream", bytes: file.size },
    psi_receipt: { receipt_id: receipt.receipt_id, timestamp: receipt.timestamp, merkle_leaf: receipt.merkle_leaf, ed25519_signature: receipt.ed25519_signature },
  } : null;

  const download = () => {
    if (!bridge) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(bridge, null, 2)], { type: "application/json" }));
    a.download = `${receipt!.receipt_id}.provenance.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Media Provenance — APEX PSI</title>
        <meta name="description" content="Fingerprint an image or file in your browser and seal when it existed." />
      </Helmet>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-16">
        <p className="font-mono text-xs tracking-widest text-gold">MEDIA PROVENANCE · BRIDGE</p>
        <h1 className="mt-2 text-4xl md:text-6xl font-bold uppercase tracking-tight">Seal a file</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Choose an image, video or document. Its fingerprint is worked out in your browser — the file itself never
          leaves your device. Only the fingerprint is sealed. You also get a small file laid out like a content
          credentials (C2PA) hash record, so other tools can read the same fingerprint. It is not a signed C2PA
          manifest, and it does not prove who made the file or that it is real.
        </p>

        <div className="mt-10 max-w-3xl space-y-4">
          <input type="file" aria-label="Choose a file" onChange={(e) => pick(e.target.files?.[0])} className="block font-mono text-sm" />
          {digest && <p className="font-mono text-xs break-all">sha256:{digest}</p>}
          <Button onClick={seal} disabled={!digest || busy}>{busy ? "Sealing…" : "Seal fingerprint"}</Button>
          {err && <p className="font-mono text-sm text-destructive">{err}</p>}
        </div>

        {bridge && (
          <section className="mt-10 border border-border p-6 font-mono text-xs space-y-3">
            <p>Sealed as <Link className="text-gold underline" to={`/receipt/${receipt!.receipt_id}`}>{receipt!.receipt_id}</Link></p>
            <pre className="whitespace-pre-wrap break-all text-muted-foreground">{JSON.stringify(bridge, null, 2)}</pre>
            <Button variant="outline" onClick={download}>Download provenance file</Button>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
