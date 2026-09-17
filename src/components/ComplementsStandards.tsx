import { PSI_COMPLEMENTS, COMPLEMENT_LINE } from "@/data/psiConstitution";

/** How PSI relates to existing frameworks — complement, never displace. */
const ComplementsStandards = () => (
  <section id="complements" className="px-4 py-20">
    <div className="container mx-auto max-w-6xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold mb-4">
        Alongside, not against
      </p>
      <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight">
        The evidence layer beneath the frameworks.
      </h2>
      <p className="mt-4 max-w-3xl text-sm md:text-base text-muted-foreground">{COMPLEMENT_LINE}</p>

      <div className="mt-10 divide-y divide-border/50 border-y border-border/50">
        {PSI_COMPLEMENTS.map((row) => (
          <div key={row.standard} className="grid gap-2 py-5 md:grid-cols-[260px_1fr] md:gap-8">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-gold">{row.standard}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{row.relationship}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ComplementsStandards;
