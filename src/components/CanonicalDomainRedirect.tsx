import { useEffect } from "react";
import { LEGACY_URL, SITE_URL } from "@/lib/site";

const LEGACY_HOST = new URL(LEGACY_URL).hostname;
const CANONICAL_HOST = new URL(SITE_URL).hostname;

/**
 * An installed web app is permanently scoped to the origin it was installed
 * from. Move legacy-origin launches to the canonical site so users cannot
 * remain on an obsolete deployment indefinitely.
 */
const CanonicalDomainRedirect = () => {
  useEffect(() => {
    if (window.location.hostname !== LEGACY_HOST) return;

    const destination = new URL(window.location.href);
    destination.protocol = "https:";
    destination.hostname = CANONICAL_HOST;
    destination.port = "";
    window.location.replace(destination.toString());
  }, []);

  return null;
};

export default CanonicalDomainRedirect;