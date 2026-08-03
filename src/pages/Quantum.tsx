import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Cpu, CheckCircle2, XCircle, Download, Loader2 } from "lucide-react";
import { hybridVerify, hybridSignEphemeral, HYBRID_SUITE, PQC_STANDARD, type HybridSignature } from "@/lib/psi-pqc";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FN = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/pqc-sign`;

export default function Quantum() {
  const [message, setMessage] = useState("APEX PSI — this receipt is quantum-verified.");
  const [sig, setSig] = useState<HybridSignature | null>(null);
  const [verify, setVerify] = useState<{ ok: boolean; ed25519_ok: boolean; mldsa_ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverKeys, setServerKeys] = useState<any>(null);

  useEffect(() => {
    fetch(FN, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } })
      .then((r) => r.json()).then(setServerKeys).catch(() => {});
  }, []);

  const signServer = async () => {
    setLoading(true); setSig(null); setVerify(null);
    try {
      const r = await fetch(FN, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ message }),
      });
      const s = await r.json();
      if (!r.ok) throw new Error(s.error || "sign failed");
      setSig(s);
      const v = await hybridVerify(message, s);
      setVerify(v);
      toast.success(v.ok ? "Hybrid signature verified" : "Verification failed");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const signLocal = async () => {
    setLoading(true); setSig(null); setVerify(null);
    try {
      const s = await hybridSignEphemeral(message);
      setSig(s);
      const v = await hybridVerify(message, s);
      setVerify(v);
      toast.success("Ephemeral hybrid signature generated & verified");
    } finally { setLoading(false); }
  };

  const download = () => {
    if (!sig) return;
    const blob = new Blob([JSON.stringify({ message, ...sig }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `apex-pqc-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Helmet>
        <title>Quantum-Safe Signatures | APEX PSI</title>
        <meta name="description" content="Hybrid Ed25519 + ML-DSA-65 (Dilithium3) signatures per NIST FIPS 204. Every APEX receipt survives a cryptographically-relevant quantum computer." />
        <link rel="canonical" href="https://ai-governance-standard.com/quantum" />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background">
        <section className="border-b border-border/40 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 py-16 max-w-5xl">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">NIST FIPS 204 · Aug 2024</Badge>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
              Quantum-Safe by <span className="text-primary">Default</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl">
              Every APEX receipt can now carry a <strong>hybrid signature</strong>: classical Ed25519 <em>and</em> post-quantum
              ML-DSA-65 (Dilithium3). A receipt is valid only if <strong>both</strong> verify. If a quantum computer breaks
              one, the other holds. The truth survives the transition.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 max-w-5xl grid md:grid-cols-3 gap-4">
          <Card className="p-6">
            <Shield className="w-8 h-8 text-primary mb-3" />
            <div className="text-sm text-muted-foreground">Suite</div>
            <div className="font-mono text-lg font-bold">{HYBRID_SUITE}</div>
          </Card>
          <Card className="p-6">
            <Cpu className="w-8 h-8 text-primary mb-3" />
            <div className="text-sm text-muted-foreground">Standard</div>
            <div className="font-mono text-lg font-bold">{PQC_STANDARD}</div>
          </Card>
          <Card className="p-6">
            <CheckCircle2 className="w-8 h-8 text-primary mb-3" />
            <div className="text-sm text-muted-foreground">Signature size</div>
            <div className="font-mono text-lg font-bold">~3.3 KB</div>
          </Card>
        </section>

        <section className="container mx-auto px-4 pb-16 max-w-5xl">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Try it — sign any string with hybrid PQC</h2>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full h-24 p-3 rounded-md border border-border bg-background font-mono text-sm mb-4"
              placeholder="Message to sign..."
            />
            <div className="flex gap-3 flex-wrap">
              <Button onClick={signServer} disabled={loading || !message}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                Sign with APEX server key
              </Button>
              <Button variant="outline" onClick={signLocal} disabled={loading || !message}>
                Ephemeral (in-browser)
              </Button>
              {sig && (
                <Button variant="ghost" onClick={download}><Download className="w-4 h-4 mr-2" />Download .json</Button>
              )}
            </div>

            {verify && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className={`p-4 rounded-md border ${verify.ed25519_ok ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5"}`}>
                  <div className="flex items-center gap-2 font-bold">
                    {verify.ed25519_ok ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}
                    Ed25519 (classical)
                  </div>
                </div>
                <div className={`p-4 rounded-md border ${verify.mldsa_ok ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5"}`}>
                  <div className="flex items-center gap-2 font-bold">
                    {verify.mldsa_ok ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}
                    ML-DSA-65 (post-quantum)
                  </div>
                </div>
              </div>
            )}

            {sig && (
              <pre className="mt-6 p-4 bg-muted/50 rounded-md text-xs overflow-x-auto font-mono max-h-96">
{JSON.stringify(sig, null, 2)}
              </pre>
            )}
          </Card>

          {serverKeys?.ed25519_public_key && (
            <Card className="p-6 mt-6">
              <h3 className="font-bold mb-3">APEX PSI Public Keys</h3>
              <div className="space-y-2 text-xs font-mono break-all">
                <div><span className="text-muted-foreground">Ed25519:</span> {serverKeys.ed25519_public_key}</div>
                <div><span className="text-muted-foreground">ML-DSA-65:</span> {serverKeys.mldsa65_public_key.slice(0, 128)}…</div>
              </div>
            </Card>
          )}

          <div className="mt-8 prose prose-invert max-w-none">
            <h2>Why hybrid, why now</h2>
            <p>
              NIST finalized ML-DSA in FIPS 204 in August 2024. Regulators (BSI, ANSSI, NSA CNSA 2.0) now recommend
              hybrid classical + post-quantum signatures for any signature meant to survive past ~2030. APEX receipts
              are designed to be permanent legal evidence — they must outlive the classical era.
            </p>
            <p>
              A hybrid failure model: if <strong>either</strong> primitive is broken in the future, the other still
              proves the receipt is authentic. An attacker must break <em>both</em> mathematics — a lattice problem
              and an elliptic-curve problem — to forge a single APEX receipt.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
