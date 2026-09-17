import { Link } from "react-router-dom";
import {
  ECONOMIC_LINE,
  POSITIONING_LINE,
  NO_CONTROL_LINE,
  COMMERCE_STATE_LINE,
  PSI_COMMONS,
  PSI_OPERATIONS,
} from "@/data/psiConstitution";

/** The commons and the operational layer, stated without ambiguity. */
const EconomicDivide = () => (
  <section id="economics" className="px-4 py-20 border-y border-border/60">
    <div className="container mx-auto max-w-6xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold mb-4">
        The divide
      </p>
      <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight">{ECONOMIC_LINE}</h2>
      <p className="mt-4 max-w-3xl text-sm md:text-base text-muted-foreground leading-relaxed">
        {POSITIONING_LINE}
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-400">
            The commons — free forever
          </p>
          <ul className="mt-5 space-y-3">
            {PSI_COMMONS.map((row) => (
              <li key={row.what} className="flex items-start justify-between gap-4 border-b border-border/40 pb-3">
                <span className="text-sm text-foreground">{row.what}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground whitespace-nowrap">
                  {row.who}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-muted-foreground leading-relaxed">
            No hidden fees. No limited-trial framing. What is free today stays free.
          </p>
          <Link
            to="/hello-psi"
            className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-400 underline underline-offset-4"
          >
            Verify something now →
          </Link>
        </div>

        <div className="rounded-lg border border-gold/40 bg-gold/[0.05] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
            The operational layer — built by APEX
          </p>
          <ul className="mt-5 space-y-3">
            {PSI_OPERATIONS.map((row) => (
              <li key={row.what} className="flex items-start justify-between gap-4 border-b border-border/40 pb-3">
                <span className="text-sm text-foreground">{row.what}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground whitespace-nowrap">
                  {row.who}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-muted-foreground leading-relaxed">
            {COMMERCE_STATE_LINE}
          </p>
          <Link
            to="/operate"
            className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-gold underline underline-offset-4"
          >
            Operating at scale →
          </Link>
        </div>
      </div>

      <p className="mt-8 max-w-4xl font-mono text-xs leading-relaxed text-muted-foreground">
        {NO_CONTROL_LINE}
      </p>
    </div>
  </section>
);

export default EconomicDivide;
