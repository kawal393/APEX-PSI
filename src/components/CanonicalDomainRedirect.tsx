import { useEffect } from "react";
import { SITE_URL } from "@/lib/site";

const CANONICAL_HOST = new URL(SITE_URL).hostname;

/**
 * An installed web app is permanently scoped to the origin it was installed
 * from. Move launches from superseded deployment hosts to the canonical site
 * so users cannot remain on an obsolete origin indefinitely.
 */
const CanonicalDomainRedirect = () => {
  useEffect(() => {
    const host = window.location.hostname;
    if (!host.endsWith(".apex-infrastructure.com")) return;

    const destination = new URL(window.location.href);
    destination.protocol = "https:";
    destination.hostname = CANONICAL_HOST;
    destination.port = "";
    window.location.replace(destination.toString());
  }, []);

  return null;
};

export default CanonicalDomainRedirect;