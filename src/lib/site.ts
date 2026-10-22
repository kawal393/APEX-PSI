// Single source of truth for APEX PSI hostnames.
// SITE_URL is the canonical domain used in metadata, receipts and share links.

export const SITE_URL = "https://www.ai-governance-standard.com";
export const SECURITY_CONTACT = "security@apex-infrastructure.com";
export const CONTACT_EMAIL = "business@apex-infrastructure.com";

export const IETF_DRAFTS = [
  "draft-singh-psi", // datatracker name; rev 02 filed 13 Oct 2026
  "draft-singh-psi-http", // rev 00 uploaded 13 Oct 2026
  "draft-singh-apex-psi-04", // rev 01 filed 13 Oct 2026
] as const;
