import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/site";
import { FREE_ACCESS_STATEMENT } from "@/lib/commerce";

const TITLE = "Payments — Apex PSI";
const DESCRIPTION =
  "Independent verification is free forever. Higher-volume APEX-hosted products are arranged directly; on-chain checkout is not available.";

const CryptoCheckout = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Helmet>
      <title>{TITLE}</title>
      <meta name="description" content={DESCRIPTION} />
      <link rel="canonical" href={`${SITE_URL}/crypto`} />
    </Helmet>
    <Navbar />
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-32">
      <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.4em] text-gold">
        Direct agreements only
      </p>
      <h1 className="mb-6 text-3xl font-bold leading-tight md:text-5xl">
        On-chain checkout is not available.
      </h1>
      <p className="mb-6 text-base leading-relaxed text-muted-foreground">{FREE_ACCESS_STATEMENT}</p>
      <p className="mb-10 text-sm leading-relaxed text-muted-foreground">
        Higher-volume hosted products are arranged directly. No cryptocurrency payment address or
        self-service checkout is published here. No finding, no result, no removal and no priority
        in the ledger is for sale at any price. If that ever changes it will be recorded, dated, on
        the <Link to="/corrections" className="text-gold hover:underline">corrections register</Link> first.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="hero" size="lg" asChild>
          <Link to="/seal">Seal a file</Link>
        </Button>
        <Button variant="heroOutline" size="lg" asChild>
          <Link to="/verify">Verify a hash</Link>
        </Button>
        <Button variant="heroOutline" size="lg" asChild>
          <Link to="/products">View products</Link>
        </Button>
      </div>
    </main>
    <Footer />
  </div>
);

export default CryptoCheckout;
