// Single source of truth for APEX PSI hostnames.
// SITE_URL is the canonical domain used in metadata, receipts and share links.

export const SITE_URL = "https://ai-governance-standard.com";
export const SECURITY_CONTACT = "security@apex-infrastructure.com";
export const CONTACT_EMAIL = "contact@ai-governance-standard.com";

export const IETF_DRAFTS = [
  "draft-singh-psi", // datatracker name; rev 01 filed 29 Aug 2026
  "draft-singh-psi-http", // in preparation, NOT filed yet
  "draft-singh-apex-psi-04",
] as const;
