import { useState, useEffect } from "react";
import { X, ChevronRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TOUR_KEY = "apex_onboarding_done";

const STEPS = [
  {
    title: "Welcome to APEX Dashboard",
    description: "This is your AI compliance command center. Let's take a quick tour of the key features.",
    icon: "🏠",
  },
  {
    title: "Compliance Questionnaire",
    description: "Start by completing the compliance questionnaire. It takes about 5 minutes and generates your initial compliance score.",
    icon: "📋",
  },
  {
    title: "TRIO Verification Modes",
    description: "Choose between SHIELD (monitoring), SWORD (active probes), or JUDGE (full audit) modes for different compliance needs.",
    icon: "🛡️",
  },
  {
    title: "Run Verifications",
    description: "Click 'Run TRIO Verification' to execute compliance checks against EU AI Act articles. Each run updates your score and generates Merkle proofs.",
    icon: "⚡",
  },
  {
    title: "Share & Refer",
    description: "Use your referral code to invite others and earn rewards. Your compliance record can be shared publicly.",
    icon: "🎁",
  },
];

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      // Delay slightly so dashboard renders first
      const timer = setTimeout(() => setActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setActive(false);
    localStorage.setItem(TOUR_KEY, "true");
  };

  return (
    <AnimatePresence>
      {active && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-background/60 backdrop-blur-sm"
            onClick={handleDismiss}
          />
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[91] w-[90vw] max-w-lg rounded-2xl border border-primary/20 bg-card shadow-2xl p-6"
          >
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{STEPS[step].icon}</span>
              <div>
                <p className="text-xs text-primary font-semibold">Step {step + 1} of {STEPS.length}</p>
                <h3 className="text-lg font-bold text-foreground">{STEPS[step].title}</h3>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {STEPS[step].description}
            </p>

            {/* Progress dots */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleDismiss}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
                >
                  Skip tour
                </button>
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground font-medium py-2 px-4 text-sm hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  {step < STEPS.length - 1 ? "Next" : "Get Started"}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
