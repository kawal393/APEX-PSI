import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HOSTED_TIERS } from "@/lib/commerce";

/**
 * Front-page production hook: the free allowance is stated first, then the
 * self-serve paid door. Prices and capacities come from the one commerce source.
 */
export default function ApiKeyHook() {
  const { t } = useTranslation();
  const pro = HOSTED_TIERS.find((tier) => tier.id === "pro");
  const ultra = HOSTED_TIERS.find((tier) => tier.id === "ultra");
  return (
    <div className="mx-auto mt-8 max-w-3xl border border-gold/40 bg-card/40 px-5 py-5 text-left sm:px-6">
      <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-gold sm:text-[10px]">{t("apiKeyHook.eyebrow")}</p>
      <pre className="mt-3 overflow-x-auto border border-border bg-background/60 p-3 font-mono text-[10px] leading-relaxed text-foreground/90 sm:text-[11px]">
{`curl -X POST https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/notarize \\
  -H "Content-Type: application/json" \\
  -H "x-apex-api-key: apex_ntry_…" \\
  -d '{"decision":"hello world"}'`}
      </pre>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {t("apiKeyHook.body", {
            proPrice: pro?.price ?? "",
            proCap: "2,000",
            ultraPrice: ultra?.price ?? "",
            ultraCap: "20,000",
          })}
        </p>
        <Link
          to="/upgrade"
          className="shrink-0 border border-gold bg-gold px-5 py-3 text-center font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-background transition-colors hover:bg-transparent hover:text-gold"
        >
          {t("apiKeyHook.cta")}
        </Link>
      </div>
      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{t("apiKeyHook.free")}</p>
    </div>
  );
}
