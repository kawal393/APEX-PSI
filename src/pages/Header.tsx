import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Check, X, Loader2, Shield, Hash, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

type InspectResult = {
  url: string;
  has_header: boolean;
  status?: number;
  header_raw?: string;
  parsed?: {
    v?: string;
    rid?: string;
    pred?: string;
    status?: string;
    sig?: string;
    anchor?: string;
    verify?: string;
  };
  signature_verified?: boolean;
  issuer?: string;
  error?: string;
};

const PROJECT_ID = "qhtntebpcribjiwrdtdd";
const INSPECT_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/inspect-header`;

const Header = () => {
  const [url, setUrl] = useState("https://apex-psi.lovable.app/api/echo");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InspectResult | null>(null);

  const inspect = async () => {
    if (!url) {
      toast.error("Enter a URL");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(INSPECT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (await res.json()) as InspectResult;
      setResult(json);
      if (json.has_header) {
        toast.success(`Receipt found · ${json.signature_verified ? "signature verified" : "signature unverified"}`);
      } else {
        toast.info("No Compliance-Receipt header found");
      }
    } catch (e: any) {
      toast.error(e?.message || "Inspect failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20 pb-16">
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="outline" className="border-primary/30 text-primary mb-4 tracking-widest">
                LIVE INSPECTOR
              </Badge>
              <h1 className="text-3xl sm:text-5xl font-black mb-4 leading-tight">
                <span className="text-chrome-gradient">Inspect any AI endpoint.</span>
                <br />
                <span className="text-gold-gradient">Verify its receipt.</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-8">
                Paste a URL. We fetch it server-side, parse the{" "}
                <code className="text-primary font-mono">Compliance-Receipt</code> header, and verify the
                Ed25519 signature against the issuer's <code className="text-primary font-mono">/.well-known</code>.
              </p>
            </motion.div>

            <div className="flex gap-2 max-w-2xl mx-auto">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-endpoint.com/v1/chat"
                className="font-mono text-xs sm:text-sm"
                onKeyDown={(e) => e.key === "Enter" && inspect()}
              />
              <Button variant="hero" onClick={inspect} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">Inspect</span>
              </Button>
            </div>
          </div>
        </section>

        {result && (
          <section className="px-4 pb-8">
            <div className="container mx-auto max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card/80 overflow-hidden"
              >
                <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    {result.has_header ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <X className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {result.has_header ? "Receipt detected" : "No receipt"}
                    </span>
                  </div>
                  {result.status !== undefined && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      HTTP {result.status}
                    </Badge>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  {result.error && (
                    <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded p-3">
                      {result.error}
                    </div>
                  )}

                  {result.header_raw && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                        Raw header
                      </div>
                      <pre className="text-[11px] font-mono text-foreground/80 bg-muted/30 border border-border rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
{result.header_raw}
                      </pre>
                    </div>
                  )}

                  {result.parsed && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {Object.entries(result.parsed).map(([k, v]) =>
                        v ? (
                          <div key={k} className="border border-border rounded p-3 bg-muted/20">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k}</div>
                            <div className="text-xs font-mono text-foreground break-all mt-1">{v}</div>
                          </div>
                        ) : null
                      )}
                    </div>
                  )}

                  {result.has_header && (
                    <div className="flex items-center gap-2 pt-2">
                      <Shield className={`h-4 w-4 ${result.signature_verified ? "text-emerald-400" : "text-amber-400"}`} />
                      <span className="text-sm">
                        {result.signature_verified ? "Ed25519 signature verified" : "Signature not verified (issuer key unreachable)"}
                      </span>
                      {result.issuer && (
                        <Badge variant="outline" className="ml-auto font-mono text-[10px]">
                          issuer: {result.issuer}
                        </Badge>
                      )}
                    </div>
                  )}

                  {result.parsed?.verify && (
                    <Button variant="heroOutline" size="sm" asChild>
                      <a href={result.parsed.verify} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Open public verify page
                      </a>
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>
          </section>
        )}

        <section className="px-4 py-10">
          <div className="container mx-auto max-w-4xl rounded-xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-start gap-3">
              <Hash className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm text-foreground/80">
                The inspector hits the URL with a <code className="text-primary">HEAD</code> first, then a
                <code className="text-primary mx-1">GET</code> if needed, and reads the response headers
                without consuming the body. Nothing is stored. See the{" "}
                <a href="/standard" className="text-primary underline">header spec</a> for the wire format.
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Header;
