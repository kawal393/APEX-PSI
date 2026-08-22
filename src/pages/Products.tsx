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
import { CHECKOUT } from "@/lib/commerce";
import { SITE_URL } from "@/lib/site";
import ServiceCheckoutButton from "@/components/ServiceCheckoutButton";
import type { CheckoutKey } from "@/lib/commerce";

type Product = {
  id: string;
  icon: typeof Globe;
  eyebrow: string;
  name: string;
  price: string;
  cadence: string;
  who: string;
  summary: string;
  features: string[];
  cta: { label: string; href?: string; route?: boolean; checkout?: CheckoutKey };
  featured?: boolean;
};

const products: Product[] = [
  {
    id: "protocol",
    icon: Globe,
    eyebrow: "The Standard",
    name: "PSI Protocol — Open Access",
    price: "$0",
    cadence: "forever",
    who: "Every developer, lab, auditor and regulator.",
    summary:
      "The protocol itself is public-good infrastructure. Seal, hash, sign and verify without an account, a key or an invoice.",
    features: [
      "Full verification engine + MIT-licensed SDK",
      "Client-side SHA-256 sealing of any file (/seal, /pramaan)",
      "Ed25519 plus documented post-quantum signature options",
      "Public hash verification portal and REST API",
      "Compliance-Receipt HTTP header (draft-singh-psi-http-01)",
      "Free vendor transparency console (/registry/check)",
    ],
    cta: { label: "Use the protocol", href: "/seal", route: true },
  },
  {
    id: "receipt",
    icon: Stamp,
    eyebrow: "Pay per proof",
    name: CHECKOUT.conformityReceipt.label,
    price: CHECKOUT.conformityReceipt.price,
    cadence: CHECKOUT.conformityReceipt.cadence,
    who: "Anyone who needs a signed technical receipt for an audit, client or internal record.",
    summary:
      "Sealing is free. What you buy is the countersignature: your hash additionally signed by the APEX PSI institutional trust anchor, timestamped through OpenTimestamps, issued as a regulator-ready PDF.",
    features: [
      "Countersigned by the APEX PSI trust anchor",
      "Ed25519 + LMS-W4-SHA256 hybrid signature",
      "Bitcoin anchoring via OpenTimestamps (.ots included)",
      "PDF technical receipt with an Article 50 control reference",
      "Public receipt page at /r/<hash>, subject to service availability",
      "A free account binds the receipt credit securely to its buyer",
    ],
    cta: { label: `Get a receipt — ${CHECKOUT.conformityReceipt.price}`, checkout: "conformityReceipt" },
    featured: true,
  },
  {
    id: "prover",
    icon: Zap,
    eyebrow: "For builders",
    name: CHECKOUT.prover.label,
    price: CHECKOUT.prover.price,
    cadence: CHECKOUT.prover.cadence,
    who: "Teams shipping AI features that must produce evidence continuously.",
    summary:
      "Managed notary API with scoped keys, priority anchoring and an ongoing signed technical evidence certificate for your system.",
    features: [
      "Managed Notary API + scoped API keys",
      "Batch notarization up to 100 decisions per call",
      "Priority anchoring queue",
      "Signed technical evidence certificate — not legal certification",
      "Webhook delivery of receipts (HMAC signed)",
      "Usage dashboard and audit export",
    ],
    cta: { label: `Start — ${CHECKOUT.prover.price}/mo`, checkout: "prover" },
  },
  {
    id: "registry",
    icon: Shield,
    eyebrow: "For suppliers",
    name: CHECKOUT.registryListing.label,
    price: CHECKOUT.registryListing.price,
    cadence: CHECKOUT.registryListing.cadence,
    who: "Vendors being asked by procurement how their AI is governed.",
    summary:
      "A public, machine-checkable listing in the Verified Supplier Registry that buyers and regulators can query directly.",
    features: [
      "Public listing in the Verified Supplier Registry",
      "Continuous domain transparency scoring",
      "Embeddable APEX Verified badge",
      "Procurement-facing evidence page",
      "Registry API entry for buyer due diligence",
      "Cancel any time",
    ],
    cta: { label: `List as Verified — ${CHECKOUT.registryListing.price}/mo`, checkout: "registryListing" },
  },
  {
    id: "institutional",
    icon: Building2,
    eyebrow: "For institutions",
    name: "Institutional Evidence Service",
    price: "From $2,000",
    cadence: "per month",
    who: "Enterprises, governments and regulated operators filing evidence.",
    summary:
      "Managed protocol infrastructure, regulator-ready filings and dedicated consensus nodes under contract.",
    features: [
      "Regulator-ready compliance filings with Merkle proofs",
      "Dedicated MPC consensus nodes",
      "Continuous automated monitoring and alerting",
      "White-label deployment and custom domains",
      "Evidence exports for underwriting review",
      "SLA-backed support",
    ],
    cta: { label: "Contact sales", href: "/home#contact", route: true },
  },
];

const ProductCard = ({ p, index }: { p: Product; index: number }) => {
  const Icon = p.icon;
  const inner = (
    <>
      {p.cta.label}
      <ArrowRight className="h-4 w-4 ml-1" />
    </>
  );

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
        <span className="text-4xl font-black text-foreground tracking-tight">{p.price}</span>
        <span className="text-muted-foreground text-sm ml-1.5">{p.cadence}</span>
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

      {p.cta.checkout ? (
        <ServiceCheckoutButton service={p.cta.checkout} label={p.cta.label} featured={p.featured} />
      ) : (
        <Button variant={p.featured ? "hero" : "heroOutline"} size="lg" className="w-full" asChild>
          <Link to={p.cta.href ?? "/"}>{inner}</Link>
        </Button>
      )}
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
    title: "Buy the countersignature",
    body: "For higher-assurance technical evidence, add an institutional countersignature and timestamp proof. This does not guarantee legal acceptance.",
    href: "/products?checkout=conformityReceipt",
    linkLabel: `Countersign — ${CHECKOUT.conformityReceipt.price}`,
  },
];

const Products = ({ embedded = false }: { embedded?: boolean }) => {
  return (
    <>
      {!embedded && (
      <Helmet>
        <title>Products &amp; Pricing — Apex PSI — Universal Verification Layer</title>
        <meta
          name="description"
          content="APEX PSI is an open AI governance evidence protocol. Review free tools and priced receipt, API, registry and institutional evidence services."
        />
        <link rel="canonical" href={`${SITE_URL}/products`} />
        <meta property="og:title" content="Products & Pricing — Apex PSI — Universal Verification Layer" />
        <meta
          property="og:description"
          content="The protocol is free. The countersignature is paid. Every APEX PSI product and price on one page."
        />
        <meta property="og:url" content={`${SITE_URL}/products`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "APEX PSI Products",
            itemListElement: products.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Product",
                name: p.name,
                description: p.summary,
                brand: { "@type": "Brand", name: "APEX PSI" },
                offers: {
                  "@type": "Offer",
                  price: p.price.replace(/[^0-9.]/g, "") || "0",
                  priceCurrency: "USD",
                  url: `${SITE_URL}/products`,
                },
              },
            })),
          })}
        </script>
      </Helmet>
      )}

      <div className={embedded ? "" : "min-h-screen bg-background text-foreground overflow-x-hidden"}>
        {!embedded && <Navbar />}


        {/* Header — h1 only on the standalone /products page; embedded it is a subsection */}
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
                  <span className="text-chrome-gradient">Products &amp; Pricing</span>
                </h2>
              ) : (
                <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-[0.95] mb-5">
                  <span className="text-gold-gradient">APEX PSI</span>
                  <span className="block text-chrome-gradient">The Universal Verification Layer</span>
                </h1>
              )}
              <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
                One open protocol for recording declared AI actions and human observations as verifiable evidence.
                The protocol is <span className="text-foreground font-bold">free forever</span>.
                Below is everything we sell — every product, every price, in the open.
              </p>
            </motion.div>
          </div>
        </header>

        {/* Connect the dots */}
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
                {s.href.startsWith("http") ? (
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-gold inline-flex items-center gap-1 hover:underline"
                  >
                    {s.linkLabel} <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <Link
                    to={s.href}
                    className="text-sm font-bold text-gold inline-flex items-center gap-1 hover:underline"
                  >
                    {s.linkLabel} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Products */}
        <section className="px-4 pb-8" id="catalogue">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-10">
              <p className="text-gold font-semibold tracking-[0.2em] uppercase text-xs mb-3">
                Products &amp; Pricing
              </p>
              <h2 className="text-3xl md:text-5xl font-bold">
                Free to use. <span className="text-gold-gradient">Paid to be countersigned.</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((p, i) => (
                <ProductCard key={p.id} p={p} index={i} />
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-gold/30 bg-gold/[0.04] p-6 md:p-8 text-center">
              <p className="text-[10px] font-bold tracking-[0.2em] text-gold uppercase mb-2">
                Also payable on-chain
              </p>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                Pay in Bitcoin, Ethereum or USDC
              </h3>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-6">
                Receipts, receipt packs, API credits and a prepaid registry listing can be paid directly
                on-chain. Self-custody, no payment processor, credited automatically once the chain
                confirms. Monthly subscriptions remain card-only.
              </p>
              <Button variant="hero" size="lg" asChild>
                <Link to="/crypto">
                  Pay with crypto <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-8 max-w-3xl mx-auto">
              Prices in USD. Card checkout is handled by Stripe; crypto payments settle directly on-chain.
              Sealing and public verification remain free and unmetered — paying only ever adds the
              institutional countersignature, anchoring, persistence and support around a proof you can
              already generate yourself.
            </p>

          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-4 py-20">
          <div className="container mx-auto max-w-4xl rounded-xl border border-gold/30 bg-gold/[0.04] p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Not sure which one you need?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Seal one file for free and look at the receipt. If it has to convince a regulator,
              a court or a customer, countersign it. If your product does it every day, take the API.
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
                <Link to="/home#contact">Contact sales</Link>
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
