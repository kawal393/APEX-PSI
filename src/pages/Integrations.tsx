import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowRight, GitBranch, Plug, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtocolNote from "@/components/ProtocolNote";
import CopyBlock from "@/components/CopyBlock";
import InstallCounter from "@/components/integrations/InstallCounter";
import {
  CATEGORIES,
  GITHUB_REPO,
  INTEGRATIONS,
  STATUS_META,
} from "@/components/integrations/integrationsData";
import { SITE_URL } from "@/lib/site";

const Integrations = () => {
  const [category, setCategory] = useState<string>("All");

  const visible = useMemo(
    () => (category === "All" ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.category === category)),
    [category],
  );

  return (
    <>
      <Helmet>
        <title>Integrations — Plug APEX PSI Into Any AI Stack</title>
        <meta
          name="description"
          content="Official APEX PSI integrations for MCP, LangChain, Composio, Vercel AI SDK, Make, Zapier and more. One open protocol, every stack, MIT licensed."
        />
        <link rel="canonical" href={`${SITE_URL}/integrations`} />
        <meta property="og:title" content="Integrations — Plug APEX PSI Into Any AI Stack" />
        <meta
          property="og:description"
          content="Official APEX PSI integrations for MCP, LangChain, Composio, Vercel AI SDK, Make, Zapier and more."
        />
        <meta property="og:url" content={`${SITE_URL}/integrations`} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <Navbar />

        {/* Hero */}
        <section className="px-4 pt-12 pb-8">
          <div className="container mx-auto max-w-5xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gold mb-4 inline-flex items-center gap-2">
                <Plug className="h-3.5 w-3.5" /> Integrations Layer
              </p>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[0.95] mb-5">
                <span className="text-chrome-gradient">The Integrations Layer</span>
                <br />
                <span className="text-gold-gradient">for AI Sovereignty</span>
              </h1>
              <p className="text-base sm:text-lg text-foreground/90 font-semibold mb-2">
                One protocol. Every stack. Zero permission.
              </p>
              <p className="text-sm text-muted-foreground max-w-2xl mb-8">
                Plug APEX PSI into your tools in 60 seconds. Every integration is open source, MIT licensed, and
                produces the same independently verifiable receipt.
              </p>

              <InstallCounter title="Integrations network" />
            </motion.div>
          </div>
        </section>

        {/* Category filter */}
        <section className="px-4 pb-6">
          <div className="container mx-auto max-w-5xl">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-widest transition-colors ${
                    category === c
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-border bg-background/60 text-muted-foreground hover:border-border/80"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="px-4 pb-12">
          <div className="container mx-auto max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((it) => {
                const status = STATUS_META[it.status];
                return (
                  <div
                    key={it.slug}
                    id={it.slug}
                    className="scroll-mt-24 rounded-xl border border-border bg-card/70 p-4 flex flex-col hover:border-gold/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="h-10 w-10 shrink-0 rounded-lg border border-gold/30 bg-gold/[0.06] flex items-center justify-center">
                        <span className="text-[10px] font-black tracking-tight text-gold">{it.initials}</span>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest ${status.className}`}>
                        {status.label}
                      </span>
                    </div>

                    <h2 className="text-sm font-black text-foreground mb-1.5">{it.name}</h2>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">{it.description}</p>

                    <CopyBlock code={it.install} className="mb-3" />

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                        {it.category}
                      </span>
                      <Link
                        to={it.docs}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-gold hover:text-gold/80 transition-colors"
                      >
                        Docs <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-12">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-xl border border-gold/40 bg-gold/[0.05] p-6 text-center">
              <h2 className="text-xl sm:text-2xl font-black mb-2">Don&apos;t see your tool?</h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-5">
                Build your own integration — open source, MIT licensed. The receipt format, canonicalization rules and
                signature suites are all published, so any runtime can emit a valid PSI receipt without asking us.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-gold text-background font-bold text-sm h-11 px-6 hover:bg-gold/90 transition-colors w-full sm:w-auto"
                >
                  <GitBranch className="h-4 w-4" /> Build on GitHub <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <Link
                  to="/standard"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-border h-11 px-6 text-sm font-semibold hover:border-gold/50 transition-colors w-full sm:w-auto"
                >
                  Read the header standard <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <ProtocolNote />
        <Footer />
      </div>
    </>
  );
};

export default Integrations;
