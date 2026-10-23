// APEX PSI publishes TWO MCP servers, and until 23 Oct our own pages described them as one.
// That merge is how "6 tools" ended up printed next to an install command that delivers five,
// and how a third-party directory came to advertise six tools, one version number and
// "0 write, 0 network" for a server whose write half is the product.
//
//   local  — npm package `apex-psi-mcp`. stdio, runs on the user's machine, no account,
//            no key. Five tools: seal, verify, anchor, cite, verify_chain.
//   hosted — the connector the Lovable/Supabase edge runs from src/lib/mcp, at
//            https://<project>.supabase.co/functions/v1/mcp. streamable-http, OAuth-protected:
//            an anonymous caller gets HTTP 401 with
//            `WWW-Authenticate: Bearer realm="mcp", resource_metadata="…/.well-known/oauth-protected-resource"`,
//            and that metadata document resolves. A 401 with a challenge is the MCP spec's
//            correct handshake — it is a door that asks for a key, not a bricked doorway.
//            Six tools: seal, verify_hash, anchor_status, list_attestations, ledger_stats,
//            protocol_info (five read-only, `seal` writes).
//
// The names here are measured, not remembered. scripts/tool-name-check.mjs compares `local`
// against the package's public evidence file (public/.well-known/mcp/local-tools.json, written
// by empire/build-mcp-cards.mjs from a real tools/list call) and `hosted` against
// .lovable/mcp/manifest.json, which the MCP SDK generates from src/lib/mcp/tools/*.ts.
// Add a tool on either side and the guard goes red until this module says so, because an agent
// that trusts these pages calls these exact names.

export interface McpTool {
  name: string;
  desc: string;
  write?: boolean;
}

export const LOCAL_TOOLS: McpTool[] = [
  {
    name: "seal",
    desc: "Record content in the APEX PSI append-only ledger and return a receipt: SHA-256, an Ed25519 signature over the Merkle leaf, and post-quantum ML-DSA-65 (the receipt's own algorithm field states which). Proves this content existed at that timestamp and has not changed since — never that its contents are true.",
    write: true,
  },
  {
    name: "verify",
    desc: "Check a receipt or a raw SHA-256 hash against the ledger and report whether it is present and anchored. This is an online integrity lookup, not proof that the original statement is true.",
  },
  {
    name: "anchor",
    desc: "Read the Bitcoin (OpenTimestamps) anchoring history for the ledger's Merkle roots — transaction id, block height, confirmations, how many entries each anchor covers. Defaults to read-only; a batch write only happens if you name it.",
  },
  {
    name: "cite",
    desc: "Turn one receipt into a citation — BibTeX, Markdown or plain text — whose URL points at that single ledger record, so a reader can re-check it without asking us.",
  },
  {
    name: "verify_chain",
    desc: "Walk a set of receipts and report whether the chain is intact, naming any record that fails to re-check. A tampered receipt breaks the chain here rather than passing silently.",
  },
];

export const HOSTED_TOOLS: McpTool[] = [
  {
    name: "seal",
    desc: "Mint a receipt for a machine action or decision and record it in the ledger, scoped to the signed-in account. This is the write half, and it is the one hosted tool that is not read-only.",
    write: true,
  },
  {
    name: "verify_hash",
    desc: "Look a SHA-256 hash up in the evidence ledger and report whether a matching attestation exists.",
  },
  {
    name: "anchor_status",
    desc: "Report the OpenTimestamps / Bitcoin anchoring state of a sealed receipt: block height, transaction id, and the offline `ots verify` command.",
  },
  {
    name: "list_attestations",
    desc: "List the ledger attestations visible to the signed-in user, newest first.",
  },
  {
    name: "ledger_stats",
    desc: "Counts of ledger attestations, non-approved exceptions and public attestations — an integrity snapshot, not a score.",
  },
  {
    name: "protocol_info",
    desc: "The protocol reference: canonicalization, hashing, signature suites, IETF drafts, HTTP header and anchoring targets.",
  },
];

export const LOCAL_COMMAND = "npx -y apex-psi-mcp";
export const HOSTED_PATH = "/functions/v1/mcp";

export const LOCAL_COUNT = LOCAL_TOOLS.length;
export const HOSTED_COUNT = HOSTED_TOOLS.length;

// One sentence, used wherever a page has to say what an agent gets, so the sentence cannot
// disagree with the list above.
export const SURFACE_SENTENCE =
  `Two doors, one ledger: the npm package (stdio, ${LOCAL_COUNT} tools, no account) and the ` +
  `hosted connector (streamable-http, ${HOSTED_COUNT} tools, OAuth sign-in).`;
