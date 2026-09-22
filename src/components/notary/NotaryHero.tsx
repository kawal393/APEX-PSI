import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Shield, FileText, Lock, Copy, Check, Terminal } from "lucide-react";

const NOTARY_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/notarize`;

const curlOneLiner = `curl -X POST ${NOTARY_URL} \\
  -H "Content-Type: application/json" \\
  -d '{"decision":"Model approved loan #4521","model_id":"gpt-4","predicate":"EU_ART_12"}'`;

const NotaryHero = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(curlOneLiner);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative py-20 sm:py-32 px-4 overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(43 85% 52% / 0.08) 0%, transparent 60%)" }}
      />
      <div className="container mx-auto max-w-5xl relative z-10 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Badge variant="outline" className="border-primary/30 text-primary mb-6 text-xs tracking-widest">
            APEX NOTARY — CRYPTOGRAPHIC ATTESTATION API
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-6 leading-[0.95]">
            <span className="text-chrome-gradient">Every AI Decision.</span>
            <br />
            <span className="text-gold-gradient">Mathematically Notarized.</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg mb-8">
            One API call. SHA-256 hashed. Ed25519 signed. Merkle-anchored.
            A tamper-evident receipt for every AI decision your system makes —
            satisfying EU AI Act Articles 12, 13 & 14.
          </p>

          {/* Instant curl command */}
          <div className="max-w-3xl mx-auto mb-10">
            <div className="rounded-xl border border-border bg-card overflow-hidden text-left">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Try it now — no signup required</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors text-xs text-primary font-medium"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-xs font-mono text-foreground/80 leading-relaxed">
                <code>{curlOneLiner}</code>
              </pre>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {[
              { icon: Shield, label: "Ed25519 Signed", desc: "Cryptographic non-repudiation" },
              { icon: FileText, label: "Merkle Anchored", desc: "Inclusion proof for every receipt" },
              { icon: Lock, label: "Zero IP Exposure", desc: "Only hashes leave your system" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 bg-card/60 border border-border rounded-xl px-5 py-3">
                <item.icon className="h-5 w-5 text-primary shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default NotaryHero;
