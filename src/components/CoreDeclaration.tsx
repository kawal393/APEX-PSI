import { Link } from "react-router-dom";

export const CORE_DECLARATION_PLAIN =
  "We do not validate content. We validate timestamp and existence. Verify the source yourself. Math doesn't lie — but neither does it judge.";

/** THE CORE DECLARATION — first thing anyone reads. */
const CoreDeclaration = () => (
  <section className="px-4 pt-20 pb-6" aria-label="Core declaration">
    <div className="container mx-auto max-w-4xl text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold mb-4">
        Apex PSI — Universal Verification Layer
      </p>
      <p className="text-lg sm:text-2xl md:text-3xl font-black uppercase leading-tight tracking-tight text-foreground">
        We do not validate content. We validate timestamp and existence.{" "}
        <Link
          to="/hello-psi"
          className="underline decoration-gold/70 decoration-2 underline-offset-4 hover:text-gold transition-colors"
        >
          Verify the source yourself
        </Link>
        . Math doesn&apos;t lie — but neither does it judge.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <Link to="/registry" className="hover:text-gold">Public registry</Link>
        <span className="text-border">·</span>
        <Link to="/disclaimers" className="hover:text-gold">Important disclaimers</Link>
        <span className="text-border">·</span>
        <Link to="/hello-psi" className="hover:text-gold">Recompute a receipt yourself</Link>
      </div>
    </div>
  </section>
);

export default CoreDeclaration;
