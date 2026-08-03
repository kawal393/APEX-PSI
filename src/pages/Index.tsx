import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Article50Banner from "@/components/Article50Banner";

import TwoPillars from "@/components/TwoPillars";
import LeadCaptureOffer from "@/components/LeadCaptureOffer";
import HowToUse from "@/components/HowToUse";

import SovereignSealStrip from "@/components/SovereignSealStrip";
import ComplianceClock from "@/components/ComplianceClock";
import RegulatoryAlignment from "@/components/RegulatoryAlignment";
import OpenSourceGateway from "@/components/OpenSourceGateway";
import TechSpecs from "@/components/TechSpecs";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import TrafficNoticeBanner from "@/components/TrafficNoticeBanner";
import EUCodeBanner from "@/components/EUCodeBanner";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>APEX PSI — Verifiable AI. APEX PRAMAAN — Verifiable Humans.</title>
        <meta name="description" content="One open standard, two pillars. APEX PSI proves what AI did. APEX PRAMAAN proves what humans saw. IETF draft-singh-psi-00. Ed25519 + ML-DSA-65. MIT open source." />
        <link rel="canonical" href="https://digital-gallows.apex-infrastructure.com/" />
        <link rel="alternate" type="application/rss+xml" title="APEX PSI Articles" href="https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/rss-feed" />
        <meta property="og:title" content="APEX PSI — Verifiable AI. APEX PRAMAAN — Verifiable Humans." />
        <meta property="og:description" content="One open standard, two pillars. Cryptographic truth for AI systems and human witnesses. IETF draft-singh-psi-00." />
        <meta property="og:url" content="https://digital-gallows.apex-infrastructure.com/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "APEX PSI",
          alternateName: "Proof of Stateful Integrity",
          url: "https://digital-gallows.apex-infrastructure.com",
          logo: "https://digital-gallows.apex-infrastructure.com/apex.svg",
          description: "Verifiable AI compliance protocol. Ed25519-signed evidence, Bitcoin-anchored proofs, IETF draft-singh-psi-00.",
          sameAs: [
            "https://digital-gallows.apex-infrastructure.com/articles",
            "https://digital-gallows.apex-infrastructure.com/protocol",
            "https://digital-gallows.apex-infrastructure.com/foundation",
          ],
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "APEX PRAMAAN",
          applicationCategory: "SecurityApplication",
          operatingSystem: "Web, iOS, Android",
          description: "Client-side cryptographic sealing for photos, videos, audio, and documents. A 2 KB portable receipt verifiable on any device.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "APEX PSI Protocol",
          applicationCategory: "SecurityApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description: "Open-source cryptographic evidence protocol for AI governance. SHA-256, Ed25519, ML-DSA-65 hybrid signatures.",
        })}</script>
      </Helmet>
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        <TrafficNoticeBanner />
        <EUCodeBanner />
        <Navbar />
        <div id="top" />
        <Hero />
        <Article50Banner />

        <TwoPillars />
        <LeadCaptureOffer />

        <HowToUse />
        <SovereignSealStrip />
        <ComplianceClock />
        <RegulatoryAlignment />
        <OpenSourceGateway />
        <TechSpecs />
        <Pricing />
        <FAQ />
        <ContactSection />
        <Footer />
      </div>
    </>
  );
};

export default Index;
