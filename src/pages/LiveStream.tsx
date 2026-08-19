import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LiveSealStream from "@/components/protocol/LiveSealStream";
import ProtocolHealth from "@/components/protocol/ProtocolHealth";
import AutoVerifier from "@/components/protocol/AutoVerifier";
import { SITE_URL } from "@/lib/site";

export default function LiveStream() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Live Seal Stream & Protocol Health — Apex PSI — Universal Verification Layer</title>
        <meta
          name="description"
          content="Real-time feed of every APEX PSI attestation: hash, timestamp, Ed25519 and ML-DSA-65 signatures, and Bitcoin anchor status."
        />
        <link rel="canonical" href={`${SITE_URL}/stream`} />
      </Helmet>
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 pt-28 pb-20 space-y-8">
        <header>
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-gold mb-3">Autonomous Sealing Engine</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="text-chrome-gradient">The protocol runs itself.</span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl">
            Every seal, signature and anchor below is read live from the evidence ledger. No dashboard here is
            curated by hand and no figure is typed in.
          </p>
        </header>

        <ProtocolHealth />
        <AutoVerifier />
        <LiveSealStream />
      </main>
      <Footer />
    </div>
  );
}
