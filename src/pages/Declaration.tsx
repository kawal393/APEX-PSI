import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CLAUSES = [
  {
    n: "1",
    title: "SEAL",
    body: "the decision carries a cryptographic seal.",
  },
  {
    n: "2",
    title: "OPEN",
    body: "anyone may recompute it, free, forever.",
  },
  {
    n: "3",
    title: "BEND OR BREAK",
    body: "if the math fails, the correction is public and the finder is credited.",
  },
];

const DeclarationPage = () => (
  <>
    <Helmet>
      <title>The Recomputation Declaration | APEX PSI</title>
      <meta
        name="description"
        content="The Recomputation Declaration. Issued 30 August 2026, Melbourne. Seal, open, bend or break — one public test for any organisation using AI to decide about a human being."
      />
      <link rel="canonical" href="https://ai-governance-standard.com/declaration" />
    </Helmet>
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 py-24">
        <article className="border border-border/40 rounded-lg p-8 md:p-16 text-center">
          <h1 className="font-serif text-3xl md:text-5xl font-bold leading-tight">
            THE RECOMPUTATION DECLARATION
          </h1>
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.3em] text-gold">
            Issued 30 August 2026, Melbourne
          </p>

          <div className="mx-auto my-12 h-px w-24 bg-border" />

          <p className="font-serif text-lg md:text-xl leading-relaxed text-foreground/90">
            From this day, any organisation on Earth that uses AI to make a decision about a human
            being is invited to pass one test.
          </p>

          <dl className="mt-12 space-y-8 text-left">
            {CLAUSES.map((c) => (
              <div key={c.n} className="border-t border-border/40 pt-6">
                <dt className="font-mono text-xs uppercase tracking-[0.25em] text-gold">
                  {c.n} — {c.title}
                </dt>
                <dd className="mt-3 font-serif text-lg text-foreground/90">{c.body}</dd>
              </div>
            ))}
          </dl>

          <div className="mx-auto my-12 h-px w-24 bg-border" />

          <p className="font-serif text-lg md:text-xl leading-relaxed text-foreground/90">
            No auditor's opinion. No badge of trust. Only math that survives its own public
            execution.
          </p>
          <p className="mt-8 font-serif text-lg md:text-xl leading-relaxed text-foreground/90">
            The first record sealed under this declaration is a worker's own: CASE 001. The first to
            submit was the builder.
          </p>

          <p className="mt-12 font-mono text-sm uppercase tracking-[0.2em] text-gold">
            The data is free. The math is public. The seal is Pramaan.
          </p>
        </article>

        <p className="mt-12 font-mono text-xs text-muted-foreground text-center leading-relaxed">
          This record certifies existence, timestamp and integrity — not the truth of any claim. The
          ledger does not judge. It remembers.
        </p>
      </main>
      <Footer />
    </div>
  </>
);

export default DeclarationPage;
