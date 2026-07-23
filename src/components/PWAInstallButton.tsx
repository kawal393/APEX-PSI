import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const PWAInstallButton = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    const inStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as any).standalone === true;
    setInstalled(inStandalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    if (isIOS) {
      setShowIOSHint((v) => !v);
    }
  };

  // Only render if we have a real prompt OR we're on iOS (where install is manual)
  if (!deferred && !isIOS) return null;

  return (
    <div className="relative inline-flex flex-col items-center">
      <Button
        variant="heroOutline"
        size="sm"
        onClick={handleClick}
        className="border-gold/40 text-gold hover:bg-gold/10"
      >
        {isIOS ? <Smartphone className="mr-1 h-3.5 w-3.5" /> : <Download className="mr-1 h-3.5 w-3.5" />}
        Install App
      </Button>
      {showIOSHint && isIOS && (
        <div className="absolute top-full mt-2 w-64 text-[10px] font-mono uppercase tracking-wider text-gold border border-gold/30 bg-background/95 backdrop-blur rounded-md p-3 shadow-lg z-20">
          Tap <span className="font-black">Share</span> → <span className="font-black">Add to Home Screen</span>
        </div>
      )}
    </div>
  );
};

export default PWAInstallButton;
