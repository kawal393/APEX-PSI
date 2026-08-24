import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ShieldX,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  Code2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProofReceipt, { type ProofReceiptData } from "@/components/verify/ProofReceipt";
import CountersignUpsell from "@/components/CountersignUpsell";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/site";
import { toast } from "sonner";

const VERIFY_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/verify-hash`;

interface ReceiptResponse extends ProofReceiptData {
  verified?: boolean;
  found?: boolean;
  commit_id?: string;
  predicate_id?: string;
  status?: string;
  phase?: string;
  created_at?: string;
  algorithm?: string;
  engine?: string;
  sequence_number?: number;
  eu_ai_act_compliance?: boolean;
  message?: string;
}

/**
 * Public, permanently resolvable receipt page: /r/:hash
 * Every seal becomes an indexable page anyone — buyer, auditor, regulator —
 * can open without an account and re-verify against the live ledger.
 */
const Receipt = () => {
  const { hash = "" } = useParams();
  const clean = hash.replace(/^sha256:/i, "").trim();
  const [data, setData] = useState<ReceiptResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [showEmbed, setShowEmbed] = useState(false);

  const canonical = `${SITE_URL}/r/${clean}`;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${VERIFY_URL}?hash=${encodeURIComponent(clean)}`);
        const json = (await res.json()) as ReceiptResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ found: false, verified: false, message: "Verification service unreachable." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (clean.length > 0) run();
    return () => {
      cancelled = true;
    };
  }, [clean]);

  const copy = useCallback((value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    toast.success("Copied");
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const found = !!data?.found;
  const shortHash = `${clean.slice(0, 12)}…${clean.slice(-8)}`;
  const title = found
    ? `Verified proof ${clean.slice(0, 12)} — APEX PSI receipt`
    : `Unknown hash ${clean.slice(0, 12)} — APEX PSI receipt`;
  const description = found
    ? `Cryptographic receipt for ${shortHash}. Sealed ${data?.created_at ? new Date(data.created_at).toUTCString() : "in the APEX PSI ledger"} with ${data?.algorithm ?? "SHA-256 + Ed25519"}. Independently re-verifiable against the public AI governance standard ledger.`
    : `No APEX PSI ledger entry matches ${shortHash}. Verify any hash for free against the public AI governance standard ledger.`;

  const embedSnippet = `<a href="${canonical}" target="_blank" rel="noopener">
  <img src="${SITE_URL}/apex-verified-badge.svg" alt="APEX PSI Verified — proof ${clean.slice(0, 12)}" height="40" />
</a>`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title.slice(0, 60)} — Apex PSI — Universal Verification Layer</title>
        <meta name="description" content={description.slice(0, 158)} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description.slice(0, 158)} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: title,
            description,
            url: canonical,
            identifier: `sha256:${clean}`,
            dateCreated: data?.created_at ?? undefined,
            isBasedOn: `${SITE_URL}/standard`,
            publisher: { "@type": "Organization", name: "APEX PSI", url: SITE_URL },
          })}
        </script>
      </Helmet>

      <Navbar />

      <main className="container mx-auto max-w-4xl px-4 pt-28 pb-20">
        <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">
          Public Proof Receipt
        </p>

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-6 md:p-8">
            <div className="flex items-center gap-3 text-muted-foreground mb-5">
              <Loader2 className="h-5 w-5 animate-spin" />
              Re-verifying against the live ledger…
            </div>
            <code className="font-mono text-xs text-foreground/70 bg-muted/40 rounded px-2 py-1 break-all">
              sha256:{clean}
            </code>
          </div>
        ) : (

          <>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border p-6 md:p-8 mb-8 ${
                found ? "border-compliant/40 bg-compliant/[0.04]" : "border-destructive/40 bg-destructive/[0.04]"
              }`}
            >
              <div className="flex items-start gap-4">
                {found ? (
                  <ShieldCheck className="h-10 w-10 text-compliant flex-shrink-0" />
                ) : (
                  <ShieldX className="h-10 w-10 text-destructive flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                    {found ? "This proof exists in the ledger" : "No ledger entry for this hash"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {found
                      ? "APEX PSI attests that this exact hash was sealed at the time recorded below. It attests existence and integrity — not the truth of the underlying content."
                      : "Nothing has been sealed under this hash. Anyone can seal a hash for free — no account required."}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <code className="font-mono text-xs text-foreground/80 bg-muted/40 rounded px-2 py-1 break-all">
                      sha256:{clean}
                    </code>
                    <button
                      onClick={() => copy(`sha256:${clean}`, "hash")}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Copy hash"
                    >
                      {copied === "hash" ? <Check className="h-4 w-4 text-compliant" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>

                  {found && (
                    <dl className="grid sm:grid-cols-2 gap-4 mt-6 text-sm">
                      <div>
                        <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Receipt ID</dt>
                        <dd className="font-mono text-foreground/90 break-all">{data?.commit_id}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Sealed at (UTC)</dt>
                        <dd className="font-mono text-foreground/90">
                          {data?.created_at ? new Date(data.created_at).toUTCString() : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Algorithms</dt>
                        <dd className="font-mono text-foreground/90">{data?.algorithm ?? "SHA-256 + Ed25519"}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Predicate</dt>
                        <dd className="font-mono text-foreground/90">{data?.predicate_id ?? "—"}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              </div>
            </motion.div>

            {found && data && (
              <div className="mb-10">
                <ProofReceipt data={data} />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <CountersignUpsell reference={clean} />

              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-2">
                  Publish this proof
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Put the badge on your site or model card. It links back to this receipt, so
                  anyone can verify without trusting you — or us.
                </p>
                <Button variant="heroOutline" size="sm" onClick={() => setShowEmbed((v) => !v)}>
                  <Code2 className="h-4 w-4 mr-1" />
                  {showEmbed ? "Hide embed code" : "Show embed code"}
                </Button>
                {showEmbed && (
                  <div className="mt-4">
                    <pre className="text-[11px] font-mono bg-muted/40 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all text-foreground/80">
                      {embedSnippet}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => copy(embedSnippet, "embed")}
                    >
                      {copied === "embed" ? "Copied" : "Copy snippet"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="hero" asChild>
                <Link to="/verify">
                  Verify another hash <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button variant="heroOutline" asChild>
                <Link to="/seal">Seal a file for free</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/standard">Read the standard</Link>
              </Button>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Receipt;
