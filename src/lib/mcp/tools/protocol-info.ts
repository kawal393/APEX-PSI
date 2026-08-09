import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const SPEC = {
  protocol: "APEX PSI — Proof of Stateful Integrity",
  canonical_site: "https://ai-governance-standard.com",
  canonicalization: "RFC 8785 (JSON Canonicalization Scheme)",
  hashing: "SHA-256",
  signatures: ["Ed25519", "ML-DSA-65 (hybrid)", "LMS-W4-SHA256 (NIST SP 800-208)"],
  drafts: ["draft-singh-psi-00", "draft-singh-psi-http-01"],
  http_header: "Compliance-Receipt",
  anchoring: ["Bitcoin (OpenTimestamps)", "Polygon Merkle roots"],
  trust_anchor: "https://ai-governance-standard.com/.well-known/apex-psi-trust-anchor.json",
  scope: "Anchors existence and integrity of a record at a point in time — not the truth of its contents.",
} as const;

export default defineTool({
  name: "protocol_info",
  title: "APEX PSI protocol reference",
  description:
    "Return the APEX PSI protocol reference: canonicalization, hashing, signature suites, IETF drafts, HTTP header and anchoring targets.",
  inputSchema: {
    section: z
      .enum(["all", "signatures", "drafts", "anchoring"])
      .default("all")
      .describe("Which part of the reference to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ section }) => {
    const payload =
      section && section !== "all" ? { [section]: SPEC[section] } : SPEC;
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
