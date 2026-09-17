import { PSI_STATUS_MEANING, type PsiStatus } from "@/data/psiConstitution";

const STYLES: Record<PsiStatus, string> = {
  PRODUCTION: "border-emerald-500/50 text-emerald-400 bg-emerald-500/[0.07]",
  REFERENCE: "border-sky-500/50 text-sky-400 bg-sky-500/[0.07]",
  EXPERIMENTAL: "border-amber-500/50 text-amber-400 bg-amber-500/[0.07]",
  PROPOSED: "border-orange-500/50 text-orange-400 bg-orange-500/[0.07]",
  PLANNED: "border-border text-muted-foreground bg-muted/20",
};

interface Props {
  status: PsiStatus;
  className?: string;
}

/** Every capability on this site carries one of five honest status labels. */
const StatusBadge = ({ status, className = "" }: Props) => (
  <span
    title={PSI_STATUS_MEANING[status]}
    className={`inline-block shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${STYLES[status]} ${className}`}
  >
    {status}
  </span>
);

export default StatusBadge;
