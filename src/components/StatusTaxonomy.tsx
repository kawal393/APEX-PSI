import StatusBadge from "@/components/StatusBadge";
import {
  PSI_STATUS_MEANING,
  APEX_DISAPPEARS_TEST,
  BELIEF_LINE,
  type PsiStatus,
} from "@/data/psiConstitution";

const ORDER: PsiStatus[] = [
  "PRODUCTION",
  "REFERENCE",
  "EXPERIMENTAL",
  "PROPOSED",
  "PLANNED",
];

const FAQ = [
  {
    q: "Is PSI a blockchain?",
    a: "No. Proofs are anchored into Bitcoin through OpenTimestamps. PSI is not a chain, has no token and mines nothing.",
  },
  {
    q: "Who owns PSI?",
    a: "The specification is published under MIT and belongs to the commons. APEX stewards the reference implementation; it does not own the protocol.",
  },
  {
    q: "Can APEX change the rules?",
    a: "Not the five constitutional laws. New cryptographic suites may be added; existing proofs may never be invalidated.",
  },
  {
    q: "Can I be locked out?",
    a: "No. Run your own node, or verify offline with the MIT verifier. No key, account or approval is involved.",
  },
  {
    q: "Is this an IETF standard?",
    a: "No. draft-singh-psi is an IETF Internet-Draft — an individual submission. It is not an approved standard and is not endorsed by the IETF.",
  },
];

/** Status taxonomy, forkability statement and the honest FAQ. */
const StatusTaxonomy = () => (
  <section id="status" className="px-4 py-20 border-t border-border/60">
    <div className="container mx-auto max-w-6xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold mb-4">
        Transparency standard
      </p>
      <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight">
        Every capability carries its status.
      </h2>
      <p className="mt-4 max-w-3xl text-sm md:text-base text-muted-foreground">
        Honesty about maturity is more useful than a claim of completeness.
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ORDER.map((s) => (
          <div key={s} className="rounded-lg border border-border bg-card/40 p-5">
            <StatusBadge status={s} />
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {PSI_STATUS_MEANING[s]}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-lg border border-gold/40 bg-gold/[0.05] p-6 md:p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
          Forkability statement
        </p>
        <p className="mt-4 text-lg md:text-xl font-semibold leading-snug text-foreground">
          If APEX disappears tomorrow, your proofs still verify.
        </p>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          The specification, verifier source, schemas, test vectors, genesis parameters, historical
          Merkle roots, public keys and OpenTimestamps proofs are published together for exactly
          this reason. {APEX_DISAPPEARS_TEST}
        </p>
      </div>

      <div className="mt-14">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-6">
          Direct answers
        </p>
        <dl className="divide-y divide-border/50 border-y border-border/50">
          {FAQ.map((item) => (
            <div key={item.q} className="grid gap-2 py-5 md:grid-cols-[300px_1fr] md:gap-8">
              <dt className="text-sm font-semibold text-foreground">{item.q}</dt>
              <dd className="text-sm text-muted-foreground leading-relaxed">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-12 font-serif text-xl md:text-2xl text-foreground/90">{BELIEF_LINE}</p>
    </div>
  </section>
);

export default StatusTaxonomy;
