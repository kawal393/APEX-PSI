import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export type HomeView = "what" | "why" | "explore" | "seal";

const VIEWS: HomeView[] = ["what", "why", "explore", "seal"];

const viewFromHash = (): HomeView => {
  const value = window.location.hash.replace("#", "") as HomeView;
  return VIEWS.includes(value) ? value : "what";
};

export default function HomeViewSwitcher({
  active,
  onChange,
}: {
  active: HomeView;
  onChange: (view: HomeView) => void;
}) {
  const { t } = useTranslation();
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setHasScrolled(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const select = (view: HomeView) => {
    window.history.replaceState(null, "", `#${view}`);
    onChange(view);
    if (hasScrolled) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="sticky top-14 z-40 border-b border-gold/20 bg-background/95 backdrop-blur-xl md:top-16">
      <div
        className="mx-auto flex max-w-7xl overflow-x-auto scrollbar-hide px-2 sm:px-4"
        role="tablist"
        aria-label={t("homeViews.label")}
      >
        {VIEWS.map((view, index) => (
          <Button
            key={view}
            type="button"
            role="tab"
            aria-selected={active === view}
            variant="ghost"
            onClick={() => select(view)}
            className={`h-14 min-w-[9.25rem] flex-1 shrink-0 rounded-none border-b-2 px-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em] sm:min-w-0 sm:text-xs ${
              active === view
                ? "border-gold bg-gold/5 text-gold"
                : "border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground"
            }`}
          >
            <span className="text-gold/60">0{index + 1}</span>
            {t(`homeViews.${view}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}

export { viewFromHash };