import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Lock, Download, Loader2, ShieldCheck } from "lucide-react";
import { hybridSignEphemeral, hybridVerify, type HybridSignature } from "@/lib/psi-pqc";
import { toast } from "sonner";

type Commitment = {
  id: string;
  lab: string;
  model: string;
  capability: string;
  evalHash: string;
  committedAt: string;
  sig: HybridSignature;
};

const LS = "apex.agi.ledger.v1";

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export default function AGILedger() {
  const [items, setItems] = useState<Commitment[]>([]);
  const [lab, setLab] = useState("");
  const [model, setModel] = useState("");
  const [capability, setCapability] = useState("");
  const [evalText, setEvalText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(LS) || "[]")); } catch { /* ignore */ }
  }, []);

  const commit = async () => {
    if (!lab || !model || !capability || !evalText) return toast.error("All fields required");
    setBusy(true);
    try {
      const evalHash = await sha256(evalText);
      const payload = JSON.stringify({ lab, model, capability, evalHash, ts: new Date().toISOString() });
      const sig = await hybridSignEphemeral(payload);
      const c: Commitment = {
        id: sig.message_hash.slice(0, 16),
        lab, model, capability, evalHash,
        committedAt: sig.signed_at, sig,
      };
      const next = [c, ...items].slice(0, 500);
      setItems(next);
      localStorage.setItem(LS, JSON.stringify(next));
      setEvalText(""); setCapability("");
      toast.success("Pre-commitment sealed (Ed25519 + ML-DSA-65)");
    } catch (e: any) {
      toast.error(e?.message || "commit failed");
    } finally { setBusy(false); }
  };

  const verifyOne = async (c: Commitment) => {
    const payload = JSON.stringify({ lab: c.lab, model: c.model, capability: c.capability, evalHash: c.evalHash, ts: c.committedAt });
    const v = await hybridVerify(payload, c.sig);
    toast[v.ok ? "success" : "error"](
      `Ed25519 ${v.ed25519_ok ? "✓" : "✗"} · ML-DSA-65 ${v.mldsa_ok ? "✓" : "✗"}`
    );
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ ledger: "APEX AGI Pre-Commitment", items }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `agi-ledger-${Date.now()}.json`;
    a.click();
  };

  return (
    <>
      <Helmet>
        <title>AGI Capability Pre-Commitment Ledger — Apex PSI — Universal Verification Layer</title>
        <meta name="description" content="Cryptographically pre-commit AI capability evaluation results before model release. Hybrid Ed25519 + ML-DSA-65 signatures. Quantum-resistant pre-registration for the AGI era." />
        <link rel="canonical" href="https://ai-governance-standard.com/agi-ledger" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-5xl px-4 py-16">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
              <Brain className="h-3 w-3 mr-1" /> AGI Safety Layer
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              <span className="text-gold-gradient">AGI Capability</span> Pre-Commitment Ledger
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Labs cryptographically pre-commit the hash of a capability evaluation <em>before</em> a model ships.
              After release, the evaluation can be published — but never rewritten. Quantum-resistant.
            </p>
          </div>

          <Card className="p-6 mb-8 border-primary/20">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Lock className="h-4 w-4" /> New Pre-Commitment</h2>
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <Input placeholder="Lab (e.g. Anthropic, OpenAI, Google DeepMind)" value={lab} onChange={(e) => setLab(e.target.value)} />
              <Input placeholder="Model (e.g. Claude 4.5, GPT-6, Gemini 3)" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
            <Input className="mb-3" placeholder="Capability tested (e.g. autonomous replication, CBRN uplift, cyberoffense)" value={capability} onChange={(e) => setCapability(e.target.value)} />
            <Textarea className="mb-3 min-h-32 font-mono text-xs" placeholder="Paste raw evaluation result / scoring / methodology. Only its SHA-256 is stored." value={evalText} onChange={(e) => setEvalText(e.target.value)} />
            <Button onClick={commit} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Seal Pre-Commitment (Hybrid Ed25519 + ML-DSA-65)
            </Button>
          </Card>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{items.length} Sealed Commitments</h2>
            {items.length > 0 && <Button variant="outline" size="sm" onClick={exportAll}><Download className="h-4 w-4 mr-2" /> Export JSON</Button>}
          </div>

          <div className="space-y-3">
            {items.length === 0 && <Card className="p-8 text-center text-muted-foreground">No commitments yet. Be the first lab to pre-register.</Card>}
            {items.map((c) => (
              <Card key={c.id} className="p-4 hover:border-primary/40 transition-colors">
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <Badge variant="outline">{c.lab}</Badge>
                  <Badge>{c.model}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(c.committedAt).toLocaleString()}</span>
                </div>
                <div className="text-sm mb-1"><span className="text-muted-foreground">Capability:</span> {c.capability}</div>
                <div className="text-xs font-mono break-all text-muted-foreground mb-2">eval-hash: {c.evalHash}</div>
                <Button variant="ghost" size="sm" onClick={() => verifyOne(c)}>Verify hybrid signature</Button>
              </Card>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
