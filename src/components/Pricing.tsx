import { Shield, FileText, Globe, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CHECKOUT } from "@/lib/commerce";
import ServiceCheckoutButton from "@/components/ServiceCheckoutButton";


const openAccessFeatures = [
  "Full PSI Protocol verification engine",
  "APEX PSI SDK — complete source",
  "SHA-256 hash chain + Merkle audit trails",
  "Ed25519 signature verification",
  "3-node MPC consensus logic",
  "Embeddable SHIELD trust badge",
  "Public hash verification portal",
  "RFC 8785 (JCS) canonicalization",
  "EU AI Act predicate mapping (Articles 11–15, 52)",
  "Community documentation & IETF draft access",
];

const certificationIncludes = [
  "Institutional Anchor ratification (enterprise-grade cryptographic seal)",
  "Signed, verifiable compliance record with Merkle proof",
  "Global Merkle root anchoring for proof persistence",
  "Continuous automated compliance monitoring",
  "Dedicated MPC node infrastructure",
  "24/7 SLA-backed support",
  "Signed evidence pack for your own advisers",
  "White-label deployment options",
];

const Pricing = () => {
  return (
    <section className="relative py-24 px-4" id="pricing">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6"
        >
          <p className="text-gold font-semibold tracking-widest uppercase text-sm mb-3">
            Tiers of Access to the Standard
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            The Standard is <span className="text-gold-gradient">Free</span>. Forever.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The PSI Protocol (<span className="font-mono text-primary">draft-singh-psi (rev 01)</span>) is public-good infrastructure.
            The APEX PSI SDK and core verification logic remain <span className="font-bold text-foreground">$0 / Open Access</span> for
            every developer, lab, and enterprise. Forever.
          </p>
        </motion.div>

        {/* Enforcement urgency banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-center mb-12 max-w-2xl mx-auto"
        >
          <p className="text-sm text-foreground">
            <Zap className="h-4 w-4 text-warning inline mr-1 -mt-0.5" />
            <span className="font-bold text-warning">EU AI Act Article 50 enforcement is live since August 2, 2026.</span>
            {" "}Non-compliance fines up to <span className="font-bold">€35M or 7% of global revenue</span>.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Open Access — Free */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-gold/30 bg-card p-8 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center">
                <Globe className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-widest text-gold uppercase">Open Access</h3>
                <div>
                  <span className="text-3xl font-black text-foreground">$0</span>
                  <span className="text-muted-foreground text-sm ml-1">/ forever</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              The complete PSI Protocol — verification engine, SDK, and cryptographic primitives — available to every developer and research lab on Earth.
            </p>

            <ul className="space-y-2.5 mb-8 flex-1">
              {openAccessFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                  <CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Button variant="hero" className="w-full" size="lg" asChild>
              <Link to="/engine">
                Access the Protocol <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </motion.div>

          {/* PSI Prover — Middle tier */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border-2 border-gold bg-card p-8 flex flex-col relative shadow-[0_0_40px_-12px_hsl(43_85%_52%/0.35)]"
          >
            <div className="flex items-center gap-3 mb-4 mt-2">
              <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-widest text-gold uppercase">PSI Prover</h3>
                <div>
                  <span className="text-3xl font-black text-foreground">$49</span>
                  <span className="text-muted-foreground text-sm ml-1">/ month</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  + $0.006 per verification
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              For developers and small teams shipping to production. All Open Access features plus managed Notary API, priority anchoring, and a signed EU AI Act certificate.
            </p>

            <ul className="space-y-2.5 mb-8 flex-1">
              {[
                "All Open Access features",
                "Full Notary API access",
                "Priority hash anchoring queue",
                "EU AI Act Article 50 transparency record",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                  <CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href="https://buy.stripe.com/00wdR148112o9wkaosb7y09"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-gold text-background font-bold text-sm h-11 hover:bg-gold/90 transition-colors"
            >
              Start Sealing — $49/mo <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>


          {/* Institutional Certification — Paid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-primary/40 bg-card p-8 flex flex-col relative"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-4 py-1 rounded-full whitespace-nowrap">
                COMMERCIAL REGULATORY FILINGS
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4 mt-2">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-widest text-primary uppercase">Apex Institutional Certification</h3>
                <div>
                  <span className="text-3xl font-black text-foreground">From $2,000</span>
                  <span className="text-muted-foreground text-sm ml-1">/ month</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              For enterprises requiring signed, verifiable compliance filings, evidence-ratified certificates, and managed protocol infrastructure. Apex is not a certifier, a notified body, a law firm or an insurer. No certification, accreditation or insurance is offered or implied.
            </p>

            <ul className="space-y-2.5 mb-8 flex-1">
              {certificationIncludes.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Button variant="heroOutline" className="w-full" size="lg" asChild>
              <Link to="/#contact">
                <FileText className="h-4 w-4 mr-1" />
                Petition the Registry
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Pay-per-proof and registry listing — no subscription required */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-gold/30 bg-gold/[0.04] p-6 flex flex-col"
          >
            <h3 className="text-xs font-bold tracking-widest text-gold uppercase mb-2">
              {CHECKOUT.conformityReceipt.label}
            </h3>
            <div className="mb-3">
              <span className="text-3xl font-black text-foreground">{CHECKOUT.conformityReceipt.price}</span>
              <span className="text-muted-foreground text-sm ml-1">/ {CHECKOUT.conformityReceipt.cadence}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-5 flex-1">
              Sealing is free. This is one proof countersigned by the APEX PSI institutional trust
              anchor (Ed25519 + LMS-W4-SHA256), submitted to OpenTimestamps for Bitcoin timestamping, and issued as a
              signed, verifiable PDF at a permanent public receipt URL. No subscription.
            </p>
            <ServiceCheckoutButton service="conformityReceipt" label="Get a countersigned receipt" featured />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border border-primary/40 bg-card p-6 flex flex-col"
          >
            <h3 className="text-xs font-bold tracking-widest text-primary uppercase mb-2">
              {CHECKOUT.registryListing.label}
            </h3>
            <div className="mb-3">
              <span className="text-3xl font-black text-foreground">{CHECKOUT.registryListing.price}</span>
              <span className="text-muted-foreground text-sm ml-1">/ {CHECKOUT.registryListing.cadence}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-5 flex-1">
              Buyers, auditors and regulators check supplier domains for free in the{" "}
              <Link to="/registry/check" className="text-primary underline">procurement console</Link>.
              A listing shows your organisation as Verified, with continuous monitoring and lapse alerts.
            </p>
            <ServiceCheckoutButton service="registryListing" label="List in the Supplier Registry" />
          </motion.div>
        </div>

        {/* Bottom reassurance */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs text-muted-foreground mt-10 max-w-2xl mx-auto"
        >
          The PSI Protocol is a public-good standard. The math is free, the code is open-source, and the specification (<span className="font-mono">draft-singh-psi (rev 01)</span>) is submitted to the IETF.
          Fees apply only to countersigned artefacts and registry listings — never to sealing or verifying.
        </motion.p>

      </div>
    </section>
  );
};

export default Pricing;
