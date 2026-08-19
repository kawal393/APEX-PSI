import { motion } from "framer-motion";
import { Copy, Download, FileText, Shield, Zap, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

const HEADER_EXAMPLE = `HTTP/1.1 200 OK
Content-Type: application/json
Compliance-Receipt: v=1; rid=psi_01HZX7QK4M; pred=eu-ai-act/art-6,nist-ai-rmf/govern-1.1;
                    status=compliant; sig=ed25519:MEUCIQD...base64...==;
                    anchor=ots:AAEAAB...base64...==;
                    verify=https://ai-governance-standard.com/verify/psi_01HZX7QK4M
Compliance-Receipt-Policy: v=1; mode=optimistic; challenge-window=86400; issuer=apex-psi`;

const ABNF = `Compliance-Receipt   = "v=" version 1*( ";" SP param )
version              = 1*DIGIT
param                = rid-param / pred-param / status-param
                     / sig-param / anchor-param / verify-param
rid-param            = "rid=" 1*VCHAR
pred-param           = "pred=" predicate *( "," predicate )
predicate            = registry "/" predicate-id
status-param         = "status=" ( "compliant" / "challenged" / "violation" )
sig-param            = "sig=" scheme ":" base64
scheme               = "ed25519"
anchor-param         = "anchor=" anchor-scheme ":" base64
anchor-scheme        = "ots" / "btc" / "polygon"
verify-param         = "verify=" absolute-URI`;

const CURL = `curl -i https://your-ai-endpoint.com/v1/chat \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"Hello"}'

# Response includes:
# Compliance-Receipt: v=1; rid=psi_...; status=compliant; verify=https://...`;

const WELL_KNOWN = `{
  "issuer": "https://ai-governance-standard.com",
  "spec": "draft-singh-psi-http-01",
  "version": 1,
  "public_keys": [
    {
      "kid": "apex-psi-2026",
      "alg": "Ed25519",
      "pem": "MCowBQYDK2VwAyEA..."
    }
  ],
  "verify_endpoint": "https://ai-governance-standard.com/verify",
  "predicate_registry": "https://ai-governance-standard.com/registry"
}`;

const Standard = () => {
  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} copied`);
  };

  const downloadDraft = () => {
    window.open("/ietf/draft-singh-psi-http-01.txt", "_blank");
  };

  return (
    <>
      <Helmet>
        <title>Compliance-Receipt HTTP Header — draft-singh-psi-http-01 — Apex PSI — Universal Verification Layer</title>
        <meta name="description" content="The Compliance-Receipt HTTP response header specification for embedding cryptographic evidence in every API response." />
        <link rel="canonical" href="https://ai-governance-standard.com/standard" />
        <meta property="og:title" content="Compliance-Receipt HTTP Header — draft-singh-psi-http-01" />
        <meta property="og:description" content="The Compliance-Receipt HTTP response header specification for embedding cryptographic evidence in every API response." />
        <meta property="og:url" content="https://ai-governance-standard.com/standard" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20 pb-16">
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-5xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="outline" className="border-primary/30 text-primary mb-4 tracking-widest">
                IETF DRAFT — draft-singh-psi-http-01
              </Badge>
              <h1 className="text-3xl sm:text-5xl font-black mb-4 leading-tight">
                <span className="text-chrome-gradient">One HTTP Header.</span>
                <br />
                <span className="text-gold-gradient">Every AI Response.</span>
              </h1>
              <p className="text-sm sm:text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
                The <code className="text-primary font-mono">Compliance-Receipt</code> header is a proposed
                IETF standard that lets any AI response carry a signed, publicly verifiable proof of
                regulatory compliance — the way every HTTPS response carries a TLS certificate.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="hero" size="sm" onClick={() => copy(HEADER_EXAMPLE, "Header")}>
                  <Copy className="h-4 w-4 mr-2" /> Copy header example
                </Button>
                <Button variant="heroOutline" size="sm" onClick={downloadDraft}>
                  <Download className="h-4 w-4 mr-2" /> Internet-Draft .txt
                </Button>
                <Button variant="heroOutline" size="sm" asChild>
                  <a href="/header">
                    <Zap className="h-4 w-4 mr-2" /> Live inspector
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-4 py-8">
          <div className="container mx-auto max-w-5xl space-y-8">
            <div className="rounded-xl border border-border bg-card/80 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Header — wire format
                  </span>
                </div>
                <button onClick={() => copy(HEADER_EXAMPLE, "Header")} className="text-muted-foreground hover:text-primary">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <pre className="p-6 text-[11px] sm:text-sm font-mono text-foreground/80 whitespace-pre-wrap overflow-x-auto leading-relaxed">
{HEADER_EXAMPLE}
              </pre>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card/80 p-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Status codes</h3>
                <ul className="space-y-2 text-sm text-foreground/80">
                  <li><code className="text-primary">200 OK</code> — response carries a compliant receipt.</li>
                  <li><code className="text-amber-400">200 OK + status=challenged</code> — receipt issued, predicate flagged for review.</li>
                  <li><code className="text-destructive">451 Unavailable For Legal Reasons</code> — response blocked by a predicate; receipt carries the violation.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-card/80 p-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Trust model</h3>
                <ul className="space-y-2 text-sm text-foreground/80">
                  <li>Receipts are signed Ed25519 (RFC 8032) by an issuer key published at <code className="text-primary">/.well-known/compliance-receipt</code>.</li>
                  <li>Each receipt links to a public <code className="text-primary">verify=</code> URL — no shared infrastructure required.</li>
                  <li>Anchored to OpenTimestamps (Bitcoin) and Polygon for third-party temporal proof.</li>
                </ul>
                <p className="mt-4 pt-4 border-t border-border text-sm text-foreground/80 leading-relaxed">
                  The Compliance-Receipt header is one of two in-band metadata mechanisms. The second is C2PA Content
                  Credentials embedded directly in content files (JPEG, PNG, MP4, WAV, PDF). Both use the same
                  Ed25519 + ML-DSA-65 hybrid signature stack. Both are publicly verifiable. See{" "}
                  <a href="/eu-ai-act" className="text-primary hover:underline">/eu-ai-act</a> for full documentation.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/80 overflow-hidden">
              <div className="px-6 py-3 border-b border-border bg-muted/30">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ABNF — RFC 5234</span>
              </div>
              <pre className="p-6 text-[11px] sm:text-sm font-mono text-foreground/80 whitespace-pre-wrap overflow-x-auto leading-relaxed">
{ABNF}
              </pre>
            </div>

            <div className="rounded-xl border border-border bg-card/80 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/30">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">/.well-known/compliance-receipt</span>
                <button onClick={() => copy(WELL_KNOWN, "Descriptor")} className="text-muted-foreground hover:text-primary">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <pre className="p-6 text-[11px] sm:text-sm font-mono text-foreground/80 whitespace-pre-wrap overflow-x-auto leading-relaxed">
{WELL_KNOWN}
              </pre>
            </div>

            <div className="rounded-xl border border-border bg-card/80 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/30">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Verify any endpoint</span>
                <button onClick={() => copy(CURL, "curl")} className="text-muted-foreground hover:text-primary">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <pre className="p-6 text-[11px] sm:text-sm font-mono text-foreground/80 whitespace-pre-wrap overflow-x-auto leading-relaxed">
{CURL}
              </pre>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-foreground mb-2">IANA registration intent</h3>
                  <p className="text-sm text-foreground/80 mb-3">
                    APEX PSI is preparing the IANA permanent message header registration for
                    <code className="text-primary mx-1">Compliance-Receipt</code> and
                    <code className="text-primary mx-1">Compliance-Receipt-Policy</code> under RFC 3864.
                    Reference: <code className="text-primary">draft-singh-psi-http-01</code>.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="heroOutline" size="sm" asChild>
                      <a href="/ietf/draft-singh-psi-http-01.txt" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Draft text
                      </a>
                    </Button>
                    <Button variant="heroOutline" size="sm" asChild>
                      <a href="/foundation">Foundation governance</a>
                    </Button>
                    <Button variant="heroOutline" size="sm" asChild>
                      <a href="/paper">Peer-review paper</a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  </>
  );
};

export default Standard;
