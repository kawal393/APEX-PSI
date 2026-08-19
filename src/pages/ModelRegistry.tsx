import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Cpu, Download, Loader2, Search, ShieldCheck } from "lucide-react";
import { hybridSignEphemeral, hybridVerify, type HybridSignature } from "@/lib/psi-pqc";
import { toast } from "sonner";

type ModelCard = {
  id: string;
  name: string;
  vendor: string;
  version: string;
  license: string;
  intendedUse: string;
  cardHash: string;
  registeredAt: string;
  sig: HybridSignature;
};

const LS = "apex.models.registry.v1";

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export default function ModelRegistry() {
  const [items, setItems] = useState<ModelCard[]>([]);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [vendor, setVendor] = useState("");
  const [version, setVersion] = useState("");
  const [license, setLicense] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [card, setCard] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(LS) || "[]")); } catch { /* ignore */ }
  }, []);

  const register = async () => {
    if (!name || !vendor || !version || !card) return toast.error("Name, vendor, version and model card required");
    setBusy(true);
    try {
      const cardHash = await sha256(card);
      const payload = JSON.stringify({ name, vendor, version, license, intendedUse, cardHash, ts: new Date().toISOString() });
      const sig = await hybridSignEphemeral(payload);
      const m: ModelCard = {
        id: sig.message_hash.slice(0, 16),
        name, vendor, version, license: license || "unspecified",
        intendedUse: intendedUse || "unspecified",
        cardHash, registeredAt: sig.signed_at, sig,
      };
      const next = [m, ...items].slice(0, 1000);
      setItems(next);
      localStorage.setItem(LS, JSON.stringify(next));
      setName(""); setVendor(""); setVersion(""); setLicense(""); setIntendedUse(""); setCard("");
      toast.success("Model registered with hybrid signature");
    } catch (e: any) {
      toast.error(e?.message || "register failed");
    } finally { setBusy(false); }
  };

  const verifyOne = async (m: ModelCard) => {
    const payload = JSON.stringify({ name: m.name, vendor: m.vendor, version: m.version, license: m.license === "unspecified" ? "" : m.license, intendedUse: m.intendedUse === "unspecified" ? "" : m.intendedUse, cardHash: m.cardHash, ts: m.registeredAt });
    const v = await hybridVerify(payload, m.sig);
    toast[v.ok ? "success" : "error"](
      `Ed25519 ${v.ed25519_ok ? "✓" : "✗"} · ML-DSA-65 ${v.mldsa_ok ? "✓" : "✗"}`
    );
  };

  const filtered = items.filter((m) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return m.name.toLowerCase().includes(s) || m.vendor.toLowerCase().includes(s) || m.version.toLowerCase().includes(s);
  });

  return (
    <>
      <Helmet>
        <title>Public AI Model Registry — Apex PSI — Universal Verification Layer</title>
        <meta name="description" content="Open, cryptographically-signed registry of AI models. Register any model card with a hybrid Ed25519 + ML-DSA-65 signature. Regulator- and developer-friendly." />
        <link rel="canonical" href="https://ai-governance-standard.com/models" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-5xl px-4 py-16">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
              <Cpu className="h-3 w-3 mr-1" /> Open AI Model Registry
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              <span className="text-chrome-gradient">Every Model.</span> <span className="text-gold-gradient">Signed. Searchable.</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A permissionless registry of AI model cards. Anyone can register — every entry is hybrid-signed and immutable.
            </p>
          </div>

          <Card className="p-6 mb-8 border-primary/20">
            <h2 className="text-lg font-bold mb-4">Register a Model</h2>
            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <Input placeholder="Model name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Vendor / lab" value={vendor} onChange={(e) => setVendor(e.target.value)} />
              <Input placeholder="Version" value={version} onChange={(e) => setVersion(e.target.value)} />
            </div>
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <Input placeholder="License (e.g. MIT, Apache-2.0, proprietary)" value={license} onChange={(e) => setLicense(e.target.value)} />
              <Input placeholder="Intended use" value={intendedUse} onChange={(e) => setIntendedUse(e.target.value)} />
            </div>
            <Textarea className="mb-3 min-h-32 font-mono text-xs" placeholder="Paste full model card (markdown / JSON). Only its SHA-256 is stored." value={card} onChange={(e) => setCard(e.target.value)} />
            <Button onClick={register} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Register (Hybrid Ed25519 + ML-DSA-65)
            </Button>
          </Card>

          <div className="flex gap-2 items-center mb-4">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name, vendor, version…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Badge variant="outline">{items.length} total</Badge>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 && <Card className="p-8 text-center text-muted-foreground">No models yet. Register the first one.</Card>}
            {filtered.map((m) => (
              <Card key={m.id} className="p-4 hover:border-primary/40 transition-colors">
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <Badge>{m.vendor}</Badge>
                  <span className="font-bold">{m.name}</span>
                  <Badge variant="outline">v{m.version}</Badge>
                  <Badge variant="secondary">{m.license}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(m.registeredAt).toLocaleDateString()}</span>
                </div>
                <div className="text-sm mb-1"><span className="text-muted-foreground">Intended use:</span> {m.intendedUse}</div>
                <div className="text-xs font-mono break-all text-muted-foreground mb-2">card-hash: {m.cardHash}</div>
                <Button variant="ghost" size="sm" onClick={() => verifyOne(m)}>Verify hybrid signature</Button>
              </Card>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
