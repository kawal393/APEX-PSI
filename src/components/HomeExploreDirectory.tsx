import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const GROUPS = [
  {
    title: "verify",
    links: [
      ["verifyReceipt", "/verify"], ["explorer", "/explorer"], ["liveLedger", "/live"],
      ["registry", "/registry"], ["evidenceConsole", "/console"], ["publicWitness", "/witness"],
    ],
  },
  {
    title: "build",
    links: [
      ["api", "/api"], ["sdk", "/sdk"], ["mcp", "/mcp"], ["integrations", "/integrations"],
      ["agentReceipts", "/agent"], ["mediaProvenance", "/media"],
    ],
  },
  {
    title: "standard",
    links: [
      ["protocol", "/protocol"], ["specifications", "/specs"], ["architecture", "/architecture"],
      ["conformance", "/conformance"], ["verticals", "/verticals"], ["research", "/research"],
    ],
  },
  {
    title: "operate",
    links: [
      ["plans", "/products"], ["operateAtScale", "/operate"], ["partners", "/partners"],
      ["foundation", "/foundation"], ["governance", "/governance"], ["contact", "#contact"],
    ],
  },
] as const;

export default function HomeExploreDirectory() {
  const { t } = useTranslation();

  return (
    <section className="border-b border-border px-4 py-16 md:py-24" aria-labelledby="explore-heading">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">{t("homeExplore.eyebrow")}</p>
        <h1 id="explore-heading" className="mt-3 font-serif text-4xl font-bold md:text-6xl">
          {t("homeExplore.title")}
        </h1>
        <p className="mt-5 max-w-3xl text-base text-muted-foreground md:text-lg">{t("homeExplore.intro")}</p>

        <div className="mt-12 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map((group, groupIndex) => (
            <div key={group.title} className="bg-background p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
                0{groupIndex + 1} · {t(`homeExplore.groups.${group.title}`)}
              </p>
              <nav className="mt-5 flex flex-col" aria-label={t(`homeExplore.groups.${group.title}`)}>
                {group.links.map(([label, href]) => (
                  <Link
                    key={href}
                    to={href}
                    className="border-t border-border/70 py-3 text-sm text-foreground transition-colors first:border-t-0 hover:text-gold"
                  >
                    {t(`homeExplore.links.${label}`)} <span aria-hidden="true" className="float-right text-gold">→</span>
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}