import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Case003 = () => {
  return (
    <>
      <Helmet>
        <title>CASE 003 — The Regulator | APEX PSI Reference</title>
        <meta name="description" content="RESERVED. The regulator's own words, returned sealed." />
        <link rel="canonical" href="https://ai-governance-standard.com/case-003" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="container mx-auto max-w-5xl px-4 py-24">
          <h1 className="font-serif text-4xl md:text-6xl font-bold text-white leading-tight">
            CASE 003 — THE REGULATOR
          </h1>
          <p className="mt-12 text-lg text-muted-foreground leading-relaxed max-w-3xl">
            RESERVED. The regulator's own words, returned sealed. Announced when the seal exists —
            never before.
          </p>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Case003;
