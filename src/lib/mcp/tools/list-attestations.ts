import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_attestations",
  title: "List recent attestations",
  description:
    "List the most recent APEX PSI ledger attestations visible to the signed-in user, newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10).describe("How many attestations to return."),
    predicate_id: z
      .string()
      .trim()
      .optional()
      .describe("Optional predicate filter, e.g. EU_ART_50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, predicate_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("gallows_public_ledger")
      .select("commit_id,action,predicate_id,status,phase,commit_hash,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (predicate_id) query = query.eq("predicate_id", predicate_id);

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { count: data?.length ?? 0, attestations: data ?? [] },
    };
  },
});
