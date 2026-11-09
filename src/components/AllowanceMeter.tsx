import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export type AllowanceInfo = {
  tier: string;
  used_today: number;
  daily_limit: number | null;
  remaining_today: number | null;
  upgrade_url?: string;
};

/**
 * Live hosted-allowance meter shown after a hosted receipt is issued.
 * Renders only what the seal service actually returned; nothing is estimated.
 */
export default function AllowanceMeter({ allowance }: { allowance: AllowanceInfo | null | undefined }) {
  const { t } = useTranslation();
  if (!allowance || allowance.daily_limit === null) return null;
  const pct = Math.min(100, Math.round((allowance.used_today / allowance.daily_limit) * 100));
  const isFree = allowance.tier === "free";
  return (
    <div className="mt-5 border border-gold/30 bg-background/40 p-3" aria-label={t("allowance.label")}>
      <div className="flex items-baseline justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>{isFree ? t("allowance.free") : t("allowance.plan", { tier: allowance.tier })}</span>
        <span className="text-foreground">
          {t("allowance.usedOf", { used: allowance.used_today, limit: allowance.daily_limit })}
        </span>
      </div>
      <div className="mt-2 h-1 bg-muted">
        <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
      {isFree && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {t("allowance.nudge")}{" "}
          <Link to="/upgrade" className="text-gold underline underline-offset-4 hover:text-foreground">
            {t("allowance.cta")}
          </Link>
        </p>
      )}
    </div>
  );
}
