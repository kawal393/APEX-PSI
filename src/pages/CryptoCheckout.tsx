import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/site";
import { FREE_ACCESS_STATEMENT } from "@/lib/commerce";

const TITLE = "Payments — Apex PSI";
const DESCRIPTION =
  "There is nothing to pay for. The protocol, the verifier, sealing and verification are free, with no account and no key.";

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
        No payment required
      </p>
      <h1 className="mb-6 text-3xl font-bold leading-tight md:text-5xl">
        There is nothing here to buy.
      </h1>
      <p className="mb-6 text-base leading-relaxed text-muted-foreground">{FREE_ACCESS_STATEMENT}</p>
      <p className="mb-10 text-sm leading-relaxed text-muted-foreground">
        Card and on-chain payment options have been withdrawn. No invoice is issued, no plan is
        offered and no address is published. If this ever changes it will be recorded, dated, on the
        corrections register first.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="hero" size="lg" asChild>
          <Link to="/seal">Seal a file</Link>
        </Button>
        <Button variant="heroOutline" size="lg" asChild>
          <Link to="/verify">Verify a hash</Link>
        </Button>
        <Button variant="heroOutline" size="lg" asChild>
          <Link to="/corrections">Corrections register</Link>
        </Button>
      </div>
    </main>
    <Footer />
  </div>
);

export default CryptoCheckout;
