import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Landmark, ExternalLink, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = { hash: string; ok: boolean | null; note?: string };

export default function Regulator() {
  const [batch, setBatch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const runBulk = async () => {
    const hashes = batch.split(/\s+/).map((s) => s.trim()).filter((s) => /^[0-9a-f]{64}$/i.test(s));
    if (hashes.length === 0) return toast.error("Paste one or more SHA-256 hashes (64 hex chars each)");
    setBusy(true);
    setRows(hashes.map((h) => ({ hash: h, ok: null })));
    const out: Row[] = [];
    for (const h of hashes) {
      try {
        const { data, error } = await supabase.functions.invoke("verify-hash", { body: { hash: h } });
        if (error) out.push({ hash: h, ok: false, note: "error" });
        else if (data?.found) out.push({ hash: h, ok: true, note: data?.receipt_id || "notarized" });
        else out.push({ hash: h, ok: false, note: "not found" });
      } catch { out.push({ hash: h, ok: false, note: "network" }); }
      setRows([...out, ...hashes.slice(out.length).map((x) => ({ hash: x, ok: null as null }))]);
    }
    setBusy(false);
    toast.success(`Verified ${out.filter((r) => r.ok).length}/${hashes.length}`);
  };

  return (
    <>
      <Helmet>
        <title>Regulator Portal — Apex PSI — Universal Verification Layer</title>
        <meta name="description" content="One-page briefing for regulators and government agencies. Bulk hash verification, official specification, jurisdiction alignment, and citation-ready references." />
        <link rel="canonical" href="https://ai-governance-standard.com/regulator" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-5xl px-4 py-16">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
              <Landmark className="h-3 w-3 mr-1" /> Government · Regulator · Standards Body
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              <span className="text-gold-gradient">Regulator</span> Portal
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything a supervisory authority needs to verify APEX PSI receipts, review the open specification, and align enforcement.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-10">
            <a href="/ietf/draft-singh-psi-http-01.txt" target="_blank" rel="noreferrer">
              <Card className="p-5 h-full hover:border-primary/40 transition-colors cursor-pointer">
                <div className="text-xs text-muted-foreground mb-1">IETF Draft</div>
                <div className="font-bold mb-2">draft-singh-psi-http-01</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">Read full text <ExternalLink className="h-3 w-3" /></div>
              </Card>
            </a>
            <a href="/standards"><Card className="p-5 h-full hover:border-primary/40 transition-colors cursor-pointer">
              <div className="text-xs text-muted-foreground mb-1">Cross-walk</div>
              <div className="font-bold mb-2">NIST · ISO/IEC 42001 · EU AI Act</div>
              <div className="text-xs text-muted-foreground">Interactive standards mapping</div>
            </Card></a>
            <a href="/foundation"><Card className="p-5 h-full hover:border-primary/40 transition-colors cursor-pointer">
              <div className="text-xs text-muted-foreground mb-1">Governance</div>
              <div className="font-bold mb-2">PSI Foundation (in formation)</div>
              <div className="text-xs text-muted-foreground">Charter · verifier nodes · board</div>
            </Card></a>
          </div>

          <Card className="p-6 mb-8 border-primary/20">
            <h2 className="text-lg font-bold mb-2">Bulk Hash Verification</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Paste SHA-256 hashes (one per line or space-separated). Each is checked against the APEX PSI notary ledger.
            </p>
            <Textarea className="mb-3 min-h-32 font-mono text-xs"
              placeholder="e.g. 4606e9eee90b89d2fcf9d47c21fb00e558f60bb3c6ddf5955c2d005ae0e3ca7f"
              value={batch} onChange={(e) => setBatch(e.target.value)} />
            <Button onClick={runBulk} disabled={busy} className="w-full">
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…</> : "Run bulk verification"}
            </Button>
          </Card>

          {rows.length > 0 && (
            <Card className="p-4 mb-8">
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.hash} className="flex items-center gap-3 text-xs font-mono">
                    {r.ok === null ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" /> :
                      r.ok ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> :
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                    <span className="truncate flex-1">{r.hash}</span>
                    <span className="text-muted-foreground">{r.note || (r.ok === null ? "…" : "")}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-lg font-bold mb-3">Direct contact for supervisory authorities</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Government and regulatory bodies may request a briefing, verification-node access, or a signed attestation of protocol conformance.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild><a href="/cite">Cite APEX PSI</a></Button>
              <Button asChild variant="outline"><a href="/api">Verification API</a></Button>
              <Button asChild variant="outline"><a href="/protocol">Full protocol spec</a></Button>
              <Button asChild variant="outline"><a href="/#contact">Contact secretariat</a></Button>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  );
}
