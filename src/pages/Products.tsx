import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Zap,
  Stamp,
  Building2,
  Shield,
  FileText,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/site";
import { FREE_ACCESS_STATEMENT, TRANSPARENCY_RECEIPT_LABEL } from "@/lib/commerce";

type Capability = {
  id: string;
  icon: typeof Globe;
  eyebrow: string;
  name: string;
  who: string;
  summary: string;
  features: string[];
  cta: { label: string; href: string };
  featured?: boolean;
};

const capabilities: Capability[] = [
  {
    id: "protocol",
    icon: Globe,
    eyebrow: "The Standard",
    name: "PSI Protocol — Open Access",
    who: "Every developer, lab, auditor and reader.",
    summary:
      "The protocol itself is public-good infrastructure. Seal, hash, sign and verify without an account, a key or an invoice.",
    features: [
      "Full verification engine; verifier source is MIT in the repository",
      "Client-side SHA-256 sealing of any file (/seal, /pramaan)",
      "Ed25519 plus documented post-quantum signature options",
      "Public hash verification portal and REST API",
      "Compliance-Receipt HTTP header (draft-singh-psi-http-01)",
      "Vendor transparency console (/registry/check)",
    ],
    cta: { label: "Use the protocol", href: "/seal" },
  },
  {
    id: "receipt",
    icon: Stamp,
    eyebrow: "Free",
    name: TRANSPARENCY_RECEIPT_LABEL,
    who: "Anyone who needs a signed technical receipt for an audit, client or internal record.",
    summary:
      "Sealing is free, and so is the receipt: your hash signed by the APEX PSI published trust anchor, submitted for timestamping, and issued as a verifiable record.",
    features: [
      "Signed by the APEX PSI trust anchor",
      "Ed25519 + LMS-W4-SHA256 hybrid signature",
      "Bitcoin anchoring via OpenTimestamps (.ots included)",
      "Technical receipt with an Article 50 control reference",
      "Public receipt page at /r/<hash>, subject to service availability",
      "No account, no key, no payment",
    ],
    cta: { label: "Seal and read the receipt", href: "/seal" },
    featured: true,
  },
  {
    id: "prover",
    icon: Zap,
    eyebrow: "For builders",
    name: "PSI Prover API",
    who: "Teams shipping AI features that must produce evidence continuously.",
    summary:
      "The notary API is open. Batch notarisation, anchoring and webhook delivery are documented and free to call.",
    features: [
      "Notary API — no plan and no paid key",
      "Batch notarization up to 100 decisions per call",
      "Anchoring queue via OpenTimestamps",
      "Signed technical evidence record — not legal certification",
      "Webhook delivery of receipts (HMAC signed)",
      "Audit export",
    ],
    cta: { label: "Read the API docs", href: "/api" },
  },
  {
    id: "registry",
    icon: Shield,
    eyebrow: "For suppliers",
    name: "Supplier Transparency Console",
    who: "Vendors being asked by procurement how their AI is governed.",
    summary:
      "A public, machine-checkable check of what a domain publishes, free to run for any domain including your own.",
    features: [
      "Public domain transparency check",
      "Embeddable APEX Verified badge",
      "Procurement-facing evidence page",
      "Registry API entry for buyer due diligence",
      "Reports published signals only, never a legal determination",
      "No listing fee — there is no fee",
    ],
    cta: { label: "Run a check", href: "/registry/check" },
  },
  {
    id: "institutional",
    icon: Building2,
    eyebrow: "For institutions",
    name: "Protocol Infrastructure",
    who: "Enterprises, governments and regulated operators keeping their own evidence.",
    summary:
      "The protocol, the schema and the verifier are published so any institution can run this itself. Nothing is sold and nothing is licensed for a fee.",
    features: [
      "Signed, verifiable records with Merkle proofs",
      "Self-hostable verification — the source is in the repository",
      "Documented consensus node roles (all current nodes operated by APEX)",
      "Evidence exports",
      "Open specification, individual IETF submission",
      "No contract, no invoice, no plan",
    ],
    cta: { label: "Read the specification", href: "/spec" },
  },
];

const CapabilityCard = ({ p, index }: { p: Capability; index: number }) => {
  const Icon = p.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.05, 0.2) }}
      className={`rounded-xl border bg-card p-6 md:p-8 flex flex-col ${
        p.featured
          ? "border-2 border-gold shadow-[0_0_40px_-12px_hsl(43_85%_52%/0.35)]"
          : "border-border"
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5 text-gold" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.2em] text-gold uppercase">{p.eyebrow}</p>
          <h3 className="text-base font-bold text-foreground leading-tight">{p.name}</h3>
        </div>
      </div>

      <div className="mb-3">
        <span className="text-2xl font-black text-foreground tracking-tight">Free</span>
        <span className="text-muted-foreground text-sm ml-1.5">no account, no key</span>
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Who it is for</p>
      <p className="text-sm text-foreground/80 mb-4">{p.who}</p>
      <p className="text-sm text-muted-foreground mb-6">{p.summary}</p>

      <ul className="space-y-2 mb-8 flex-1">
        {p.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
            <CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      <Button variant={p.featured ? "hero" : "heroOutline"} size="lg" className="w-full" asChild>
        <Link to={p.cta.href}>
          {p.cta.label}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </Button>
    </motion.article>
  );
};

const steps = [
  {
    n: "01",
    title: "Seal it free",
    body: "Hash any decision, file, photo or document in your browser. Nothing is uploaded. You get a portable receipt.",
    href: "/seal",
    linkLabel: "Seal something now",
  },
  {
    n: "02",
    title: "Verify it publicly",
    body: "Anyone, anywhere, can re-verify that hash against the public ledger — no account, no key, no permission.",
    href: "/verify",
    linkLabel: "Verify a hash",
  },
  {
    n: "03",
    title: "Keep the record",
    body: "The receipt is yours to store, publish or hand to an auditor. It attests existence and integrity, never the truth of a claim.",
    href: "/corrections",
    linkLabel: "Read the corrections register",
  },
];

const Products = ({ embedded = false }: { embedded?: boolean }) => {
  return (
    <>
      {!embedded && (
      <Helmet>
        <title>What Apex PSI Provides — Universal Verification Layer</title>
        <meta
          name="description"
          content="APEX PSI is an open AI governance evidence protocol. The protocol, the verifier, sealing and verification are free, with no account and no key."
        />
        <link rel="canonical" href={`${SITE_URL}/products`} />
        <meta property="og:title" content="What Apex PSI Provides — Universal Verification Layer" />
        <meta
          property="og:description"
          content="Sealing and verification are free, with no account and no key. Nothing on this site is sold."
        />
        <meta property="og:url" content={`${SITE_URL}/products`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      )}

      <div className={embedded ? "" : "min-h-screen bg-background text-foreground overflow-x-hidden"}>
        {!embedded && <Navbar />}

        <header className={embedded ? "pt-20 md:pt-24 pb-12 px-4" : "pt-12 md:pt-16 pb-12 px-4"}>
          <div className="container mx-auto max-w-7xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-primary uppercase mb-6">
                <FileText className="h-3 w-3" />
                 IETF individual submission · Article 50 applicable
              </span>
              {embedded ? (
                <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-[0.95] mb-5">
                  <span className="text-chrome-gradient">What Apex PSI Provides</span>
                </h2>
              ) : (
                <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-[0.95] mb-5">
                  <span className="text-gold-gradient">APEX PSI</span>
                  <span className="block text-chrome-gradient">The Universal Verification Layer</span>
                </h1>
              )}
              <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
                One open protocol for recording declared AI actions and human observations as verifiable evidence.
                {" "}{FREE_ACCESS_STATEMENT}
              </p>
            </motion.div>
          </div>
        </header>

        <section className="px-4 pb-16">
          <div className="container mx-auto max-w-7xl grid md:grid-cols-3 gap-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card/60 p-6"
              >
                <p className="font-mono text-xs text-gold mb-2">{s.n}</p>
                <h2 className="text-sm font-bold tracking-widest uppercase text-foreground mb-2">{s.title}</h2>
                <p className="text-sm text-muted-foreground mb-4">{s.body}</p>
                <Link
                  to={s.href}
                  className="text-sm font-bold text-gold inline-flex items-center gap-1 hover:underline"
                >
                  {s.linkLabel} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="px-4 pb-8" id="catalogue">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-10">
              <p className="text-gold font-semibold tracking-[0.2em] uppercase text-xs mb-3">
                What is provided
              </p>
              <h2 className="text-3xl md:text-5xl font-bold">
                Free to use. <span className="text-gold-gradient">Nothing is sold.</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {capabilities.map((p, i) => (
                <CapabilityCard key={p.id} p={p} index={i} />
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-8 max-w-3xl mx-auto">
              The commercial tiers previously published here have been withdrawn. There is no price,
              no plan, no checkout and no sales process on this site. Every withdrawal is dated on
              the <Link to="/corrections" className="text-gold hover:underline">corrections register</Link>.
            </p>
          </div>
        </section>

        <section className="px-4 py-20">
          <div className="container mx-auto max-w-4xl rounded-xl border border-gold/30 bg-gold/[0.04] p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Not sure where to start?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Seal one file and look at the receipt. Then verify it yourself, and have someone else
              verify it too. That is the whole protocol.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="hero" size="lg" asChild>
                <Link to="/seal">
                  Seal a file free <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button variant="heroOutline" size="lg" asChild>
                <Link to="/spec">Read the technical spec</Link>
              </Button>
              <Button variant="heroOutline" size="lg" asChild>
                <Link to="/verify">Verify a hash</Link>
              </Button>
            </div>
          </div>
        </section>

        {!embedded && <Footer />}
      </div>
    </>
  );
};

export default Products;
