import StatusBadge from "@/components/StatusBadge";

const CATEGORIES = [
  {
    name: "Signature forgery",
    detail: "Produce a seal that the reference verifier accepts without the private key.",
  },
  {
    name: "Verification bypass",
    detail: "Alter a sealed record while the seal still verifies as valid.",
  },
  {
    name: "Chain-of-custody break",
    detail: "Alter the Merkle structure or sequence without detection.",
  },
  {
    name: "Cryptographic flaw",
    detail: "Demonstrate a practical weakness in the selected parameters or their composition.",
  },
  {
    name: "Implementation bug",
    detail: "A logical flaw in the reference verifier that changes a verification outcome.",
  },
];

const PROCESS = [
  "Read the published specification and verifier source. Everything needed is public.",
  "Identify a flaw — mathematical, cryptographic or logical. Reproducible only.",
  "Submit privately by email with the steps to reproduce.",
  "An independent reviewer with no commercial interest assesses the submission.",
  "If confirmed, the reward is paid, the finder is credited by name if they wish, and the issue is patched.",
  "Every confirmed finding and its correction is published in the public corrections register.",
];

/** The Red Team — scope, categories, process, and the public record of failures. */
const RedTeamScope = () => (
  <section id="red-team" className="px-4 py-20 border-t border-border/60">
    <div className="container mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold">
          The PSI Red Team
        </p>
        <StatusBadge status="PRODUCTION" />
      </div>
      <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight">
        Truth is not declared. It is tested.
      </h2>
      <p className="mt-5 max-w-3xl text-sm md:text-base text-muted-foreground leading-relaxed">
        No claim of perfection is made here. A reproducible mathematical or implementation break is
        rewarded, published and corrected. Five categories are in scope, each carrying a reward of
        US$5,000, under a total published commitment of US$10,000 held by ROCKYFILMS888 PTY LTD.
        Rewards are paid from that commitment in the order findings are confirmed.
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((c) => (
          <div key={c.name} className="rounded-lg border border-border bg-card/40 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-gold">{c.name}</p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.detail}</p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/80">
              US$5,000 — from the US$10,000 commitment
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-5">
          How a finding is handled
        </p>
        <ol className="space-y-3">
          {PROCESS.map((step, i) => (
            <li key={step} className="flex gap-4 border-b border-border/40 pb-3">
              <span className="font-mono text-xs text-gold">0{i + 1}</span>
              <span className="text-sm text-muted-foreground leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <a
          href="mailto:apexinfrastructure369@gmail.com?subject=PSI%20Red%20Team%20submission"
          className="border border-gold/50 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-gold hover:bg-gold/10 transition-colors"
        >
          Submit a finding
        </a>
        <a
          href="/corrections"
          className="border border-border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] hover:border-gold/40 transition-colors"
        >
          Public corrections register
        </a>
      </div>

      <p className="mt-8 max-w-3xl font-serif text-lg text-foreground/90">
        A protocol that publishes its own failures and corrections is the only kind worth trusting.
      </p>
      <p className="mt-3 max-w-3xl font-mono text-[10px] leading-relaxed text-muted-foreground">
        Out of scope: denial of service, social engineering, findings against third-party
        infrastructure, and non-reproducible or purely theoretical assertions. No non-disclosure
        agreement is required to submit.
      </p>
    </div>
  </section>
);

export default RedTeamScope;
