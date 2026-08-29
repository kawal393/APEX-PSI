import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CLAUSES = [
  { n: "1", title: "SEAL", body: "the decision carries a cryptographic seal." },
  { n: "2", title: "OPEN", body: "anyone may recompute it, free, forever." },
  { n: "3", title: "BEND OR BREAK", body: "if the math fails, the correction is public and the finder is credited." },
];

const MelbourneTestPlaque = () => {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16 overflow-hidden bg-background">
      <article className="relative z-10 w-full max-w-3xl border border-gold/30 bg-card/30 p-8 md:p-14 text-center">
        <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-gold mb-6">
          Issued 30 August 2026, Melbourne
        </p>

        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight text-foreground mb-10">
          THE MELBOURNE TEST
        </h1>

        <dl className="space-y-0 text-left">
          {CLAUSES.map((c, i) => (
            <div key={c.n}>
              {i > 0 && <div className="h-px w-full bg-gold/20 my-6" />}
              <div className="flex items-start gap-4 md:gap-6">
                <dt className="shrink-0 font-mono text-xs sm:text-sm uppercase tracking-[0.2em] text-gold w-8">
                  {c.n}
                </dt>
                <dd className="font-serif text-lg md:text-xl text-foreground/90 leading-snug">
                  <span className="font-mono text-gold text-sm uppercase tracking-[0.15em] mr-2">
                    {c.title}
                  </span>
                  <span className="text-foreground/80">{c.body}</span>
                </dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="h-px w-full bg-gold/20 my-8" />

        <p className="font-serif text-lg md:text-xl text-foreground/90 leading-relaxed">
          <span className="text-gold font-semibold">US$10,000</span> to the first party that produces a mathematical break.{" "}
          <span className="text-muted-foreground">Rules published.</span>
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            variant="heroOutline"
            size="lg"
            className="w-full sm:w-auto px-8 font-mono text-xs uppercase tracking-[0.2em] border-gold/40 hover:border-gold hover:bg-gold/5"
            asChild
          >
            <Link to="/declaration">Read the Declaration</Link>
          </Button>
          <Button
            variant="heroOutline"
            size="lg"
            className="w-full sm:w-auto px-8 font-mono text-xs uppercase tracking-[0.2em] border-gold/40 hover:border-gold hover:bg-gold/5"
            asChild
          >
            <Link to="/challenge">Take the $10,000 Challenge</Link>
          </Button>
        </div>
      </article>
    </section>
  );
};

export default MelbourneTestPlaque;
