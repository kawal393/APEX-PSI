import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ShieldCheck, ShieldAlert, ShieldX, Loader2, Check, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHECKOUT } from "@/lib/commerce";
import ServiceCheckoutButton from "@/components/ServiceCheckoutButton";
import { SITE_URL } from "@/lib/site";
import { toast } from "sonner";

const CHECK_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/registry-check`;

interface Signal {
  id: string;
  label: string;
  present: boolean;
  detail: string;
}

interface CheckResult {
  domain: string;
  checked_at: string;
  reachable: boolean;
  score: number;
  grade: "VERIFIED_SUPPLIER" | "CONFORMANT_SIGNALS" | "PARTIAL_SIGNALS" | "NO_SIGNALS";
  registry_listing: { listed: boolean; display_name: string | null };
  signals: Signal[];
  error?: string;
}

const GRADE_COPY: Record<
  CheckResult["grade"],
  { label: string; card: string; icon: typeof ShieldCheck; iconClass: string }
> = {
  VERIFIED_SUPPLIER: {
    label: "Verified Supplier",
    card: "border-compliant/40 bg-compliant/[0.04]",
    icon: ShieldCheck,
    iconClass: "text-compliant",
  },
  CONFORMANT_SIGNALS: {
    label: "Conformity signals present",
    card: "border-compliant/40 bg-compliant/[0.04]",
    icon: ShieldCheck,
    iconClass: "text-compliant",
  },
  PARTIAL_SIGNALS: {
    label: "Partial signals",
    card: "border-warning/40 bg-warning/[0.04]",
    icon: ShieldAlert,
    iconClass: "text-warning",
  },
  NO_SIGNALS: {
    label: "No transparency signals",
    card: "border-destructive/40 bg-destructive/[0.04]",
    icon: ShieldX,
    iconClass: "text-destructive",
  },
};

/**
 * /registry/check — free procurement console.
 * Buyers, auditors and regulators check a supplier domain for AI transparency
 * conformity signals. Free to check, paid to be listed.
 */
const VendorCheck = () => {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const run = async () => {
    const value = domain.trim();
    if (!value) {
      toast.error("Enter a supplier domain");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${CHECK_URL}?domain=${encodeURIComponent(value)}`);
      const json = (await res.json()) as CheckResult;
      if (json.error) {
        toast.error(json.error);
      } else {
        setResult(json);
      }
    } catch {
      toast.error("Check failed — try again");
    } finally {
      setLoading(false);
    }
  };

  const grade = result ? GRADE_COPY[result.grade] : null;
  const GradeIcon = grade?.icon ?? ShieldCheck;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>AI Supplier Transparency Check — APEX PSI Registry</title>
        <meta
          name="description"
          content="Free check of any supplier domain for AI transparency conformity signals: PSI protocol descriptor, Compliance-Receipt header, published trust anchor and Verified Supplier listing."
        />
        <link rel="canonical" href={`${SITE_URL}/registry/check`} />
        <meta property="og:title" content="AI Supplier Transparency Check — APEX PSI Registry" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/registry/check`} />
      </Helmet>

      <Navbar />

      <main className="container mx-auto max-w-4xl px-4 pt-28 pb-20">
        <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">
          Procurement Console
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
          Check any AI supplier in <span className="text-gold-gradient">four seconds</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mb-8">
          Enter a vendor domain. We read only what that domain publishes openly — the PSI protocol
          descriptor, the <span className="font-mono text-primary">Compliance-Receipt</span> header,
          a published trust anchor — and report whether they can evidence AI transparency duties.
          Free, unlimited, no account.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="supplier.com"
            className="font-mono"
            aria-label="Supplier domain"
          />
          <Button variant="hero" size="lg" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
            Check supplier
          </Button>
        </div>

        {result && grade && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-6 md:p-8 mb-10 ${grade.card}`}
          >
            <div className="flex items-start gap-4 mb-6">
              <GradeIcon className={`h-10 w-10 ${grade.iconClass} flex-shrink-0`} />
              <div>
                <h2 className="text-2xl font-bold text-foreground">{grade.label}</h2>
                <p className="text-sm text-muted-foreground font-mono">
                  {result.domain} · conformity signal score {result.score}/100 ·{" "}
                  {new Date(result.checked_at).toUTCString()}
                </p>
                {result.registry_listing.listed && (
                  <p className="text-sm text-compliant mt-1">
                    Listed in the APEX PSI Verified Supplier Registry
                    {result.registry_listing.display_name ? ` as ${result.registry_listing.display_name}` : ""}.
                  </p>
                )}
              </div>
            </div>

            <ul className="space-y-3">
              {result.signals.map((s) => (
                <li key={s.id} className="flex items-start gap-3 text-sm">
                  {s.present ? (
                    <Check className="h-4 w-4 text-compliant flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <span>
                    <span className="font-mono text-foreground/90">{s.label}</span>
                    <span className="block text-muted-foreground text-xs mt-0.5">{s.detail}</span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-[11px] text-muted-foreground mt-6">
              This check reports published signals only. It is evidence of what a domain discloses,
              not a legal determination of compliance.
            </p>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gold/30 bg-gold/[0.04] p-6">
            <h2 className="text-sm font-bold tracking-widest text-gold uppercase mb-2">
              Buyers check you next
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Every check above is public and repeatable. Suppliers listed in the registry appear as
              Verified, with continuous monitoring and lapse alerts if their published signals break.
            </p>
            <ServiceCheckoutButton
              service="registryListing"
              label={`List as Verified — ${CHECKOUT.registryListing.price} ${CHECKOUT.registryListing.cadence}`}
              featured
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-2">
              Fix the signals for free
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Nothing here is gated. Publish the protocol descriptor, add the Compliance-Receipt
              header, and seal your model decisions — all with the open standard.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="heroOutline" size="sm" asChild>
                <Link to="/standard">The standard</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/header">Header spec</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/api">API</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VendorCheck;
