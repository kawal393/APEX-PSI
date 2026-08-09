import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "verify_hash",
  title: "Verify a hash against the APEX PSI ledger",
  description:
    "Look up a SHA-256 hash (commit hash or Merkle leaf hash) in the APEX PSI evidence ledger and report whether a matching attestation exists.",
  inputSchema: {
    hash: z
      .string()
      .trim()
      .regex(/^[0-9a-fA-F]{64}$/, "Expected a 64-character hex SHA-256 hash")
      .describe("SHA-256 hash to verify, lowercase hex."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ hash }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const needle = hash.toLowerCase();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("gallows_ledger")
      .select(
        "commit_id,commit_hash,merkle_leaf_hash,merkle_root,predicate_id,status,phase,pq_algorithm,sequence_number,created_at",
      )
      .or(`commit_hash.eq.${needle},merkle_leaf_hash.eq.${needle}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      return {
        content: [{ type: "text", text: `No attestation found for ${needle}.` }],
        structuredContent: { found: false, hash: needle },
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { found: true, hash: needle, attestation: data },
    };
  },
});
