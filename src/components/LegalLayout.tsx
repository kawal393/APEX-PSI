import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import apexLogo from "@/assets/apex-logo.png";

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

const LegalLayout = ({ title, lastUpdated, children }: LegalLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title} — APEX PSI</title>
        <meta name="description" content={`${title} for APEX PSI. Last updated ${lastUpdated}.`} />
      </Helmet>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto max-w-6xl h-16 px-4 relative flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold transition-colors z-10">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>

          <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <img src={apexLogo} alt="APEX" className="h-9 w-9 object-contain glow-gold" />
            <span>
              <span className="text-gold-gradient">APEX</span>{" "}
              <span className="text-chrome-gradient hidden md:inline">PSI</span>
            </span>
          </Link>

          <div className="w-24" aria-hidden="true" />
        </div>
      </nav>

      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-black mb-2">
            <span className="text-gold-gradient">{title}</span>
          </h1>
          <p className="text-sm text-muted-foreground mb-12">Last updated: {lastUpdated}</p>

          <div className="prose prose-invert prose-sm max-w-none space-y-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground/90 [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_li]:text-muted-foreground [&_ul]:space-y-2 [&_a]:text-gold [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-gold-glow">
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <p className="text-xs text-muted-foreground">
            © 2026 Apex Intelligence Empire. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LegalLayout;
