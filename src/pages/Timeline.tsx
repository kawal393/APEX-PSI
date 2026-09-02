import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Link2, Scale, CircleDashed } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// THE TIMELINE
// History has no timestamp. These do.
//
// Every row below resolves to a third-party-checkable artefact: a
// public receipt on the ledger, a filing on the IETF datatracker, or a
// live counter fetched at runtime. A row that cannot be checked does
// not belong on this page - so no row here is a story.
//
// Doctrine: no frozen numbers (the live row prints none on purpose),
// no company names, no outcomes claimed. The seal certifies words and
// time, never the claims inside them.
// ═══════════════════════════════════════════════════════════════════

type Row = {
  date: string;
  title: string;
  fact: string;
  proof: { href: string; label: string; external?: boolean };
};

const ROWS: Row[] = [
  {
    date: "22 AUG 2026",
    title: "Ledger genesis",
    fact: "The public ledger opens at 2026-08-22T10:43:09Z. Every counter on this site reads from it; nobody here can edit it, including us.",
    proof: { href: "/impact", label: "read the live counters" },
  },
  {
    date: "24 AUG 2026",
    title: "First sample sealed and sent",
    fact: "A rare-earths producer's public disclosure is recomputed, sealed live, and the sample email fires the same morning - the empire's first sale motion, proof first.",
    proof: { href: "/r/APEX-NTR-0C4763D473FD7D93", label: "open the receipt" },
  },
  {
    date: "25 AUG 2026",
    title: "The Referee opens",
    fact: "/verify-any goes live: a cross-standard seal reader that favours no format - including our own.",
    proof: { href: "/verify-any", label: "use the referee" },
  },
  {
    date: "25 AUG 2026",
    title: "Universal ledger genesis",
    fact: "One hundred public-domain documents sealed in a single ceremony. First receipt of the hundred is linked here; the ledger does not judge, it remembers.",
    proof: { href: "/r/APEX-NTR-784443D7D595A9E8", label: "open receipt 001" },
  },
  {
    date: "29 AUG 2026",
    title: "IETF filing",
    fact: "draft-singh-psi revision 01 filed at 21:55 UTC. The protocol enters the standards record as an individual submission, category informational.",
    proof: {
      href: "https://datatracker.ietf.org/doc/draft-singh-psi/",
      label: "read the filing",
      external: true,
    },
  },
  {
    date: "29 AUG 2026",
    title: "Genesis Zero sealed",
    fact: "The Reference Implementation v1.0 declaration is sealed: document SHA-256 f91ba473ee1e88b349d3a4dee18a27d9d8adbc3e1ef1e32aadcd94960a7b7b9b.",
    proof: { href: "/r/APEX-NTR-C29D90C714C99F96", label: "open the receipt" },
  },
  {
    date: "30 AUG 2026",
    title: "The standing challenge",
    fact: "US$10,000 for a mathematical break reproducible from the published bytes and confirmed by two independent pipelines. Never paid for silence - only for proof.",
    proof: { href: "/challenge", label: "read the terms" },
  },
  {
    date: "30 AUG 2026",
    title: "Case 001, row 1 sealed",
    fact: "The creator submits his own evidence to his own protocol: a written acknowledgment, sealed as public record before any dispute needed it.",
    proof: { href: "/r/APEX-NTR-20E2092FA5304F81", label: "open the receipt" },
  },
  {
    date: "2 SEP 2026",
    title: "The Wall and the first-timestamp challenge",
    fact: "The Living Impact Wall opens, and the challenge is printed in full: genesis date, live figures, and an open invitation to produce an earlier public timestamp.",
    proof: { href: "/impact#challenge", label: "read the challenge" },
  },
  {
    date: "LIVE",
    title: "The counters move",
    fact: "No number is printed on this row on purpose. The ledger's counters change while you read this sentence - read them live, never off a page that could go stale.",
    proof: { href: "/impact", label: "read them live" },
  },
];

export default function Timeline() {
  return (
    <>
      <Helmet>
        <title>The Timeline - Apex PSI - history has no timestamp, these do</title>
        <meta
          name="description"
          content="Every public claim Apex PSI has made about its own history, as a dated row that resolves to a third-party-checkable artefact: a public receipt, an IETF filing, or a live ledger counter. A row that cannot be checked is not printed."
        />
        <link rel="canonical" href="https://ai-governance-standard.com/timeline" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-4xl px-4 py-16">
          {/* ── Header ── */}
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
              <Clock className="h-3 w-3 mr-1" /> Dated - anchored - checkable
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              <span className="text-gold-gradient">History has no timestamp.</span>{" "}
              <span className="text-chrome-gradient">These do.</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every row below resolves to a third-party-checkable artefact: a public
              receipt on the ledger, a filing on the IETF datatracker, or a live counter.
              A row that cannot be checked does not belong on this page - so no row here
              is a story.
            </p>
          </div>

          {/* ── The standing invitation ── */}
          <Card className="p-6 mb-12 border-primary/40 bg-primary/5 text-center">
            <p className="text-sm leading-relaxed text-foreground/90 max-w-2xl mx-auto">
              If you hold an earlier public timestamp for any row below - or for the
              protocol itself - the referee reads your seal too. It needs no key, no
              login, and no permission from us.
            </p>
            <Button asChild variant="hero" className="mt-5">
              <a href="/verify-any">
                <Scale className="h-4 w-4 mr-2" /> Bring an earlier timestamp
              </a>
            </Button>
            <p className="mt-4 text-[11px] text-muted-foreground">
              We do not ask you to believe we were first. We ask you to check the dates.
            </p>
          </Card>

          {/* ── The rows ── */}
          <div className="relative pl-6 md:pl-8 space-y-8 mb-12">
            <span
              aria-hidden="true"
              className="absolute left-[7px] md:left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-gold via-primary/40 to-transparent"
            />
            {ROWS.map((r) => (
              <div key={r.date + r.title} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-6 md:-left-8 top-2 h-[15px] w-[15px] md:h-[19px] md:w-[19px] rounded-full border-2 border-gold bg-background"
                />
                <Card className="p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold mb-1">
                    {r.date}
                  </p>
                  <h2 className="text-base font-bold tracking-tight">{r.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {r.fact}
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <a
                      href={r.proof.href}
                      {...(r.proof.external ? { target: "_blank", rel: "noreferrer" } : {})}
                    >
                      <Link2 className="h-3.5 w-3.5 mr-1" /> {r.proof.label}
                    </a>
                  </Button>
                </Card>
              </div>
            ))}

            {/* ── The empty row ── */}
            <div className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-6 md:-left-8 top-2 h-[15px] w-[15px] md:h-[19px] md:w-[19px] rounded-full border-2 border-dashed border-muted-foreground/50 bg-background"
              />
              <Card className="p-5 border-dashed">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1 flex items-center gap-2">
                  <CircleDashed className="h-3 w-3" /> The next row
                </p>
                <h2 className="text-base font-bold tracking-tight text-muted-foreground">
                  Empty.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  It fills when the next artefact is sealed. The ledger writes it; we do
                  not. Until then, this gap is also a record.
                </p>
              </Card>
            </div>
          </div>

          {/* ── Honesty strip ── */}
          <Card className="p-5 border-warning/40 bg-warning/5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-warning mb-2">
              What a proof link certifies - and what it never does
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Each link above opens the artefact itself: the receipt, the filing, the
              live counter. A seal certifies <strong className="text-foreground">words</strong>{" "}
              and <strong className="text-foreground">time</strong> - that a statement
              existed, exactly like this, at this moment. It does not certify the claims
              inside it, and it never certifies a market number. Dates on this page are
              the dates of the artefacts, not of our memory of them.
            </p>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  );
}
