import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Eye, Globe2, Share2 } from "lucide-react";
import { toast } from "sonner";

type Witness = {
  hash: string;
  caption: string;
  at: string;
  lat?: number;
  lng?: number;
};

const LS = "apex.witness.wall.v1";

export default function WitnessWall() {
  const [items, setItems] = useState<Witness[]>([]);
  const [hash, setHash] = useState("");
  const [caption, setCaption] = useState("");

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(LS) || "[]")); } catch { /* ignore */ }
  }, []);

  const post = () => {
    if (!/^[0-9a-f]{64}$/i.test(hash.trim())) return toast.error("Paste a valid SHA-256 hash");
    if (!caption.trim()) return toast.error("Add a short caption");
    const commit = (lat?: number, lng?: number) => {
      const w: Witness = { hash: hash.trim().toLowerCase(), caption: caption.trim().slice(0, 240), at: new Date().toISOString(), lat, lng };
      const next = [w, ...items].slice(0, 500);
      setItems(next);
      localStorage.setItem(LS, JSON.stringify(next));
      setHash(""); setCaption("");
      toast.success("Posted to the Witness Wall");
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => commit(+p.coords.latitude.toFixed(3), +p.coords.longitude.toFixed(3)),
        () => commit(),
        { timeout: 3000 }
      );
    } else commit();
  };

  const share = async (w: Witness) => {
    const url = `https://ai-governance-standard.com/verify?h=${w.hash}`;
    const text = `🧿 I WITNESS THIS — ${w.caption}\n${url}`;
    try {
      if (navigator.share) await navigator.share({ title: "APEX PRAMAAN", text, url });
      else { await navigator.clipboard.writeText(text); toast.success("Copied"); }
    } catch { /* ignore */ }
  };

  return (
    <>
      <Helmet>
        <title>Global Witness Wall — APEX PRAMAAN</title>
        <meta name="description" content="A public wall of cryptographically sealed witness events. Journalists, citizens, and observers post SHA-256 hashes of what they saw — verifiable by anyone." />
        <link rel="canonical" href="https://ai-governance-standard.com/witness-wall" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-4xl px-4 py-16">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
              <Globe2 className="h-3 w-3 mr-1" /> Public · Permissionless
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              <span className="text-gold-gradient">Witness</span> <span className="text-chrome-gradient">Wall</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Post a Pramaan-sealed hash and one line of context. What existed. When. Where — if you choose.
            </p>
          </div>

          <Card className="p-6 mb-8 border-primary/20">
            <div className="flex gap-2 mb-3">
              <Input placeholder="SHA-256 hash (from /pramaan)" value={hash} onChange={(e) => setHash(e.target.value)} className="font-mono text-xs" />
            </div>
            <Input className="mb-3" placeholder="One line of context (≤240 chars)" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={240} />
            <Button onClick={post} className="w-full"><Eye className="h-4 w-4 mr-2" /> Post to the Wall</Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Don't have a hash yet? <a href="/pramaan" className="underline">Seal one on /pramaan</a>.
            </p>
          </Card>

          <div className="space-y-3">
            {items.length === 0 && <Card className="p-8 text-center text-muted-foreground">The wall is empty. Be the first witness.</Card>}
            {items.map((w) => (
              <Card key={w.hash + w.at} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{new Date(w.at).toLocaleString()}</span>
                  {w.lat != null && w.lng != null && (
                    <Badge variant="outline" className="text-[10px]">📍 {w.lat}, {w.lng}</Badge>
                  )}
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => share(w)}>
                    <Share2 className="h-3.5 w-3.5 mr-1" /> Share
                  </Button>
                </div>
                <div className="text-sm mb-2">{w.caption}</div>
                <div className="text-[11px] font-mono break-all text-muted-foreground">{w.hash}</div>
              </Card>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
