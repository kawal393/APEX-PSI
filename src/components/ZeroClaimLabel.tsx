import { Link } from "react-router-dom";

export type ZeroClaimState = "verified" | "absent" | "altered";

const COPY: Record<ZeroClaimState, { mark: string; text: string; cls: string }> = {
  verified: {
    mark: "✓",
    text: "Integrity verified. Content not validated. Verify source independently.",
    cls: "border-compliant/30 bg-compliant/5 text-compliant",
  },
  absent: {
    mark: "⚪",
    text: "No sealed record found. Verify the source directly.",
    cls: "border-border bg-muted/20 text-muted-foreground",
  },
  altered: {
    mark: "⚠️",
    text: "Record differs from sealed original. Source may have changed.",
    cls: "border-warning/40 bg-warning/5 text-warning",
  },
};

/**
 * ZERO-CLAIM LABEL — printed beside every seal, badge and verification result.
 * A seal proves existence and integrity at a point in time. Nothing more.
 */
const ZeroClaimLabel = ({
  state = "verified",
  className = "",
}: {
  state?: ZeroClaimState;
  className?: string;
}) => {
  const c = COPY[state];
  return (
    <div
      className={`rounded-md border px-3 py-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.12em] leading-relaxed ${c.cls} ${className}`}
    >
      <span aria-hidden className="mr-1.5">{c.mark}</span>
      {c.text}{" "}
      <Link to="/disclaimers" className="underline underline-offset-2 hover:opacity-80">
        Disclaimers
      </Link>
    </div>
  );
};

export default ZeroClaimLabel;
