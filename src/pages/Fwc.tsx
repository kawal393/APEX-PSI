import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const GO_LIVE = Date.parse("2026-10-20T00:00:00+11:00");

const REQUIREMENTS = [
  {
    rule: "1 · Disclose AI use",
    text: "Parties must explicitly state if generative AI was used in preparing documentation, and how.",
    seal: "The PSI seal carries an AI-assistance declaration — used / not used, tool, and timestamp — signed and embedded in the document itself. Disclosure travels with the file, not beside it.",
  },
  {
    rule: "2 · Verify facts & citations",
    text: "Every factual claim, precedent and quote must be checked and exist; legal representatives must hyperlink every case cited.",
    seal: "Each cited source is hashed and timestamped into a sealed citation registry, hyperlinks included. The receipt proves WHAT was verified and WHEN — before filing, not after.",
  },
  {
    rule: "3 · True witness statements",
    text: "Declarations must be the person's own words, personal knowledge, and true.",
    seal: "A signer-bound declaration seal binds identity to content at a recorded time. It cannot be backdated, and any later alteration breaks verification — mathematically, visibly.",
  },
];

const Fwc = () => {
  const days = Math.max(0, Math.ceil((GO_LIVE - Date.now()) / 86400000));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28 pb-24 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.35em] text-gold/70 mb-2">
            Australia · Fair Work Commission
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-black mb-3 text-gold-gradient">
            The Commission said VERIFY. Here is the proof.
          </h1>
          <p className="text-sm text-foreground/70 leading-relaxed mb-4">
            The FWC&apos;s GenAI Guidance Note applies from{" "}
            <span className="text-gold font-bold">20 October 2026</span>. From that
            date, anyone using AI to prepare tribunal documentation must disclose
            it, verify every fact and citation, and stand behind their witness
            statements. The rules say what must be proven. The protocol below is
            how it can be proven.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-4 py-1.5 mb-10">
            <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
            <span className="text-xs font-bold tracking-widest text-gold">
              {days} DAYS UNTIL GO-LIVE
            </span>
          </div>

          <div className="space-y-4 mb-10">
            {REQUIREMENTS.map((r) => (
              <div key={r.rule} className="rounded-xl border border-border bg-card/40 p-5">
                <h2 className="text-sm font-black uppercase tracking-widest text-gold mb-2">
                  {r.rule}
                </h2>
                <p className="text-xs text-foreground/60 mb-3">{r.text}</p>
                <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-foreground/50 mb-1">
                    How a sealed record demonstrates it
                  </p>
                  <p className="text-xs text-foreground/80">{r.seal}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-gold/30 bg-gold/5 p-5 mb-10">
            <p className="text-[10px] uppercase tracking-widest text-gold mb-2">The fence</p>
            <p className="text-xs text-foreground/70 leading-relaxed">
              A seal certifies that a document existed, was verified at a stated
              time, and has not been altered since. It does not certify that the
              document&apos;s claims are true, and it does not discharge a
              party&apos;s own responsibility under the Guidance Note. The
              Commission decides. APEX PSI is an independent technical service and
              is not endorsed by the Fair Work Commission.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/pramaan"
              className="rounded-lg border border-gold/40 bg-gold/5 px-4 py-2 text-xs font-bold text-gold hover:bg-gold/10 transition-colors"
            >
              Seal a document
            </Link>
            <Link
              to="/verify"
              className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:border-gold/40 transition-colors"
            >
              Verify a digest
            </Link>
            <a
              href="https://www.fwc.gov.au/about-us/news-and-media/news/use-ai-commission-cases"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:border-gold/40 transition-colors"
            >
              Read the Guidance Note (fwc.gov.au)
            </a>
          </div>

          <p className="text-[11px] text-foreground/40 mt-8">
            Sources: FWC news release, 2026 · HCAMag · Gadens · The Australian.
            Requirements summarised for convenience; the Guidance Note itself is
            the only authority.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Fwc;
