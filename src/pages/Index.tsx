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
        <title>APEX PSI — The Open Protocol for Verifiable AI Governance</title>
        <meta name="description" content="Mathematically verifiable AI compliance. Ed25519-signed evidence, Bitcoin-anchored proofs, IETF draft-singh-psi-00. EU AI Act ready." />
        <link rel="canonical" href="https://digital-gallows.apex-infrastructure.com/" />
        <meta property="og:title" content="APEX PSI — The Open Protocol for Verifiable AI Governance" />
        <meta property="og:description" content="Mathematically verifiable AI compliance. Ed25519-signed evidence, Bitcoin-anchored proofs, IETF draft-singh-psi-00. EU AI Act ready." />
        <meta property="og:url" content="https://digital-gallows.apex-infrastructure.com/" />
        <meta property="og:type" content="website" />
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
