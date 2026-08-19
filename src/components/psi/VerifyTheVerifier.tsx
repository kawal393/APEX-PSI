import { ExternalLink, ShieldCheck } from "lucide-react";

export const VERIFIER_REPO = "https://github.com/kawal393/apex-psi-verify";
export const SPEC_REPO = "https://github.com/kawal393/psi-seal-spec";

/** Standing invitation to break the verifier. Shown on /verify and /hello-psi. */
const VerifyTheVerifier = () => (
  <div className="rounded-lg border border-gold/40 bg-gold/[0.06] px-5 py-4">
    <div className="flex items-start gap-3">
      <ShieldCheck className="h-5 w-5 text-gold shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold mb-1.5">
          Verify the Verifier
        </p>
        <p className="text-sm text-foreground/90 leading-relaxed">
          This verifier is MIT. Audit every line. Report a divergence and you are credited in
          SECURITY.md and merged into the record. The math must survive its maker.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-xs font-mono">
          <a
            href={VERIFIER_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline inline-flex items-center gap-1"
          >
            apex-psi-verify <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={SPEC_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline inline-flex items-center gap-1"
          >
            psi-seal-spec <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  </div>
);

export default VerifyTheVerifier;
