// Single source of truth for APEX PSI hostnames.
// SITE_URL is the canonical domain used in metadata, receipts and share links.
// LEGACY_URL is the previous deployment host, kept only for redirect notices.

export const SITE_URL = "https://ai-governance-standard.com";
export const LEGACY_URL = "https://digital-gallows.apex-infrastructure.com";
export const SECURITY_CONTACT = "security@apex-infrastructure.com";
export const CONTACT_EMAIL = "contact@ai-governance-standard.com";

export const IETF_DRAFTS = [
  "draft-singh-psi-00",
  "draft-singh-psi-http-01",
  "draft-singh-apex-psi-04",
] as const;
