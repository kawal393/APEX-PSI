import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ZeroClaimLabel from "@/components/ZeroClaimLabel";
import { verifyingSorted, unverifiedSorted } from "@/data/adoptionRegistry";

const fmt = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};

const Registry = () => {
  const verifying = verifyingSorted();
  const unverified = unverifiedSorted();
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <Helmet>
        <title>The Public Registry of Verification Adoption — Apex PSI</title>
        <meta
          name="description"
          content="A public record of verification adoption, sorted by first seal date. Not a ranking. No scores, no fees, no permission. We do not judge. We document."
        />
        <link rel="canonical" href="https://ai-governance-standard.com/registry" />
        <meta property="og:title" content="The Public Registry of Verification Adoption" />
        <meta
          property="og:description"
          content="Organisations appear on the date they first sealed a public document with APEX PSI. Sorted chronologically."
        />
        <meta property="og:url" content="https://ai-governance-standard.com/registry" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold mb-4">
                The Inverse Standard
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight leading-[0.95] mb-6">
                The Public Registry of Verification Adoption
              </h1>
              <div className="space-y-1 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                <p>This is not a ranking. This is a public record of adoption.</p>
                <p>
                  Organisations appear below on the date they first sealed a public document with
                  APEX PSI.
                </p>
                <p>Sorted chronologically — first to adopt at the top.</p>
              </div>
            </motion.div>

            <ZeroClaimLabel className="mt-8 max-w-2xl" />

            {/* VERIFYING */}
            <section className="mt-12">
              <h2 className="font-mono text-xs sm:text-sm uppercase tracking-[0.25em] text-compliant border-b border-compliant/30 pb-2 mb-4">
                ✅ Verifying — since date of first seal
              </h2>
              {verifying.length === 0 ? (
                <div className="rounded-lg border border-border bg-card/40 p-8 text-center">
                  <p className="font-mono text-sm uppercase tracking-[0.2em] text-foreground">
                    First seal pending. Be the first.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60 rounded-lg border border-border bg-card/40">
                  {verifying.map((o) => (
                    <li
                      key={`${o.name}-${o.firstSealed}`}
                      className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-4"
                    >
                      <span className="font-bold text-sm text-foreground">{o.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        First sealed: {fmt(o.firstSealed)}
                        {o.artifact && (
                          <>
                            {" · "}
                            <a
                              href={o.artifact}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gold hover:underline"
                            >
                              artefact
                            </a>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* UNVERIFIED */}
            <section className="mt-10">
              <h2 className="font-mono text-xs sm:text-sm uppercase tracking-[0.25em] text-muted-foreground border-b border-border pb-2 mb-4">
                ⬜ Unverified — public record
              </h2>
              {unverified.length === 0 ? (
                <div className="rounded-lg border border-border bg-card/20 p-8 text-center">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    No entries recorded.
                  </p>
                </div>
              ) : (
                <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 rounded-lg border border-border bg-card/20 p-5">
                  {unverified.map((n) => (
                    <li key={n} className="font-mono text-sm text-muted-foreground">
                      {n}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                Alphabetical order only. No date. No ranking. No judgment.
              </p>
            </section>

            {/* HOW TO MOVE TO THE TOP */}
            <section className="mt-12 rounded-lg border border-gold/40 bg-gold/[0.05] p-6">
              <h2 className="text-lg font-black uppercase tracking-tight mb-3">
                How to move to the top
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Seal one public document using APEX PSI. It will appear here automatically. No fee.
                No application. No permission.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs uppercase tracking-[0.2em]">
                <Link to="/seal" className="text-gold hover:underline">
                  How to seal your first document →
                </Link>
                <Link to="/" className="text-muted-foreground hover:text-gold">
                  Home →
                </Link>
                <Link to="/disclaimers" className="text-muted-foreground hover:text-gold">
                  Disclaimers →
                </Link>
              </div>
            </section>

            <div className="mt-8 space-y-2 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                This list is updated daily. Last refreshed: {today}
              </p>
              <p className="text-sm italic text-foreground/80">“We do not judge. We document.”</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                No scores. No ratings. No compliance levels. No removal — once verifying, recorded
                permanently. No payment, ever. Not certified, approved or endorsed — only
                &ldquo;verifying since&rdquo;.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Registry;
