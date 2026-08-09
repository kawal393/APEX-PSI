import { auth, defineMcp } from "@lovable.dev/mcp-js";
import verifyHashTool from "./tools/verify-hash";
import listAttestationsTool from "./tools/list-attestations";
import ledgerStatsTool from "./tools/ledger-stats";
import protocolInfoTool from "./tools/protocol-info";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "apex-psi",
  title: "APEX PSI",
  version: "0.1.0",
  instructions:
    "Tools for APEX PSI, the cryptographic open-standard evidence protocol for AI governance. Use `verify_hash` to check a SHA-256 hash against the evidence ledger, `list_attestations` to browse recent attestations, `ledger_stats` for an integrity snapshot, and `protocol_info` for the protocol reference (canonicalization, signature suites, IETF drafts, anchoring).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [verifyHashTool, listAttestationsTool, ledgerStatsTool, protocolInfoTool],
});
