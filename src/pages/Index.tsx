import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Products from "@/pages/Products";
import Article50Banner from "@/components/Article50Banner";

import TwoPillars from "@/components/TwoPillars";
import Declaration from "@/components/Declaration";
import CoreDeclaration from "@/components/CoreDeclaration";
import ThreeLayers from "@/components/ThreeLayers";
import LeadCaptureOffer from "@/components/LeadCaptureOffer";
import HowToUse from "@/components/HowToUse";

import SovereignSealStrip from "@/components/SovereignSealStrip";
import ComplianceClock from "@/components/ComplianceClock";
import RegulatoryAlignment from "@/components/RegulatoryAlignment";
import OpenSourceGateway from "@/components/OpenSourceGateway";
import TechSpecs from "@/components/TechSpecs";
import FAQ from "@/components/FAQ";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import TrafficNoticeBanner from "@/components/TrafficNoticeBanner";
import EUCodeBanner from "@/components/EUCodeBanner";
import EcosystemStrip from "@/components/EcosystemStrip";
import ConnectAIPill from "@/components/ConnectAIPill";
import VerifiedByApexSection from "@/components/VerifiedByApexSection";
import EnforcementStrip from "@/components/EnforcementStrip";
import UniversalTicker from "@/components/UniversalTicker";
import HomeSealStrip from "@/components/HomeSealStrip";
import MelbourneTestPlaque from "@/components/MelbourneTestPlaque";
import PlainLanguageIntro from "@/components/PlainLanguageIntro";
import VerticalsMatrix from "@/components/VerticalsMatrix";
import GrandHero from "@/components/GrandHero";
import ConstitutionLaws from "@/components/ConstitutionLaws";
import GenesisAnchor from "@/components/GenesisAnchor";
import WhatItIsAndIsnt from "@/components/WhatItIsAndIsnt";
import PsiNamespaces from "@/components/PsiNamespaces";
import EconomicDivide from "@/components/EconomicDivide";
import ComplementsStandards from "@/components/ComplementsStandards";
import LiveCaseStudy from "@/components/LiveCaseStudy";
import ProblemSection from "@/components/ProblemSection";
import HomeViewSwitcher, { type HomeView, viewFromHash } from "@/components/HomeViewSwitcher";
import HomeExploreDirectory from "@/components/HomeExploreDirectory";
import HomeLiveSeal from "@/components/HomeLiveSeal";
import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";

const Index = () => {
  const [activeView, setActiveView] = useState<HomeView>(() => viewFromHash());

  useEffect(() => {
    const syncView = () => setActiveView(viewFromHash());
    window.addEventListener("hashchange", syncView);
    return () => window.removeEventListener("hashchange", syncView);
  }, []);

  return (
    <>
      <Helmet>
        <title>APEX PSI — Universal Verification Protocol</title>
        <meta name="description" content="An open protocol for verifying digital records. Verification free forever. Proposed open standard under active development." />
        <link rel="canonical" href="https://ai-governance-standard.com/" />
        <link rel="alternate" type="application/rss+xml" title="APEX PSI Articles" href="https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/rss-feed" />
        <meta property="og:title" content="Apex PSI — Universal Verification Protocol" />
        <meta property="og:description" content="Open, neutral, deterministic proof for AI outputs and records. Verification free forever (MIT)." />
        <meta property="og:url" content="https://ai-governance-standard.com/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "APEX PSI",
          alternateName: "Proof of Stateful Integrity",
          url: "https://ai-governance-standard.com",
          logo: "https://ai-governance-standard.com/apex.svg",
          description: "Open-source provenance and integrity protocol for signed AI governance evidence. Not a legal certification or conformity assessment.",
          sameAs: [
            "https://ai-governance-standard.com/articles",
            "https://ai-governance-standard.com/protocol",
            "https://ai-governance-standard.com/foundation",
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
        <HomeViewSwitcher active={activeView} onChange={setActiveView} />

        <main id={`home-view-${activeView}`} role="tabpanel">
          {activeView === "what" && (
            <>
              <GrandHero />
              <PlainLanguageIntro />
              <CoreDeclaration />
              <WhatItIsAndIsnt />
              <HomeSealStrip />
              <p className="-mt-8 mb-4 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                The ledger does not judge. It remembers.
              </p>
              <p className="mb-16 text-center text-[11px] uppercase tracking-wider text-foreground/80 md:text-xs">
                &quot;Who was first&quot; used to be a story. Now it is a receipt.{" "}
                <a href="/impact#challenge" className="text-gold underline underline-offset-2">Read the receipt</a>
              </p>
              <MelbourneTestPlaque />
            </>
          )}

          {activeView === "why" && (
            <>
              <ProblemSection />
              <Article50Banner />
              <ComplianceClock />
              <RegulatoryAlignment />
              <VerticalsMatrix />
              <EconomicDivide />
              <LiveCaseStudy />
              <AdversarialReview />
            </>
          )}

          {activeView === "explore" && (
            <>
              <HomeExploreDirectory />
              <Hero />
              <UniversalTicker />
              <ConnectAIPill />
              <Declaration />
              <ConstitutionLaws />
              <GenesisAnchor />
              <PsiNamespaces />
              <ComplementsStandards />
              <TwoPillars />
              <Products embedded />
              <LeadCaptureOffer />
              <HowToUse />
              <SovereignSealStrip />
              <EcosystemStrip />
              <OpenSourceGateway />
              <TechSpecs />
              <FAQ />
              <ContactSection />
              <VerifiedByApexSection />
              <ThreeLayers />
              <EnforcementStrip />
            </>
          )}

          {activeView === "seal" && <HomeLiveSeal />}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
