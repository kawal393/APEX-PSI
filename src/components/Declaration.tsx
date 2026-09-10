import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export const DECLARATION_TEXT =
  "Apex PSI — Universal Verification Layer. Proposed open standard under active development. Verification free forever (MIT). IETF drafts are individual submissions, not formally endorsed. Verify everything yourself.";

/** THE DECLARATION — the plain statement of what this layer is. */
const Declaration = () => (
  <section id="declaration" className="relative py-24 px-4 border-y border-border/60">
    <div className="container mx-auto max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <p className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.35em] text-gold mb-8">
          The Declaration
        </p>
        <p className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tight text-foreground">
          {DECLARATION_TEXT}
        </p>
      </motion.div>

      {/* The dual doctrine, stated plainly. */}
      <div className="grid md:grid-cols-2 gap-4 mt-14">
        <div className="rounded-lg border border-border bg-card/40 p-6">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-chrome-gradient mb-3">Verify</p>
          <h3 className="text-xl font-black tracking-tight mb-2">
            Free forever, MIT, no permission required
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Deterministic recomputation of any seal, by anyone, anywhere, offline. Open, neutral,
            auditable line by line.
          </p>
          <Link to="/hello-psi" className="inline-block mt-4 text-xs font-mono text-gold hover:underline">
            Prove it in 60 seconds →
          </Link>
        </div>
        <div className="rounded-lg border border-gold/40 bg-gold/[0.05] p-6">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-3">Operate</p>
          <h3 className="text-xl font-black tracking-tight mb-2">
            Free to create. Paid to operate at scale.
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Basic proof creation is free forever and needs no account. Managed issuance at
            institutional volume, redundancy, priority anchoring and retention are operated by APEX
            under agreement.
          </p>
          <Link to="/operate" className="inline-block mt-4 text-xs font-mono text-gold hover:underline">
            Operating at scale →
          </Link>
        </div>
      </div>

      <p className="mt-6 text-sm text-center text-foreground/80 font-semibold">
        Nobody needs APEX to verify anything. That is the point of Law III.
      </p>
    </div>
  </section>
);

export default Declaration;
