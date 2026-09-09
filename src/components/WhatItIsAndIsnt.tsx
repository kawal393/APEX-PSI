import { WHAT_IT_IS, WHAT_IT_ISNT, PSI_THREE_QUESTIONS, PSI_PRIMITIVE } from "@/data/psiConstitution";

/** What PSI is, what it is not, and the primitive underneath it. */
const WhatItIsAndIsnt = () => (
  <section id="what-it-is" className="px-4 py-20">
    <div className="container mx-auto max-w-6xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold mb-4">
        The primitive
      </p>
      <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight">
        State. Transition. Proof. Verification.
      </h2>

      <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PSI_PRIMITIVE.map((step, i) => (
          <li key={step} className="rounded-lg border border-border bg-card/40 p-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
              0{i + 1}
            </span>
            <p className="mt-3 text-sm text-foreground leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>

      <div className="mt-12 rounded-lg border border-border/60 bg-card/20 p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Three questions, answered forever, for anyone
        </p>
        <ol className="mt-4 space-y-2">
          {PSI_THREE_QUESTIONS.map((q, i) => (
            <li key={q} className="text-base md:text-lg font-semibold text-foreground">
              <span className="text-gold font-mono text-sm mr-2">{i + 1}.</span>
              {q}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card/40 p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-400">
            What it is
          </p>
          <ul className="mt-4 space-y-3">
            {WHAT_IT_IS.map((line) => (
              <li key={line} className="text-sm text-muted-foreground leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-card/40 p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber-400">
            What it is not
          </p>
          <ul className="mt-4 space-y-3">
            {WHAT_IT_ISNT.map((line) => (
              <li key={line} className="text-sm text-muted-foreground leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
);

export default WhatItIsAndIsnt;
