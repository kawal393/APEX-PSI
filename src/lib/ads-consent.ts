// Google Ads measurement with regional consent.
// Visitors in the EEA, UK, Switzerland and Canada (Quebec cannot be resolved
// from country alone) must accept before the Google tag loads or any
// conversion is sent. Everywhere else ordinary measurement runs unless the
// visitor has refused it in Cookie settings.

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GOOGLE_ADS_ID = "AW-18202243492";
export const FREE_API_KEY_SEND_TO = "AW-18202243492/iUgOCJvvvqYdEKTjwOdD";

export const STORAGE_KEY = "cookie_consent";
export const RECORD_KEY = "cookie_consent_record";
/** Bump when the banner wording, data, purposes or recipients change. */
export const NOTICE_VERSION = "2026-10-23-v1";
export const OPEN_SETTINGS_EVENT = "apex:open-cookie-settings";
export const CONSENT_CHANGED_EVENT = "apex:consent-changed";

const CONSENT_COUNTRIES = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO","GB","CH","CA"];
let consentRegion: Promise<boolean> | undefined;

export function isConsentRequiredRegion(): Promise<boolean> {
  return (consentRegion ??= lookupConsentRegion());
}

async function lookupConsentRegion(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("/cdn-cgi/trace", { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) return true;
    const country = (await res.text()).match(/^loc=([A-Z0-9]{2})$/m)?.[1];
    if (!country || country === "XX" || country === "T1") return true;
    return CONSENT_COUNTRIES.includes(country);
  } catch {
    return true;
  }
}

export type ConsentChoice = "granted" | "denied";

export function readChoice(): ConsentChoice | null {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "granted" || v === "denied" ? v : null;
}

export async function hasAdConsent(): Promise<boolean> {
  return readChoice() === "granted";
}

export async function canTrackAds(): Promise<boolean> {
  const choice = readChoice();
  if (choice !== null) return choice === "granted";
  const required = await isConsentRequiredRegion();
  const latest = readChoice();
  return latest !== null ? latest === "granted" : !required;
}

export function updateConsent(decision: ConsentChoice) {
  if (decision === "denied") window.gtag?.("set", "user_data", null);
  window.gtag?.("consent", "update", {
    ad_storage: decision,
    ad_user_data: decision,
    ad_personalization: decision,
  });
}

interface ConsentEvidence {
  choice: ConsentChoice;
  at: string;
  notice_version: string;
  purposes: string[];
  recipients: string[];
}

/** Persist the visitor's choice plus evidence of what they were shown. Earlier records are kept. */
export function saveChoice(decision: ConsentChoice) {
  let history: ConsentEvidence[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(RECORD_KEY) || "[]");
    if (Array.isArray(parsed)) history = parsed;
  } catch {
    history = [];
  }
  history.push({
    choice: decision,
    at: new Date().toISOString(),
    notice_version: NOTICE_VERSION,
    purposes: ["advertising measurement (Google Ads conversions)"],
    recipients: ["Google Ads"],
  });
  localStorage.setItem(RECORD_KEY, JSON.stringify(history.slice(-20)));
  localStorage.setItem(STORAGE_KEY, decision);
  updateConsent(decision);
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: decision }));
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

/** Loads the Google tag only when advertising measurement is allowed for this visitor. */
export async function loadGoogleAds(): Promise<boolean> {
  const allowed = await canTrackAds();
  if (!allowed) return false;
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
  updateConsent("granted");
  if (document.querySelector("script[data-google-ads]")) return true;
  window.gtag("set", "developer_id.dZjgwMW", true);
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_ID);
  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  script.async = true;
  script.dataset.googleAds = "";
  document.head.appendChild(script);
  return true;
}

/** Report a successfully created free API key to Google Ads, if this visitor allows it. */
export async function reportFreeApiKeyConversion() {
  try {
    if (!(await loadGoogleAds())) return;
    if (!(await canTrackAds())) return;
    window.gtag?.("event", "conversion", { send_to: FREE_API_KEY_SEND_TO });
  } catch {
    /* measurement must never break key creation */
  }
}
