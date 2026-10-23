import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  CONSENT_CHANGED_EVENT,
  OPEN_SETTINGS_EVENT,
  STORAGE_KEY,
  isConsentRequiredRegion,
  loadGoogleAds,
  readChoice,
  saveChoice,
  updateConsent,
} from "@/lib/ads-consent";

/**
 * Regional cookie banner. Shown automatically only to visitors in regions that
 * require consent and who have not chosen yet; anyone can reopen it from
 * "Cookie settings" in the footer. Also loads the Google tag when allowed.
 */
const CookieConsent = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(readChoice());

  useEffect(() => {
    let cancelled = false;
    void loadGoogleAds();
    if (readChoice() === null) {
      isConsentRequiredRegion().then((required) => {
        if (!cancelled && required && readChoice() === null) setOpen(true);
      });
    }

    const onOpen = () => {
      setCurrent(readChoice());
      setOpen(true);
    };
    const onChanged = () => {
      setCurrent(readChoice());
      void loadGoogleAds();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const choice = readChoice();
      setCurrent(choice);
      if (choice) updateConsent(choice);
      void loadGoogleAds();
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    window.addEventListener(CONSENT_CHANGED_EVENT, onChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
      window.removeEventListener(CONSENT_CHANGED_EVENT, onChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!open) return null;

  const choose = (decision: "granted" | "denied") => {
    saveChoice(decision);
    setCurrent(decision);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-body"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-md border border-primary/40 bg-card/95 p-5 shadow-xl backdrop-blur sm:right-auto print:hidden"
    >
      <p id="cookie-consent-title" className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
        {t("cookies.title", "Cookie settings")}
      </p>
      <p id="cookie-consent-body" className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {t(
          "cookies.body",
          "With your permission we use Google Ads cookies to measure whether visitors who arrive from our ads go on to create a free API key. No other advertising cookies are used. You can change your choice any time under Cookie settings in the footer.",
        )}{" "}
        <Link to="/cookies" className="text-primary underline underline-offset-2">
          {t("cookies.policy", "Cookie Policy")}
        </Link>
        {" · "}
        <a
          href="https://business.safety.google/privacy/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {t("cookies.google", "How Google uses data")}
        </a>
      </p>
      {current && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {current === "granted"
            ? t("cookies.currentGranted", "Current choice: accepted")
            : t("cookies.currentDenied", "Current choice: rejected")}
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="heroOutline" onClick={() => choose("denied")}>
          {t("cookies.reject", "Reject")}
        </Button>
        <Button variant="heroOutline" onClick={() => choose("granted")}>
          {t("cookies.accept", "Accept")}
        </Button>
      </div>
    </div>
  );
};

export default CookieConsent;
