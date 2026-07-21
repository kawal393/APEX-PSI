import { useState, useEffect } from "react";
import { X, Zap } from "lucide-react";

const STORAGE_KEY = "apex_traffic_banner_dismissed";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const TrafficNoticeBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const ts = parseInt(dismissed, 10);
      if (Date.now() - ts < DISMISS_DURATION_MS) return;
    }
    setVisible(false);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="relative z-[60] bg-card border-b border-gold/20">
      <div className="container mx-auto max-w-6xl px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-sm min-w-0">
          <Zap className="h-4 w-4 text-gold shrink-0 animate-pulse-gold" />
          <p className="text-muted-foreground">
            <span className="text-gold font-semibold">High demand</span>
            {" — "}
            Due to unprecedented traffic, some features may experience brief delays. Our engineering team is actively scaling infrastructure.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
          aria-label="Dismiss notice"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default TrafficNoticeBanner;
