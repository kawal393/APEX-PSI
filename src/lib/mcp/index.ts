import { auth, defineMcp } from "@lovable.dev/mcp-js";
import sealTool from "./tools/seal";
import verifyHashTool from "./tools/verify-hash";
import anchorStatusTool from "./tools/anchor-status";
import listAttestationsTool from "./tools/list-attestations";
import ledgerStatsTool from "./tools/ledger-stats";
import protocolInfoTool from "./tools/protocol-info";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "apex-psi",
  title: "APEX PSI",
  version: "0.2.0",
  instructions:
    "Tools for APEX PSI, the cryptographic open-standard evidence protocol for AI governance. Use `seal` to mint a post-quantum receipt for an action (the write half of the trust handshake), `verify_hash` to re-check a SHA-256 hash against the evidence ledger, `anchor_status` to read whether a receipt's Merkle root is committed to Bitcoin, `list_attestations` to browse recent attestations, `ledger_stats` for an integrity snapshot, and `protocol_info` for the protocol reference (canonicalization, signature suites, IETF drafts, anchoring).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [sealTool, verifyHashTool, anchorStatusTool, listAttestationsTool, ledgerStatsTool, protocolInfoTool],
});
