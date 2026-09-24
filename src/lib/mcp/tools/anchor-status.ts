import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "anchor_status",
  title: "Bitcoin anchoring status of a sealed receipt",
  description:
    "Report the OpenTimestamps / Bitcoin anchoring state for a sealed receipt: whether its Merkle root has been committed to a real Bitcoin block, the block height, the transaction id and the offline `ots verify` command. Anchoring runs automatically; this reads its result — it does not trigger it.",
  inputSchema: {
    commit_id: z
      .string()
      .trim()
      .describe("Receipt id returned by `seal`, e.g. APEX-NTR-...."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ commit_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const needle = commit_id.trim();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("ots_proofs")
      .select(
        "commit_id,target_hash,status,calendar_url,bitcoin_block_height,bitcoin_txid,confirmations,created_at",
      )
      .eq("commit_id", needle)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: `No Bitcoin anchor record found for ${needle}. It may still be queued for the next anchoring pass.`,
          },
        ],
        structuredContent: { found: false, commit_id: needle },
      };
    }
    const anchored = data.status === "confirmed" && !!data.bitcoin_txid;
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: {
        found: true,
        commit_id: needle,
        anchored,
        status: data.status,
        explorer_url: data.bitcoin_txid ? `https://mempool.space/tx/${data.bitcoin_txid}` : null,
        anchor: data,
      },
    };
  },
});
