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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[90vw] max-w-md rounded-2xl border border-primary/30 bg-card shadow-2xl shadow-primary/10 p-8 text-center"
          >
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-5">
              <Shield className="h-7 w-7 text-primary" />
            </div>

            <h2 className="text-xl font-bold text-foreground mb-2">
              Wait — Is Your AI Compliant?
            </h2>
            <p className="text-sm text-muted-foreground mb-1">
              The EU AI Act deadline is <span className="text-primary font-semibold">August 2, 2026</span>.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Fines up to <span className="text-destructive font-semibold">€35M or 7% of global revenue</span>.
              Get your free compliance score in 2 minutes.
            </p>

            <button
              onClick={handleCTA}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold py-3 px-6 hover:brightness-110 active:scale-[0.98] transition-all text-sm"
            >
              Free Compliance Assessment
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={dismiss}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              No thanks, I'm already compliant
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
