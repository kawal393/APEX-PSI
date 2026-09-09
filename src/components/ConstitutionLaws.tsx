import { PSI_LAWS, APEX_DISAPPEARS_TEST } from "@/data/psiConstitution";

/** THE PSI CONSTITUTION — five immutable laws. Rendered on every major page. */
const ConstitutionLaws = ({ compact = false }: { compact?: boolean }) => (
  <section id="constitution" className="px-4 py-20 border-y border-border/60">
    <div className="container mx-auto max-w-6xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold mb-4">
        The PSI Constitution
      </p>
      <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-foreground">
        Five laws. Not features.
      </h2>
      <p className="mt-4 max-w-3xl text-sm md:text-base text-muted-foreground leading-relaxed">
        These constrain every future version of the protocol and every commercial decision made
        around it. They are not negotiable.
      </p>

      <ol className="mt-12 grid gap-4 md:grid-cols-2">
        {PSI_LAWS.map((law) => (
          <li
            key={law.numeral}
            className="rounded-lg border border-border bg-card/40 p-6 md:p-7"
          >
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-3xl font-bold text-gold">{law.numeral}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                Law {law.numeral} — {law.name}
              </span>
            </div>
            <p className="mt-4 text-base md:text-lg font-semibold leading-snug text-foreground">
              {law.rule}
            </p>
            {!compact && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{law.body}</p>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-10 max-w-3xl font-mono text-xs leading-relaxed text-muted-foreground">
        {APEX_DISAPPEARS_TEST}
      </p>
    </div>
  </section>
);

export default ConstitutionLaws;
