import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NotaryHero from "@/components/notary/NotaryHero";
import ReceiptVisualizer from "@/components/notary/ReceiptVisualizer";
import NotaryDemo from "@/components/notary/NotaryDemo";
import NotaryDocs from "@/components/notary/NotaryDocs";
import NotaryPricing from "@/components/notary/NotaryPricing";

const Notary = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Helmet>
      <title>APEX NOTARY — Cryptographic Attestation API for AI Decisions — Apex PSI — Universal Verification Protocol</title>
      <meta
        name="description"
         content="Create tamper-evident AI decision receipts with SHA-256 hashing, Ed25519 signatures, and Merkle proofs. Limited public hosted allowance; independent verification is free. Receipts do not establish legal compliance."
      />
    </Helmet>
    <Navbar />
    <div className="pt-16">
      <NotaryHero />
      <ReceiptVisualizer />
      <NotaryDemo />
      <NotaryDocs />
      <NotaryPricing />
    </div>
    <Footer />
  </div>
);

export default Notary;
