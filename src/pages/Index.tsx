import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import NotaryCTA from "@/components/notary/NotaryCTA";
import ComplianceClock from "@/components/ComplianceClock";
import SocialProofBar from "@/components/SocialProofBar";
import ProblemSection from "@/components/ProblemSection";
import VisionSection from "@/components/VisionSection";

import SolutionSection from "@/components/SolutionSection";
import TrioSection from "@/components/TrioSection";
import TrustSection from "@/components/TrustSection";
import SocialProofWall from "@/components/SocialProofWall";
import RegulatoryAlignment from "@/components/RegulatoryAlignment";
import OptimisticModel from "@/components/OptimisticModel";
import HowItWorks from "@/components/HowItWorks";
import LiveCaseStudy from "@/components/LiveCaseStudy";
import ComparisonTable from "@/components/ComparisonTable";
import AdversarialReview from "@/components/AdversarialReview";
import FreeToolsCTA from "@/components/FreeToolsCTA";
import BusinessModel from "@/components/BusinessModel";
import TechSpecs from "@/components/TechSpecs";
import FeaturedResearch from "@/components/FeaturedResearch";
import ArticlesSection from "@/components/ArticlesSection";
import ResearchReferences from "@/components/ResearchReferences";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import TrafficNoticeBanner from "@/components/TrafficNoticeBanner";
import OpenSourceGateway from "@/components/OpenSourceGateway";
import AustraliaPositioningBand from "@/components/AustraliaPositioningBand";
import InevitabilityDoctrine from "@/components/InevitabilityDoctrine";
import PramaanBanner from "@/components/PramaanBanner";
import SovereignSealStrip from "@/components/SovereignSealStrip";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>APEX PSI — The Definitive Standard for Verifiable AI Governance</title>
        <meta name="description" content="Mathematically verifiable AI compliance. Ed25519-signed evidence, Bitcoin-anchored proofs, IETF draft-singh-psi-00. EU AI Act ready." />
        <link rel="canonical" href="https://apex-psi.lovable.app/" />
        <link rel="alternate" type="application/rss+xml" title="APEX PSI Articles" href="https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/rss-feed" />
        <meta property="og:title" content="APEX PSI — The Definitive Standard for Verifiable AI Governance" />
        <meta property="og:description" content="Mathematically verifiable AI compliance. Ed25519-signed evidence, Bitcoin-anchored proofs, IETF draft-singh-psi-00. EU AI Act ready." />
        <meta property="og:url" content="https://apex-psi.lovable.app/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "APEX PSI",
          alternateName: "Proof of Stateful Integrity",
          url: "https://apex-psi.lovable.app",
          logo: "https://apex-psi.lovable.app/apex.svg",
          description: "Verifiable AI compliance protocol. Ed25519-signed evidence, Bitcoin-anchored proofs, IETF draft-singh-psi-00.",
          sameAs: [
            "https://apex-psi.lovable.app/articles",
            "https://apex-psi.lovable.app/protocol",
            "https://apex-psi.lovable.app/foundation",
          ],
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
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "What is APEX PSI?",
              acceptedAnswer: { "@type": "Answer", text: "APEX PSI (Proof of Stateful Integrity) is an open-source cryptographic protocol that produces tamper-evident evidence for AI decisions using Ed25519 signatures, SHA-256 Merkle trees, and hybrid post-quantum ML-DSA-65 signatures." } },
            { "@type": "Question", name: "Does APEX PSI meet EU AI Act requirements?",
              acceptedAnswer: { "@type": "Answer", text: "APEX PSI produces the cryptographic record-keeping evidence referenced in EU AI Act Article 12 (record-keeping), Article 13 (transparency), Article 14 (human oversight), and Article 15 (accuracy and robustness)." } },
            { "@type": "Question", name: "Is APEX PSI open source?",
              acceptedAnswer: { "@type": "Answer", text: "Yes. APEX PSI is MIT-licensed. The IETF draft is draft-singh-psi-00 and the HTTP header specification is draft-singh-psi-http-01." } },
            { "@type": "Question", name: "Is APEX PSI quantum resistant?",
              acceptedAnswer: { "@type": "Answer", text: "Yes. APEX PSI uses hybrid signatures combining classical Ed25519 with NIST FIPS 204 ML-DSA-65 (Dilithium3), providing defense-in-depth against future cryptographically-relevant quantum computers." } },
          ],
        })}</script>
      </Helmet>
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <TrafficNoticeBanner />
      <Navbar />
      <div id="top" />
      <Hero />
      <SovereignSealStrip />
      <PramaanBanner />
      <AustraliaPositioningBand />
      <VisionSection />
      <ComplianceClock />
      <SocialProofBar />
      <OpenSourceGateway />
      <ProblemSection />
      
      <FreeToolsCTA />
      <SolutionSection />
      <TrioSection />
      <TrustSection />
      <SocialProofWall />
      <RegulatoryAlignment />
      <OptimisticModel />
      <HowItWorks />
      <LiveCaseStudy />
      <ComparisonTable />
      <AdversarialReview />
      <InevitabilityDoctrine />
      <BusinessModel />
      <TechSpecs />
      <NotaryCTA />
      <FeaturedResearch />
      <ArticlesSection />
      <ResearchReferences />
      <Pricing />
      <FAQ />
      <ContactSection />
      <Footer />
    </div>
  </>
  );
};

export default Index;
