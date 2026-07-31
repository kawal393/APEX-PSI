/**
 * Campaign attribution.
 * Captures UTM parameters on the first page of a session and keeps them
 * available for every later page view and lead submission.
 */

const ATTR_KEY = "apex_attribution";

export interface Attribution {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  landing_page: string | null;
}

const EMPTY: Attribution = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
  landing_page: null,
};

const clean = (v: string | null): string | null => {
  if (!v) return null;
  const s = v.trim().slice(0, 120);
  return s.length ? s : null;
};

/** Infer a source when the visitor arrived without UTM tags. */
function inferFromReferrer(): { utm_source: string | null; utm_medium: string | null } {
  try {
    if (!document.referrer) return { utm_source: "direct", utm_medium: "none" };
    const host = new URL(document.referrer).hostname.replace(/^www\./, "");
    if (host === window.location.hostname) return { utm_source: null, utm_medium: null };
    const searchEngines = ["google.", "bing.", "duckduckgo.", "ecosia.", "yahoo.", "brave."];
    const medium = searchEngines.some((s) => host.includes(s)) ? "organic" : "referral";
    return { utm_source: host, utm_medium: medium };
  } catch {
    return { utm_source: "direct", utm_medium: "none" };
  }
}

/**
 * Returns the attribution for the current session, capturing it from the URL
 * on first call and persisting it for the rest of the session.
 */
export function getAttribution(): Attribution {
  if (typeof window === "undefined") return EMPTY;

  const params = new URLSearchParams(window.location.search);
  const fromUrl: Attribution = {
    utm_source: clean(params.get("utm_source")),
    utm_medium: clean(params.get("utm_medium")),
    utm_campaign: clean(params.get("utm_campaign")),
    utm_content: clean(params.get("utm_content")),
    utm_term: clean(params.get("utm_term")),
    landing_page: window.location.pathname,
  };

  let stored: Attribution | null = null;
  try {
    const raw = sessionStorage.getItem(ATTR_KEY);
    if (raw) stored = JSON.parse(raw) as Attribution;
  } catch {
    stored = null;
  }

  // A fresh UTM in the URL always wins — it means a new campaign click.
  if (fromUrl.utm_source || fromUrl.utm_campaign || fromUrl.utm_medium) {
    try {
      sessionStorage.setItem(ATTR_KEY, JSON.stringify(fromUrl));
    } catch { /* storage unavailable */ }
    return fromUrl;
  }

  if (stored) return { ...EMPTY, ...stored };

  const inferred = inferFromReferrer();
  const first: Attribution = {
    ...EMPTY,
    ...inferred,
    landing_page: window.location.pathname,
  };
  try {
    sessionStorage.setItem(ATTR_KEY, JSON.stringify(first));
  } catch { /* storage unavailable */ }
  return first;
}

/** Build a campaign-tagged URL for use in ads, emails and posts. */
export function buildTrackedUrl(
  base: string,
  utm: { source: string; medium: string; campaign: string; content?: string }
): string {
  const url = new URL(base);
  url.searchParams.set("utm_source", utm.source);
  url.searchParams.set("utm_medium", utm.medium);
  url.searchParams.set("utm_campaign", utm.campaign);
  if (utm.content) url.searchParams.set("utm_content", utm.content);
  return url.toString();
}
