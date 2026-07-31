import { useExitIntent } from "@/hooks/use-exit-intent";
import { X, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LeadCaptureOffer from "@/components/LeadCaptureOffer";

export default function ExitIntentPopup() {
  const { showPopup, dismiss } = useExitIntent();


  return (
    <AnimatePresence>
      {showPopup && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm"
            onClick={dismiss}
          />
          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[92vw] max-w-lg rounded-2xl border border-primary/30 bg-card shadow-2xl shadow-primary/10 p-7 text-left"
          >
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>

            <h2 className="text-lg font-bold text-foreground mb-1">
              Before you go — take the Article 50 pack
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              The EU AI Act transparency obligations apply from{" "}
              <span className="text-primary font-semibold">August 2, 2026</span>. This is the
              spec, the clause mapping and a sealed sample receipt you can verify yourself.
            </p>

            <LeadCaptureOffer intent="exit_intent" variant="inline" subtitle="" onDone={dismiss} />

            <button
              onClick={dismiss}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              No thanks
            </button>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
